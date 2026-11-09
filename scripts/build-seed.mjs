// Generează supabase/02_seed_menu.sql și supabase/setup.sql din lyra/data/menu.js
import fs from "node:fs"; import vm from "node:vm"; import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "lyra/data/menu.js"), "utf8") + "\nthis.CATS=CATS;this.M=M;", ctx);
const q = v => v == null || v === "" ? "null" : "'" + String(v).replace(/'/g, "''") + "'";
const arr = a => "array[" + (a || []).map(q).join(",") + "]::text[]";
const out = ["-- Meniul Lyra (generat automat din lyra/data/menu.js). Nu suprascrie modificările făcute în admin.", "begin;"];
out.push("insert into public.categories(id,name_ro,name_hu,note_ro,note_hu,sort) values");
out.push(ctx.CATS.map((c, i) => `  (${q(c.id)},${q(c.ro)},${q(c.hu)},${q(c.note?.[0])},${q(c.note?.[1])},${(i + 1) * 10})`).join(",\n") + "\non conflict (id) do nothing;");
const COLS = "id,category_id,num,name_ro,name_hu,desc_ro,desc_hu,price,grams,allergens,meat,hot,tags,wine,image,variants,packaging,active,sort";
const itemRows = ctx.M.map((it, i) => `  (${q(it.id)},${q(it.c)},${it.n ?? "null"},${q(it.ro)},${q(it.hu)},${q(it.d)},${q(it.dh)},${it.p},${q(it.g)},${arr(it.al)},${q(it.m)},${!!it.hot},${arr(it.t)},${q(it.w)},${q(it.img ? it.img + ".jpg" : null)},${it.v ? q(JSON.stringify(it.v)) + "::jsonb" : "null"},${it.pk ?? 2},${!it.x},${(i + 1) * 10})`).join(",\n");
const catRows = ctx.CATS.map((c, i) => `  (${q(c.id)},${q(c.ro)},${q(c.hu)},${q(c.note?.[0])},${q(c.note?.[1])},${(i + 1) * 10})`).join(",\n");
out.push(`insert into public.items(${COLS}) values`);
out.push(itemRows + "\non conflict (id) do nothing;");
out.push(`insert into public.promo_codes(code,percent,category_id,label) values
  ('LYRA10',10,null,'-10% la toată comanda'),
  ('PRANZ15',15,'burger','-15% la Lyra''s Burger')
on conflict (code) do nothing;`);
out.push(`insert into public.promos(kicker,title,body,item_id,extras,price,image,active,popup)
select 'Nou la Lyra','Double Smash + cartofi','Două chiftele smash din vită, cheddar topit și cartofi prăjiți. Preț de lansare.','double-smash',array['cartofi'],42,'double-smash.jpg',true,true
where not exists (select 1 from public.promos);`);
out.push(`insert into public.banners(chip,title,body,cta,image,category_id,sort)
select * from (values
  ('Nou · Smash Burgers', null, 'Chiftele smash din vită, cheddar topit, chiflă artizanală. De la 25 lei.', 'Comandă acum', 'double-smash.jpg', 'smash', 10),
  ('BBQ Pit Box Smoker', 'Afumat lent, ore întregi', null, 'Specialitățile casei', 'pitbox.jpg', 'specialitati', 20)
) v where not exists (select 1 from public.banners);`);
out.push("commit;");
// schema = toate fișierele numerotate (01_, 03_, 04_ …) în ordine, fără 02 (meniul, generat aici)
const schema = fs.readdirSync(path.join(root, "supabase")).filter(f => /^\d\d_.*\.sql$/.test(f) && !f.startsWith("02_")).sort()
  .map(f => fs.readFileSync(path.join(root, "supabase", f), "utf8")).join("\n\n");
fs.writeFileSync(path.join(root, "supabase/02_seed_menu.sql"), out.join("\n") + "\n");
fs.writeFileSync(path.join(root, "supabase/setup.sql"),
  "-- Lyra Comenzi: fișier unic de instalare. Supabase → SQL Editor → New query → lipiți tot → Run.\n\n" +
  schema + "\n\n" + out.join("\n") + "\n");
// Actualizarea meniului pe o bază existentă: suprascrie categoriile și preparatele cu cele din lyra/data/menu.js
// (inclusiv prețuri, poze, ambalaj); preparatele marcate x rămân în bază, dar ascunse.
const upd = ["-- Actualizare meniu (generat din lyra/data/menu.js). ATENȚIE: suprascrie prețurile, textele și pozele din admin.", "begin;",
  "insert into public.categories(id,name_ro,name_hu,note_ro,note_hu,sort) values", catRows,
  "on conflict (id) do update set name_ro = excluded.name_ro, name_hu = excluded.name_hu, note_ro = excluded.note_ro, note_hu = excluded.note_hu, sort = excluded.sort, active = true;",
  `insert into public.items(${COLS}) values`, itemRows,
  "on conflict (id) do update set " + COLS.split(",").filter(c => c !== "id").map(c => `${c} = excluded.${c}`).join(", ") + ", updated_at = now();",
  "commit;"];
fs.writeFileSync(path.join(root, "supabase/actualizare_meniu.sql"),
  "-- Lyra: schema + actualizarea meniului. Supabase → SQL Editor → New query → lipiți tot → Run.\n\n" +
  schema + "\n\n" + upd.join("\n") + "\n");
fs.writeFileSync(path.join(root, "supabase/actualizare_schema.sql"),
  "-- Lyra: actualizare schemă (Lyra Rewards, zone de livrare). Nu modifică meniul. Supabase → SQL Editor → New query → lipiți tot → Run.\n\n" + schema + "\n");
console.log("categorii", ctx.CATS.length, "preparate", ctx.M.length);
