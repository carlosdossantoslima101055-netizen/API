import { redis, getIp, criarToken, igual } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.ADMIN_SENHA || !process.env.ADMIN_TOKEN) {
    return res.status(500).json({ error: 'config' });
  }
  try {
    // Limite de tentativas: 5 por IP a cada 15 minutos.
    const chave = `login:${getIp(req)}`;
    const tentativas = await redis.incr(chave);
    if (tentativas === 1) await redis.expire(chave, 900);
    if (tentativas > 5) return res.status(429).json({ error: 'muitas tentativas' });

    const { senha } = req.body || {};
    if (typeof senha === 'string' && igual(senha, process.env.ADMIN_SENHA)) {
      await redis.del(chave);
      return res.status(200).json({ token: criarToken() });
    }
    res.status(401).json({ error: 'senha' });
  } catch (e) {
    console.error('login:', e);
    res.status(500).json({ error: 'erro' });
  }
}
