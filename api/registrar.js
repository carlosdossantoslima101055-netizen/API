import { redis, getIp } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const ip = getIp(req);

    // Anti-flood: no máximo 1 registro por IP a cada 60s.
    const novo = await redis.set(`visto:${ip}`, 1, { nx: true, ex: 60 });
    if (novo) {
      const horario = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      await redis.lpush('acessos', JSON.stringify({ ip, horario }));
      await redis.ltrim('acessos', 0, 999);
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('registrar:', e);
    res.status(500).json({ error: 'erro' });
  }
}
