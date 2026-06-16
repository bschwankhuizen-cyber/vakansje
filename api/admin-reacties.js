import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'vakantie2025';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = (req.headers.authorization || '').trim();
  if (auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Niet geautoriseerd' });
  }

  try {
    // Alle reacties
    const { data: reacties, error: rError } = await supabase
      .from('reacties')
      .select('*')
      .order('aangemaakt_op', { ascending: false });
    if (rError) throw new Error(rError.message);

    // Alle gasten
    const { data: gasten, error: gError } = await supabase
      .from('gasten')
      .select('*')
      .order('aangemaakt_op', { ascending: false });
    if (gError) throw new Error(gError.message);

    // Reacties per kansje samenvatten
    const perKansje = {};
    reacties.forEach(r => {
      const kid = r.kansje_id || 'onbekend';
      if (!perKansje[kid]) {
        perKansje[kid] = {
          kansje_id: kid,
          kansje_titel: r.kansje_titel || '—',
          berichten: 0,
          whatsapp_clicks: 0,
          totaal: 0,
          laatste: r.aangemaakt_op,
        };
      }
      if (r.type === 'bericht') perKansje[kid].berichten++;
      if (r.type === 'whatsapp') perKansje[kid].whatsapp_clicks++;
      perKansje[kid].totaal++;
      if (r.aangemaakt_op > perKansje[kid].laatste) perKansje[kid].laatste = r.aangemaakt_op;
    });

    // Gasten verrijken met aantal berichten
    const gastenVerrijkt = gasten.map(g => ({
      ...g,
      aantalBerichten: reacties.filter(r => r.gast_email === g.email && r.type === 'bericht').length,
      kansjesTitels: [...new Set(reacties.filter(r => r.gast_email === g.email).map(r => r.kansje_titel).filter(Boolean))],
    }));

    return res.status(200).json({
      reacties,
      perKansje: Object.values(perKansje).sort((a, b) => b.totaal - a.totaal),
      gasten: gastenVerrijkt,
    });
  } catch (err) {
    console.error('admin-reacties error:', err);
    return res.status(500).json({ error: err.message });
  }
}
