import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// `vite build --mode demo` makes the static showcase: no backend (an in-browser stand-in for Supabase),
// relative paths so it runs from any folder of any host.
const demo = (): Plugin => ({
  name: "lyra-demo",
  enforce: "pre",
  async resolveId(source, importer, opts) {
    if (!/\/supabase$/.test(source) || !importer?.includes("/src/")) return null;
    const r = await this.resolve(source, importer, { ...opts, skipSelf: true });
    return r?.id.endsWith("/src/lib/supabase.ts") ? fileURLToPath(new URL("./src/demo/mockSupabase.ts", import.meta.url)) : null;
  },
  transform(code, id) {
    return id.includes("/src/") && /\.tsx?$/.test(id) ? code.replaceAll('"/img/', '"./img/') : null;
  },
});

export default defineConfig(({ mode }) => mode === "demo"
  ? { plugins: [demo(), react()], base: "./", build: { outDir: "dist-demo" } }
  : { plugins: [react()] });
