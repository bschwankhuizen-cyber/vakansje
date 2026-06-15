import { Resend } from 'resend';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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
    const { kansjeId, huurderNaam, huurderEmail, bericht } = req.body;

    if (!kansjeId || !huurderNaam || !huurderEmail || !bericht) {
      return res.status(400).json({ error: 'Verplichte velden ontbreken' });
    }

    // Haal kansje op uit Supabase
    const { data: kansje, error } = await supabase
      .from('kansjes')
      .select('titel, locatie, email, naam')
      .eq('id', kansjeId)
      .eq('verified', true)
      .single();

    if (error || !kansje) {
      return res.status(404).json({ error: 'Kansje niet gevonden' });
    }

    // AI-gegenereerde doorstuurmail
    const aiResp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Schrijf een korte, vriendelijke Nederlandse doorstuur-e-mail (plain tekst) namens Vakantiekansjes.nl.

Een geïnteresseerde huurder stuurde een bericht via het platform:

Kansje: "${kansje.titel}" in ${kansje.locatie}
Naam huurder: ${huurderNaam}
E-mail huurder: ${huurderEmail}
Bericht: "${bericht}"

Stuur dit door naar de verhuurder (${kansje.naam}). Vermeld de huurdergegevens duidelijk zodat de verhuurder direct kan reageren op ${huurderEmail}. Warm, kort, professioneel. Max 10 regels.`
      }]
    });

    const mailTekst = aiResp.content.map(b => b.text || '').join('');

    // Verstuur naar verhuurder
    await resend.emails.send({
      from: 'Vakantiekansjes.nl <noreply@vakantiekansjes.nl>',
      to: kansje.email,
      reply_to: huurderEmail,
      subject: `Nieuw bericht over "${kansje.titel}"`,
      text: mailTekst,
    });

    // Bevestigingsmail naar huurder
    await resend.emails.send({
      from: 'Vakantiekansjes.nl <noreply@vakantiekansjes.nl>',
      to: huurderEmail,
      subject: `Je bericht over "${kansje.titel}" is verstuurd`,
      text: `Hoi ${huurderNaam},\n\nJe bericht over "${kansje.titel}" is doorgestuurd naar de verhuurder. Je ontvangt zo snel mogelijk een reactie op dit e-mailadres.\n\nFijne vakantie!\nHet Vakantiekansjes.nl team`,
    });

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('bericht.js error:', err);
    return res.status(500).json({ error: err.message || 'Onbekende fout' });
  }
}
