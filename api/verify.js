import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { token } = req.query;
  const siteUrl = process.env.SITE_URL || 'https://vakantiekansjes.nl';

  if (!token) {
    return res.redirect(`${siteUrl}?verified=fout`);
  }

  try {
    // Zoek kansje op token
    const { data: kansje, error: findError } = await supabase
      .from('kansjes')
      .select('id, verified, aangemaakt_op, titel')
      .eq('verify_token', token)
      .single();

    if (findError || !kansje) {
      return res.redirect(`${siteUrl}?verified=ongeldig`);
    }

    // Check of token niet ouder is dan 48 uur
    const aangemaakt = new Date(kansje.aangemaakt_op);
    const nu = new Date();
    const uurVerschil = (nu - aangemaakt) / (1000 * 60 * 60);
    if (uurVerschil > 48) {
      return res.redirect(`${siteUrl}?verified=verlopen`);
    }

    if (kansje.verified) {
      // Al geverifieerd — gewoon doorsturen
      return res.redirect(`${siteUrl}?verified=al_actief`);
    }

    // Activeer kansje
    const { error: updateError } = await supabase
      .from('kansjes')
      .update({ verified: true, verify_token: null })
      .eq('id', kansje.id);

    if (updateError) throw new Error(updateError.message);

    return res.redirect(`${siteUrl}?verified=ok&titel=${encodeURIComponent(kansje.titel)}`);

  } catch (err) {
    console.error('verify.js error:', err);
    return res.redirect(`${siteUrl}?verified=fout`);
  }
}
