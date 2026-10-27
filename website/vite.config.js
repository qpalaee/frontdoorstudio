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

// robots.txt and sitemap.xml, written into the build with the URL from site.config.js.
function seoFiles() {
  return {
    name: 'seo-files',
    apply: 'build',
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE.url}/</loc>
    <lastmod>${today}</lastmod>
  </url>
</urlset>
`,
      });
    },
  };
}

export default defineConfig({
  plugins: [siteConfig(), seoFiles()],
});
