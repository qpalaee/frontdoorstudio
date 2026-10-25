import { defineConfig } from 'vite';
import { SITE, SITE_LINKS } from './site.config.js';

// Replaces {{site.key}} and {{link.key}} in index.html with the values from site.config.js.
function siteConfig() {
  const values = {
    ...Object.fromEntries(Object.entries(SITE).map(([k, v]) => [`site.${k}`, v])),
    ...Object.fromEntries(Object.entries(SITE_LINKS).map(([k, v]) => [`link.${k}`, v])),
  };
  return {
    name: 'site-config',
    transformIndexHtml(html) {
      return html.replace(/\{\{\s*((?:site|link)\.\w+)\s*\}\}/g, (match, key) => {
        if (!(key in values)) throw new Error(`Unknown config key in index.html: ${key}`);
        return values[key];
      });
    },
  };
}

export default defineConfig({
  plugins: [siteConfig()],
});
