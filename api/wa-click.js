import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { kansjeId, kansje_titel } = req.body;
    if (!kansjeId) return res.status(400).json({ error: 'kansjeId verplicht' });

    await supabase.from('reacties').insert({
      kansje_id: kansjeId,
      kansje_titel: kansje_titel || '',
      type: 'whatsapp',
      gast_naam: null,
      gast_email: null,
      bericht: null,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('wa-click.js error:', err);
    return res.status(500).json({ error: err.message });
  }
}
