import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const SITE = 'https://www.kitzalpen.at/';

/**
 * Two builds:
 * - `npm run build`          → production for the domain root (kitzalpen.at): indexable, canonical, absolute og:image.
 * - `npm run build:preview`  → preview copy for any sub-folder (base './'), kept out of search engines.
 */
function head(preview: boolean): Plugin {
  return {
    name: 'kitzalpen-head',
    transformIndexHtml(html) {
      const tags = preview
        ? '<meta name="robots" content="noindex, nofollow" />'
        : [
            '<meta name="robots" content="index, follow" />',
            `<link rel="canonical" href="${SITE}" />`,
            `<meta property="og:url" content="${SITE}" />`,
            `<meta property="og:image" content="${SITE}images/hero/winter-d.jpg" />`,
          ].join('\n    ');
      return html.replace('<!--robots-->', tags);
    },
  };
}

export default defineConfig(({ mode }) => {
  const preview = mode === 'preview';
  return {
    base: preview ? './' : '/',
    plugins: [react(), head(preview)],
    build: { target: 'es2019', cssCodeSplit: false, assetsInlineLimit: 0 },
  };
});
