import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'slug verplicht' });

  try {
    // Haal de shortId op: laatste segment na het laatste '-'
    // slug = "eigen-villa-in-heuvels-van-piemonte-c8c61940"
    // shortId = "c8c61940" (eerste 8 tekens van UUID)
    const delen = slug.split('-');
    const shortId = delen[delen.length - 1];

    if (!shortId || shortId.length !== 8) {
      return res.status(404).json({ error: 'Ongeldige slug' });
    }

    // Zoek kansje waarvan het id begint met shortId
    const { data, error } = await supabase
      .from('kansjes')
      .select('id, titel, locatie, type, land, oude_prijs, prijs, min_nachten, personen, van, tot, omschrijving, contact, wa, urgency, foto_url, foto_urls, aangemaakt_op')
      .eq('verified', true)
      .ilike('id', `${shortId}%`)
      .maybeSingle(); // gebruik maybeSingle ipv single om harde errors te vermijden

    if (error) {
      console.error('Supabase error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Kansje niet gevonden' });
    }

    return res.status(200).json({ kansje: data });

  } catch (err) {
    console.error('kansje-detail error:', err);
    return res.status(500).json({ error: err.message });
  }
}
