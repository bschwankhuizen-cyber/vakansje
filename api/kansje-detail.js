import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slug, id } = req.query;
  const zoekterm = slug || id;

  if (!zoekterm) return res.status(400).json({ error: 'slug of id verplicht' });

  try {
    let data = null;
    let error = null;

    // Probeer eerst op volledige UUID (als het een UUID is)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(zoekterm)) {
      // Directe UUID lookup
      const result = await supabase
        .from('kansjes')
        .select('id, titel, locatie, type, land, oude_prijs, prijs, min_nachten, personen, van, tot, omschrijving, contact, wa, urgency, foto_url, foto_urls, aangemaakt_op')
        .eq('verified', true)
        .eq('id', zoekterm)
        .maybeSingle();
      data = result.data;
      error = result.error;
    } else {
      // Slug lookup: pak de laatste 8 tekens (shortId = begin van UUID)
      const delen = zoekterm.split('-');
      const shortId = delen[delen.length - 1];

      if (shortId && shortId.length === 8) {
        const result = await supabase
          .from('kansjes')
          .select('id, titel, locatie, type, land, oude_prijs, prijs, min_nachten, personen, van, tot, omschrijving, contact, wa, urgency, foto_url, foto_urls, aangemaakt_op')
          .eq('verified', true)
          .ilike('id', `${shortId}%`)
          .maybeSingle();
        data = result.data;
        error = result.error;
      }
    }

    if (error) {
      console.error('Supabase error:', JSON.stringify(error));
      return res.status(500).json({ error: error.message, detail: error });
    }

    if (!data) {
      console.log('Niet gevonden voor zoekterm:', zoekterm);
      return res.status(404).json({ error: 'Kansje niet gevonden', zoekterm });
    }

    return res.status(200).json({ kansje: data });

  } catch (err) {
    console.error('Onverwachte fout:', err);
    return res.status(500).json({ error: err.message });
  }
}
