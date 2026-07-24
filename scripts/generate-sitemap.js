import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllSitemapEntries } from '../src/seoPagesConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const entries = getAllSitemapEntries();
const body = entries
  .map(
    (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

const target = path.join(root, 'public', 'sitemap.xml');
writeFileSync(target, xml, 'utf8');
console.log(`Sitemap geschrieben: ${target} (${entries.length} URLs)`);
