import "server-only";
import type { Tx } from "./db";
import { auditLog } from "./db/schema";

export async function audit(
  tx: Tx,
  ctx: { dealerId: string; userId: string },
  action: string,
  entity: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  await tx.insert(auditLog).values({
    dealerId: ctx.dealerId,
    actorUserId: ctx.userId,
    action,
    entity,
    entityId,
    metadata,
  });
}
