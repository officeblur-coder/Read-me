import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

// `vite build --mode demo` makes the static showcase: no backend (an in-browser stand-in for Supabase),
// a fictional brand instead of the restaurant's, relative paths so it runs from any folder of any host.
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const SWAP: Record<string, string> = { "/src/lib/supabase.ts": "./src/demo/mockSupabase.ts", "/src/lib/company.ts": "./src/demo/company.ts" };
const BRAND: [string | RegExp, string][] = [
  ['"/img/', '"./img/'],
  ["logo-lyra.jpg", "logo-demo.svg"],
  [/"(double-smash|spicy-smash|smash)\.jpg"/g, '"demo-$1.jpg"'],   // the originals carry the restaurant's logo
  ['"pitbox.jpg"', '"costite.jpg"'],
  [/"([a-z-]+)-lyra\.jpg"/g, '"$1-casa.jpg"'],
  ["BBQ Pit Box Smoker", "Din afumătoarea casei"],
  ["Pit Box Smoker", "afumătoare"],
  ["by Lyra Pensiune Restaurant · Tradiții din 1999", "by Savoro Kitchen · demo"],
  ["lyrasdelivery.ro", "savoro.ro"],
  ["lyrago.netlify.app", "savoro.ro"],
  [/Lyra's/g, "Savoro"],
  [/Lyra/g, "Savoro"],
  [/LYRA/g, "SAVORO"],
  [/(Acățari|Gornești|Corunca|Târgu Mureș)/g, "Cluj-Napoca"],
];
const demo = (): Plugin => ({
  name: "lyra-demo",
  enforce: "pre",
  async resolveId(source, importer, opts) {
    if (!importer?.includes("/src/") || !/\/(supabase|company)$/.test(source)) return null;
    const r = await this.resolve(source, importer, { ...opts, skipSelf: true });
    const hit = r && Object.keys(SWAP).find(k => r.id.endsWith(k));
    return hit ? here(SWAP[hit]) : null;
  },
  transform(code, id) {
    if (!id.includes("/src/") || !/\.(tsx?|json)$/.test(id)) return null;
    for (const [a, b] of BRAND) code = typeof a === "string" ? code.replaceAll(a, b) : code.replace(a, b);
    return code;
  },
  generateBundle() {
    for (const f of readdirSync(here("./src/demo/img")))
      this.emitFile({ type: "asset", fileName: "img/" + f, source: readFileSync(here("./src/demo/img/" + f)) });
    for (const f of readdirSync(here("./public/img")).filter(f => f.endsWith("-lyra.jpg")))
      this.emitFile({ type: "asset", fileName: "img/" + f.replace("-lyra.jpg", "-casa.jpg"), source: readFileSync(here("./public/img/" + f)) });
  },
});

export default defineConfig(({ mode }) => mode === "demo"
  ? { plugins: [demo(), react()], base: "./", build: { outDir: "dist-demo" } }
  : { plugins: [react()] });
