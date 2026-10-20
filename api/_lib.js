// Arquivos com "_" no início não viram rota na Vercel: é só um módulo auxiliar.
import { Redis } from '@upstash/redis';
import crypto from 'node:crypto';

// Aceita as variáveis injetadas pela integração Upstash (KV_REST_API_*)
// ou as nativas do Upstash (UPSTASH_REDIS_REST_*).
export const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

export function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'desconhecido'
  );
}

const b64 = (buf) => Buffer.from(buf).toString('base64url');

function assinar(payload) {
  return crypto
    .createHmac('sha256', process.env.ADMIN_TOKEN)
    .update(payload)
    .digest('base64url');
}

// Token com validade (12h), assinado com ADMIN_TOKEN. Não é um segredo fixo.
export function criarToken(horas = 12) {
  const payload = b64(JSON.stringify({ exp: Date.now() + horas * 3600 * 1000 }));
  return `${payload}.${assinar(payload)}`;
}

export function tokenValido(req) {
  if (!process.env.ADMIN_TOKEN) return false;
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const esperado = assinar(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

// Comparação de senha em tempo constante.
export function igual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
