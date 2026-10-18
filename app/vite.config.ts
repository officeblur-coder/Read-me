import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

// `vite build --mode demo` makes the static showcase: no backend (an in-browser stand-in for Supabase),
// a fictional restaurant (own menu, stock photos) instead of the real one, relative paths so it runs from any folder of any host.
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const SWAP: Record<string, string> = {
  "/src/lib/supabase.ts": "./src/demo/mockSupabase.ts",
  "/src/lib/company.ts": "./src/demo/company.ts",
  "/src/lib/menuConfig.ts": "./src/demo/menuConfig.ts",
};
const BRAND: [string | RegExp, string][] = [
  ['"/img/', '"./img/'],
  ["logo-lyra.jpg", "logo-demo.svg"],
  ["by Lyra Pensiune Restaurant · Tradiții din 1999", "by Savoro Kitchen · demo"],
  ["lyrasdelivery.ro", "savoro.ro"],
  ["lyrago.netlify.app", "savoro.ro"],
  [/Lyra's/g, "Savoro"],
  [/Lyra/g, "Savoro"],
  [/LYRA/g, "SAVORO"],
];
const demo = (): Plugin => ({
  name: "lyra-demo",
  enforce: "pre",
  async resolveId(source, importer, opts) {
    if (!importer?.includes("/src/") || !/\/(supabase|company|menuConfig)$/.test(source)) return null;
    const r = await this.resolve(source, importer, { ...opts, skipSelf: true });
    const hit = r && Object.keys(SWAP).find(k => r.id.endsWith(k));
    return hit ? here(SWAP[hit]) : null;
  },
  transform(code, id) {
    if (!id.includes("/src/") || !/\.(tsx?|json)$/.test(id)) return null;
    for (const [a, b] of BRAND) code = typeof a === "string" ? code.replaceAll(a, b) : code.replace(a, b);
    return code;
  },
  transformIndexHtml(html) {
    return html.replace("/img/logo-lyra.jpg", "./img/logo-demo.svg").replace(/Lyra's Delivery/g, "Savoro Delivery").replace(/Lyra/g, "Savoro").replace("specialități la tigaie fierbinte, burgeri pe cărbune", "burgeri, pizza, sushi și brunch");
  },
  generateBundle() {
    for (const f of readdirSync(here("./src/demo/img")))
      this.emitFile({ type: "asset", fileName: "img/" + f, source: readFileSync(here("./src/demo/img/" + f)) });
  },
});

export default defineConfig(({ mode }) => mode === "demo"
  ? { plugins: [demo(), react()], base: "./", publicDir: false, build: { outDir: "dist-demo" } }
  : { plugins: [react()] });
