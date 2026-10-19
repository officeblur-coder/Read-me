import "server-only";
import { sql } from "drizzle-orm";
import { withTenant, type Tx } from "../db";
import { can } from "@/lib/permissions";
import type { AuthContext } from "../auth/core";

type Ctx = Pick<AuthContext, "dealerId" | "userId" | "role">;

// Cost total, exprimat în SQL identic cu lib/finance.totalCost (null dacă lipsește prețul de achiziție).
const totalCostSql = (a = "") =>
  sql.raw(
    `(${a}purchase_price + coalesce(${a}transport_cost,0) + coalesce(${a}repair_cost,0) + coalesce(${a}preparation_cost,0) + coalesce(${a}other_costs,0))`,
  );
const TOTAL_COST = totalCostSql();
const IN_STOCK = sql.raw(`status in ('preparation','available','reserved')`);

async function rows<T>(tx: Tx, query: ReturnType<typeof sql>) {
  const res = await tx.execute(query);
  return res.rows as T[];
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;

export async function getDashboard(ctx: Ctx, now = new Date()) {
  const financials = can(ctx.role, "dashboard.financials");
  const d = ctx.dealerId;

  return withTenant(ctx, async (tx) => {
    const statusRows = await rows<{ status: string; n: number }>(
      tx,
      sql`select status, count(*)::int as n from vehicles where dealer_id = ${d} group by status`,
    );
    const counts = { preparation: 0, available: 0, reserved: 0, sold: 0, withdrawn: 0 };
    for (const r of statusRows) if (r.status in counts) counts[r.status as keyof typeof counts] = r.n;
    const inStock = counts.preparation + counts.available + counts.reserved;

    const [stock] = await rows<{
      cost: string | null;
      list_value: string | null;
      est_profit: string | null;
      missing_cost: number;
      missing_price: number;
    }>(
      tx,
      sql`select
            sum(${TOTAL_COST})::bigint as cost,
            sum(list_price)::bigint as list_value,
            sum(list_price - ${TOTAL_COST})::bigint as est_profit,
            count(*) filter (where purchase_price is null)::int as missing_cost,
            count(*) filter (where list_price is null)::int as missing_price
          from vehicles where dealer_id = ${d} and ${IN_STOCK}`,
    );

    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));

    const monthly = await rows<{
      month: string;
      sold: number;
      revenue: string | null;
      profit: string | null;
      avg_days: string | null;
    }>(
      tx,
      sql`with months as (
            select to_char(generate_series(${rangeStart.toISOString()}::timestamptz at time zone 'UTC',
                                           ${monthStart.toISOString()}::timestamptz at time zone 'UTC',
                                           interval '1 month'), 'YYYY-MM') as month
          )
          select m.month,
                 count(v.id)::int as sold,
                 sum(v.sale_price)::bigint as revenue,
                 sum(v.sale_price - ${totalCostSql("v.")})::bigint as profit,
                 round(avg(v.sold_at::date - v.acquired_at), 1) as avg_days
          from months m
          left join vehicles v on v.dealer_id = ${d} and v.status = 'sold'
                and to_char(v.sold_at at time zone 'UTC', 'YYYY-MM') = m.month
          group by m.month order by m.month`,
    );

    const byMake = await rows<{ make: string; n: number }>(
      tx,
      sql`select make, count(*)::int as n from vehicles
          where dealer_id = ${d} and status = 'sold' and sold_at >= ${rangeStart.toISOString()}
          group by make order by n desc, make limit 8`,
    );

    const agents = await rows<{ name: string; n: number; revenue: string | null }>(
      tx,
      sql`select coalesce(u.full_name, 'Necunoscut') as name, count(*)::int as n, sum(v.sale_price)::bigint as revenue
          from vehicles v left join users u on u.id = v.sold_by_user_id
          where v.dealer_id = ${d} and v.status = 'sold' and v.sold_at >= ${rangeStart.toISOString()}
          group by u.full_name order by n desc limit 8`,
    );

    const [aging] = await rows<{ d0: number; d30: number; d60: number; d90: number }>(
      tx,
      sql`select
            count(*) filter (where current_date - acquired_at <= 30)::int as d0,
            count(*) filter (where current_date - acquired_at between 31 and 60)::int as d30,
            count(*) filter (where current_date - acquired_at between 61 and 90)::int as d60,
            count(*) filter (where current_date - acquired_at > 90)::int as d90
          from vehicles where dealer_id = ${d} and ${IN_STOCK}`,
    );

    const oldest = await rows<{
      id: string;
      stock_number: number;
      make: string;
      model: string;
      year: number;
      status: string;
      list_price: string | null;
      days: number;
    }>(
      tx,
      sql`select id, stock_number, make, model, year, status, list_price, (current_date - acquired_at)::int as days
          from vehicles where dealer_id = ${d} and ${IN_STOCK} and current_date - acquired_at > 30
          order by acquired_at asc limit 6`,
    );

    const recent = await rows<{
      id: string;
      stock_number: number;
      make: string;
      model: string;
      year: number;
      status: string;
      list_price: string | null;
      mileage_km: number | null;
      created_at: Date;
      photo_id: string | null;
    }>(
      tx,
      sql`select v.id, v.stock_number, v.make, v.model, v.year, v.status, v.list_price, v.mileage_km, v.created_at,
                 (select m.id from vehicle_media m where m.vehicle_id = v.id order by m.is_primary desc, m.position limit 1) as photo_id
          from vehicles v where v.dealer_id = ${d} order by v.created_at desc limit 5`,
    );

    const [overall] = await rows<{ avg_days: string | null }>(
      tx,
      sql`select round(avg(sold_at::date - acquired_at), 1) as avg_days from vehicles
          where dealer_id = ${d} and status = 'sold' and sold_at >= ${rangeStart.toISOString()}`,
    );

    const num = (v: string | number | null | undefined) => (v == null ? null : Number(v));
    const money = (v: string | number | null | undefined) => (financials ? num(v) : null);
    const thisMonth = monthly[monthly.length - 1];

    return {
      financials,
      counts: { ...counts, inStock, total: inStock + counts.sold + counts.withdrawn },
      stock: {
        cost: money(stock?.cost),
        listValue: num(stock?.list_value),
        estimatedProfit: money(stock?.est_profit),
        missingCost: stock?.missing_cost ?? 0,
        missingPrice: stock?.missing_price ?? 0,
      },
      thisMonth: {
        sold: thisMonth?.sold ?? 0,
        revenue: money(thisMonth?.revenue),
        profit: money(thisMonth?.profit),
      },
      avgDaysToSale: num(overall?.avg_days),
      monthly: monthly.map((m) => ({
        month: m.month,
        sold: m.sold,
        revenue: money(m.revenue),
        profit: money(m.profit),
        avgDays: num(m.avg_days),
      })),
      byMake,
      agents: agents.map((a) => ({ name: a.name, sold: a.n, revenue: money(a.revenue) })),
      aging: aging ?? { d0: 0, d30: 0, d60: 0, d90: 0 },
      oldest: oldest.map((o) => ({ ...o, list_price: num(o.list_price) })),
      recent: recent.map((r) => ({ ...r, list_price: num(r.list_price) })),
    };
  });
}
