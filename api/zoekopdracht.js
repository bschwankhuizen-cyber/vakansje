import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { naam, email, van, tot, land, budget, personen, opmerking } = req.body;

    if (!naam || !email || !van || !tot) {
      return res.status(400).json({ error: 'Verplichte velden ontbreken' });
    }

    // Opslaan in Supabase
    const { error: dbError } = await supabase
      .from('zoekopdrachten')
      .insert({ naam, email, van, tot, land, budget, personen, opmerking });

    if (dbError) throw new Error(dbError.message);

    // Bevestigingsmail
    const vanNL = new Date(van).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
    const totNL = new Date(tot).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });

    await resend.emails.send({
      from: 'Vakantiekansjes.nl <noreply@vakantiekansjes.nl>',
      to: email,
      subject: 'Je zoekopdracht is opgeslagen',
      text: `Hoi ${naam},\n\nJe zoekopdracht is opgeslagen!\n\nJe zoekt een vakantiewoning van ${vanNL} t/m ${totNL}${land ? ' in ' + land : ''}${budget ? ', max. €' + budget + '/nacht' : ''}${personen ? ', voor ' + personen + ' personen' : ''}.\n\nZodra een verhuurder een passend kansje plaatst, sturen we je een berichtje op dit e-mailadres.\n\nFijne vakantie!\nHet Vakantiekansjes.nl team`,
    });

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('zoekopdracht.js error:', err);
    return res.status(500).json({ error: err.message || 'Onbekende fout' });
  }
}
