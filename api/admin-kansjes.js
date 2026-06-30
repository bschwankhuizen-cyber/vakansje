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
  const auth = (req.headers.authorization || '').trim();
  if (auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Niet geautoriseerd' });
  }

  // GET: alle kansjes ophalen
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('kansjes')
      .select('id, titel, locatie, land, prijs, oude_prijs, van, tot, verified, naam, email, aangemaakt_op, urgency, type, personen, min_nachten, foto_url, foto_urls, contact, wa, omschrijving')
      .order('aangemaakt_op', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ kansjes: data });
  }

  // PUT: kansje updaten (alle velden)
  if (req.method === 'PUT') {
    const { id, verified, urgency, titel, type, land, locatie,
            personen, min_nachten, oude_prijs, prijs,
            van, tot, omschrijving, contact, wa,
            foto_url, foto_urls } = req.body;
    if (!id) return res.status(400).json({ error: 'id verplicht' });

    // Bouw update object — sla alleen meegestuurde velden op
    const updates = {};
    if (verified !== undefined) updates.verified = verified;
    if (urgency !== undefined) updates.urgency = urgency;
    if (titel !== undefined) updates.titel = titel;
    if (type !== undefined) updates.type = type;
    if (land !== undefined) updates.land = land;
    if (locatie !== undefined) updates.locatie = locatie;
    if (personen !== undefined) updates.personen = personen;
    if (min_nachten !== undefined) updates.min_nachten = min_nachten;
    if (oude_prijs !== undefined) updates.oude_prijs = oude_prijs;
    if (prijs !== undefined) updates.prijs = prijs;
    if (van !== undefined) updates.van = van;
    if (tot !== undefined) updates.tot = tot;
    if (omschrijving !== undefined) updates.omschrijving = omschrijving;
    if (contact !== undefined) updates.contact = contact;
    if (wa !== undefined) updates.wa = wa;
    if (foto_url !== undefined) updates.foto_url = foto_url;
    if (foto_urls !== undefined) updates.foto_urls = foto_urls;

    const { error } = await supabase
      .from('kansjes')
      .update(updates)
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // DELETE: kansje verwijderen + foto's uit Storage wissen
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id verplicht' });

    // Haal eerst foto URLs op voordat we verwijderen
    const { data: kansje, error: fetchError } = await supabase
      .from('kansjes')
      .select('foto_url, foto_urls')
      .eq('id', id)
      .single();

    if (!fetchError && kansje) {
      // Verzamel alle foto-paden uit Storage
      const alleUrls = [
        ...(kansje.foto_urls || []),
        ...(kansje.foto_url ? [kansje.foto_url] : []),
      ];

      // Haal de bestandsnamen op uit de URLs (alles na /public/fotos/)
      const paden = [...new Set(alleUrls)]
        .map(url => {
          const match = url.match(/\/public\/fotos\/(.+)$/);
          return match ? match[1] : null;
        })
        .filter(Boolean);

      if (paden.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('fotos')
          .remove(paden);
        if (storageError) {
          console.error('Storage verwijderen mislukt:', storageError.message);
          // Doorgaan met DB delete ook al mislukt storage
        }
      }
    }

    // Verwijder het kansje uit de database
    const { error } = await supabase
      .from('kansjes')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
