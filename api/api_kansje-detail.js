import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id verplicht' });

  try {
    const { data, error } = await supabase
      .from('kansjes')
      .select('id, titel, locatie, type, land, oude_prijs, prijs, min_nachten, personen, van, tot, omschrijving, contact, wa, urgency, foto_url, foto_urls, aangemaakt_op')
      .eq('id', id)
      .eq('verified', true)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Niet gevonden' });

    return res.status(200).json({ kansje: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
