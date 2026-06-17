import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'info@vakantiekansjes.nl';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { naam, email, onderwerp, bericht } = req.body;
  if (!naam || !email || !onderwerp || !bericht) {
    return res.status(400).json({ error: 'Verplichte velden ontbreken' });
  }

  try {
    // Mail naar jou
    await resend.emails.send({
      from: 'Vakantiekansjes.nl <noreply@vakantiekansjes.nl>',
      to: CONTACT_EMAIL,
      reply_to: email,
      subject: `Contactformulier: ${onderwerp}`,
      text: `Nieuw bericht via het contactformulier:\n\nNaam: ${naam}\nE-mail: ${email}\nOnderwerp: ${onderwerp}\n\nBericht:\n${bericht}`,
    });

    // Bevestiging naar afzender
    await resend.emails.send({
      from: 'Vakantiekansjes.nl <noreply@vakantiekansjes.nl>',
      to: email,
      subject: 'We hebben je bericht ontvangen',
      text: `Hoi ${naam},\n\nBedankt voor je bericht! We hebben het ontvangen en reageren zo snel mogelijk.\n\nJe bericht:\n"${bericht}"\n\nMet vriendelijke groet,\nHet Vakantiekansjes.nl team`,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact.js error:', err);
    return res.status(500).json({ error: err.message });
  }
}
