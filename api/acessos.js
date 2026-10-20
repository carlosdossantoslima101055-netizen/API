import { redis, tokenValido } from './_lib.js';

export default async function handler(req, res) {
  if (!tokenValido(req)) return res.status(401).json({ error: 'unauthorized' });
  try {
    const lista = await redis.lrange('acessos', 0, 999);
    const dados = lista
      .map((s) => {
        if (typeof s !== 'string') return s; // o SDK já pode devolver objeto
        try { return JSON.parse(s); } catch { return null; }
      })
      .filter(Boolean);
    res.status(200).json(dados);
  } catch (e) {
    console.error('acessos:', e);
    res.status(500).json({ error: 'erro' });
  }
}
