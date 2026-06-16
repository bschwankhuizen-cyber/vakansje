import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { base64, bestandsnaam, mimeType } = req.body;

    if (!base64 || !bestandsnaam) {
      return res.status(400).json({ error: 'base64 en bestandsnaam verplicht' });
    }

    // Base64 naar buffer
    const buffer = Buffer.from(base64, 'base64');

    // Unieke bestandsnaam
    const ext = bestandsnaam.split('.').pop().toLowerCase();
    const uniekNaam = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Upload naar Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('fotos')
      .upload(uniekNaam, buffer, {
        contentType: mimeType || 'image/jpeg',
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);

    // Publieke URL ophalen
    const { data } = supabase.storage
      .from('fotos')
      .getPublicUrl(uniekNaam);

    return res.status(200).json({ url: data.publicUrl });

  } catch (err) {
    console.error('foto.js error:', err);
    return res.status(500).json({ error: err.message });
  }
}
