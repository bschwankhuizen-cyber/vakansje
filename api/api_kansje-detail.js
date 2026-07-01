import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function maakSlug(titel, id) {
  let slug = (titel || '').toLowerCase()
    .replace(/[ëéèê]/g, 'e').replace(/[ïíì]/g, 'i')
    .replace(/[üúù]/g, 'u').replace(/[öóò]/g, 'o')
    .replace(/[äáà]/g, 'a').replace(/ñ/g, 'n').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug}-${id.slice(0, 8)}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'slug verplicht' });

  try {
    // Haal de UUID uit de laatste 8 tekens van de slug (na laatste streepje)
    const delen = slug.split('-');
    const shortId = delen[delen.length - 1];

    // Zoek kansjes waarvan het id begint met de shortId
    const { data, error } = await supabase
      .from('kansjes')
      .select('id, titel, locatie, type, land, oude_prijs, prijs, min_nachten, personen, van, tot, omschrijving, contact, wa, urgency, foto_url, foto_urls, aangemaakt_op')
      .eq('verified', true)
      .ilike('id', `${shortId}%`)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Niet gevonden' });

    // Verifieer dat de slug overeenkomt (voorkom id-guessing)
    const verwachteSlug = maakSlug(data.titel, data.id);
    if (slug !== verwachteSlug) return res.status(404).json({ error: 'Niet gevonden' });

    return res.status(200).json({ kansje: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
