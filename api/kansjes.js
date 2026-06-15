import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const nu = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('kansjes')
      .select('id, titel, locatie, type, land, oude_prijs, prijs, min_nachten, personen, van, tot, omschrijving, contact, wa, urgency, aangemaakt_op')
      .eq('verified', true)
      .gte('tot', nu) // alleen kansjes die nog niet verlopen zijn
      .order('aangemaakt_op', { ascending: false });

    if (error) throw new Error(error.message);

    return res.status(200).json({ kansjes: data || [] });

  } catch (err) {
    console.error('kansjes.js error:', err);
    return res.status(500).json({ error: err.message });
  }
}
