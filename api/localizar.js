import net from 'node:net';
import { tokenValido } from './_lib.js';

async function buscar(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

export default async function handler(req, res) {
  if (!tokenValido(req)) return res.status(401).json({ error: 'unauthorized' });

  const ip = String(req.query?.ip || '').trim();
  if (!net.isIP(ip)) return res.status(400).json({ error: 'IP inválido' });

  // 1) ip-api.com (só HTTP no plano grátis, por isso é chamado pelo servidor)
  try {
    const j = await buscar(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,regionName,city,isp,lat,lon`
    );
    if (j.status === 'success') {
      return res.status(200).json({
        ip, cidade: j.city, regiao: j.regionName, pais: j.country,
        provedor: j.isp, lat: j.lat, lon: j.lon,
      });
    }
    if (j.message?.includes('range')) {
      return res.status(200).json({ ip, erro: 'IP privado/reservado: sem localização' });
    }
  } catch { /* tenta o próximo */ }

  // 2) Fallback: ipwho.is (HTTPS)
  try {
    const j = await buscar(`https://ipwho.is/${encodeURIComponent(ip)}`);
    if (j.success) {
      return res.status(200).json({
        ip, cidade: j.city, regiao: j.region, pais: j.country,
        provedor: j.connection?.isp, lat: j.latitude, lon: j.longitude,
      });
    }
  } catch { /* cai no erro abaixo */ }

  res.status(200).json({ ip, erro: 'Não foi possível localizar este IP' });
}
