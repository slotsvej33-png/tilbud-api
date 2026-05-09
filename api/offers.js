export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { zip, q } = req.query;
  if (!zip) return res.status(400).json({ error: 'zip mangler' });

  try {
    // Postnummer → koordinater via gratis dansk myndigheds-API
    const geoRes = await fetch(`https://api.dataforsyningen.dk/postnumre/${zip}`);
    if (!geoRes.ok) throw new Error('Ugyldigt postnummer');
    const geo = await geoRes.json();
    const [lng, lat] = geo.visueltcenter;

    // Hent tilbud fra eTilbudsavis (dækker Rema, Lidl, Meny, Netto m.fl.)
    const query = q ? encodeURIComponent(q) : '';
    const url = `https://api.etilbudsavis.dk/v2/offers/search` +
      `?r_lat=${lat}&r_lng=${lng}&r_radius=10000` +
      `&r_locale=da_DK&query=${query}&offset=0&limit=100`;

    const offersRes = await fetch(url);

    if (!offersRes.ok) {
      const text = await offersRes.text();
      throw new Error(`eTilbudsavis svarede ${offersRes.status}: ${text.slice(0, 120)}`);
    }

    const data = await offersRes.json();
    return res.status(200).json(data);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
