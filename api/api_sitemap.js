import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SITE_URL = process.env.SITE_URL || 'https://vakantiekansjes.nl';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const nu = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('kansjes')
      .select('id, aangemaakt_op')
      .eq('verified', true)
      .gte('tot', nu);

    const staticPaginas = [
      { url: '/', lastmod: new Date().toISOString().split('T')[0], priority: '1.0', changefreq: 'daily' },
      { url: '/over-ons.html', priority: '0.5', changefreq: 'monthly' },
      { url: '/spelregels.html', priority: '0.5', changefreq: 'monthly' },
      { url: '/privacybeleid.html', priority: '0.4', changefreq: 'monthly' },
      { url: '/contact.html', priority: '0.5', changefreq: 'monthly' },
    ];

    const kansjeUrls = (data || []).map(k => ({
      url: `/kansje/${k.id}`,
      lastmod: k.aangemaakt_op ? k.aangemaakt_op.split('T')[0] : new Date().toISOString().split('T')[0],
      priority: '0.8',
      changefreq: 'weekly',
    }));

    const alleUrls = [...staticPaginas, ...kansjeUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${alleUrls.map(({ url, lastmod, priority, changefreq }) => `  <url>
    <loc>${SITE_URL}${url}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).send(xml);
  } catch (err) {
    return res.status(500).send('<?xml version="1.0"?><error>Fout bij genereren sitemap</error>');
  }
}
