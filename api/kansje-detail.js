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

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'slug verplicht' });

  try {
    // Haal de shortId op: laatste segment van de slug (8 tekens = begin van UUID)
    const delen = slug.split('-');
    const shortId = delen[delen.length - 1];

    if (!shortId || shortId.length !== 8) {
      return res.status(404).json({ error: 'Ongeldige slug' });
    }

    // ilike werkt niet op UUID kolom — haal alle kansjes op en filter in JS
    // We limiteren op recente kansjes om het snel te houden
    const { data, error } = await supabase
      .from('kansjes')
      .select('id, titel, locatie, type, land, oude_prijs, prijs, min_nachten, personen, van, tot, omschrijving, contact, wa, urgency, foto_url, foto_urls, aangemaakt_op')
      .eq('verified', true)
      .order('aangemaakt_op', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Supabase error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    // Zoek het kansje waarvan het id begint met shortId
    const kansje = (data || []).find(k => k.id.startsWith(shortId));

    if (!kansje) {
      return res.status(404).json({ error: 'Kansje niet gevonden', shortId });
    }

    return res.status(200).json({ kansje });

  } catch (err) {
    console.error('kansje-detail error:', err);
    return res.status(500).json({ error: err.message });
  }
}
