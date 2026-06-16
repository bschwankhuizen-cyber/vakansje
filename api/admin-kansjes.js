import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'vakantie2025';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth check
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Niet geautoriseerd' });
  }

  // GET: alle kansjes ophalen
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('kansjes')
      .select('id, titel, locatie, land, prijs, oude_prijs, van, tot, verified, naam, email, aangemaakt_op, urgency, type, personen, min_nachten, foto_url')
      .order('aangemaakt_op', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ kansjes: data });
  }

  // PUT: kansje updaten (verified aan/uit)
  if (req.method === 'PUT') {
    const { id, verified } = req.body;
    if (!id) return res.status(400).json({ error: 'id verplicht' });

    const { error } = await supabase
      .from('kansjes')
      .update({ verified })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // DELETE: kansje verwijderen
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id verplicht' });

    const { error } = await supabase
      .from('kansjes')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
