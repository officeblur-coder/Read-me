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
out.push("insert into public.items(id,category_id,num,name_ro,name_hu,desc_ro,desc_hu,price,grams,allergens,meat,hot,tags,wine,image,variants,sort) values");
out.push(ctx.M.map((it, i) => `  (${q(it.id)},${q(it.c)},${it.n ?? "null"},${q(it.ro)},${q(it.hu)},${q(it.d)},${q(it.dh)},${it.p},${q(it.g)},${arr(it.al)},${q(it.m)},${!!it.hot},${arr(it.t)},${q(it.w)},${q(it.img ? it.img + ".jpg" : null)},${it.v ? q(JSON.stringify(it.v)) + "::jsonb" : "null"},${(i + 1) * 10})`).join(",\n") + "\non conflict (id) do nothing;");
out.push(`insert into public.promo_codes(code,percent,category_id,label) values
  ('LYRA10',10,null,'-10% la toată comanda'),
  ('PRANZ15',15,'burger','-15% la Lyra''s Burger')
on conflict (code) do nothing;`);
out.push(`insert into public.promos(kicker,title,body,item_id,extras,price,image,active,popup)
select 'Nou la Lyra','Double Smash + cartofi','Două chiftele smash din vită, cheddar topit și cartofi prăjiți. Preț de lansare.','double-smash',array['cartofi'],42,'double-smash.jpg',true,true
where not exists (select 1 from public.promos);`);
out.push("commit;");
fs.writeFileSync(path.join(root, "supabase/02_seed_menu.sql"), out.join("\n") + "\n");
fs.writeFileSync(path.join(root, "supabase/setup.sql"),
  "-- Lyra Comenzi: fișier unic de instalare. Supabase → SQL Editor → New query → lipiți tot → Run.\n\n" +
  fs.readFileSync(path.join(root, "supabase/01_schema.sql"), "utf8") + "\n\n" + out.join("\n") + "\n");
console.log("categorii", ctx.CATS.length, "preparate", ctx.M.length);
