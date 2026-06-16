import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      titel, locatie, type, land,
      oude_prijs, prijs, min_nachten, personen,
      van, tot, omschrijving, contact, wa, urgency,
      naam, email, foto_url, foto_urls
    } = req.body;

    // Validatie
    if (!titel || !email || !naam || !van || !tot || !prijs || !land) {
      return res.status(400).json({ error: 'Verplichte velden ontbreken' });
    }

    // Max 6 weken check
    const maxDatum = new Date();
    maxDatum.setDate(maxDatum.getDate() + 42);
    if (new Date(tot) > maxDatum) {
      return res.status(400).json({ error: 'Datum ligt meer dan 6 weken in de toekomst' });
    }

    // Unieke verificatietoken aanmaken
    const verifyToken = randomUUID();

    // Opslaan in Supabase (nog niet verified)
    const { data: kansje, error: dbError } = await supabase
      .from('kansjes')
      .insert({
        titel, locatie, type, land,
        oude_prijs, prijs, min_nachten, personen,
        van, tot, omschrijving, contact, wa, urgency,
        naam, email,
        foto_url: foto_url || (foto_urls && foto_urls[0]) || null,
        foto_urls: foto_urls || (foto_url ? [foto_url] : []),
        verified: false,
        verify_token: verifyToken,
      })
      .select()
      .single();

    if (dbError) throw new Error('Database fout: ' + dbError.message);

    // Adverteerder opslaan of updaten (upsert op email)
    await supabase
      .from('adverteerders')
      .upsert({ naam, email, telefoon: contact || null }, { onConflict: 'email', ignoreDuplicates: false });

    // Verificatielink
    const siteUrl = process.env.SITE_URL || 'https://vakantiekansjes.nl';
    const verifyUrl = `${siteUrl}/api/verify?token=${verifyToken}`;

    // AI-gegenereerde verificatiemail via Anthropic
    const aiResp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Je bent de afzender van verificatiemails voor Vakantiekansjes.nl.

Schrijf een korte, vriendelijke Nederlandse verificatiemail (plain tekst) voor verhuurder ${naam}, die "${titel}" in ${locatie} heeft aangemeld.

Inhoud:
1. Persoonlijke begroeting
2. Bevestig dat het kansje bijna live staat
3. Verificatielink — gebruik exact deze URL: ${verifyUrl}
4. Link is 48 uur geldig
5. Warme afsluiting namens Vakantiekansjes.nl

Warm, informeel, max 10 regels. Geen AI-jargon.`
      }]
    });

    const mailTekst = aiResp.content.map(b => b.text || '').join('');

    // Verstuur via Resend
    await resend.emails.send({
      from: 'Vakantiekansjes.nl <noreply@vakantiekansjes.nl>',
      to: email,
      subject: `Bevestig je kansje: ${titel}`,
      text: mailTekst,
    });

    return res.status(200).json({
      ok: true,
      mailTekst,
      kansjeId: kansje.id,
    });

  } catch (err) {
    console.error('kansje.js error:', err);
    return res.status(500).json({ error: err.message || 'Onbekende fout' });
  }
}
