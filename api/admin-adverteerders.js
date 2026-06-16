import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'vakantie2025';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = req.headers.authorization;
  if (auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Niet geautoriseerd' });
  }

  if (req.method === 'GET') {
    // Haal alle adverteerders op
    const { data: adverteerders, error: advError } = await supabase
      .from('adverteerders')
      .select('*')
      .order('aangemaakt_op', { ascending: false });

    if (advError) return res.status(500).json({ error: advError.message });

    // Haal per adverteerder de kansjes op
    const nu = new Date().toISOString().split('T')[0];
    const { data: kansjes, error: kError } = await supabase
      .from('kansjes')
      .select('email, id, titel, tot, verified');

    if (kError) return res.status(500).json({ error: kError.message });

    // Koppel kansjes aan adverteerders
    const result = adverteerders.map(adv => {
      const eigenkansjes = kansjes.filter(k => k.email === adv.email);
      const actief = eigenkansjes.filter(k => k.verified && k.tot >= nu);
      return {
        ...adv,
        aantalKansjes: eigenkansjes.length,
        actieveKansjes: actief.length,
        heeftActief: actief.length > 0,
      };
    });

    return res.status(200).json({ adverteerders: result });
  }

  // PUT: adverteerder updaten (bijv. telefoonnummer)
  if (req.method === 'PUT') {
    const { id, telefoon, naam } = req.body;
    if (!id) return res.status(400).json({ error: 'id verplicht' });

    const { error } = await supabase
      .from('adverteerders')
      .update({ telefoon, naam })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
