const MAX_REQUEST_BYTES = 256_000;
const ALLOWED_GEMINI_PATH = /^\/v1beta\/models(?:\/[-\w.]+:generateContent)?$/;
const ALLOWED_GROQ_PATH = /^\/openai\/v1\/(models|chat\/completions)$/;

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  const rawLength = Number(request.headers['content-length'] || 0);
  if (rawLength > MAX_REQUEST_BYTES) return response.status(413).json({ error: 'AI request is too large' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const authorization = request.headers.authorization || '';
  if (!supabaseUrl || !supabaseAnonKey || !authorization.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'Authentication required' });
  }
  let userCheck: Response;
  try {
    userCheck = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: supabaseAnonKey, Authorization: authorization } });
  } catch {
    return response.status(503).json({ error: 'Authentication service unavailable' });
  }
  if (!userCheck.ok) return response.status(401).json({ error: 'Invalid session' });

  const { provider, path, method = 'GET', body } = request.body || {};
  if (!['GET', 'POST'].includes(method)) return response.status(400).json({ error: 'Unsupported provider method' });
  if (body && new TextEncoder().encode(JSON.stringify(body)).byteLength > MAX_REQUEST_BYTES) {
    return response.status(413).json({ error: 'AI request is too large' });
  }
  let upstreamUrl = '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (provider === 'GEMINI' && ALLOWED_GEMINI_PATH.test(path || '')) {
    if (!process.env.GEMINI_API_KEY) return response.status(503).json({ error: 'Gemini is not configured' });
    upstreamUrl = `https://generativelanguage.googleapis.com${path}?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  } else if (provider === 'GROQ' && ALLOWED_GROQ_PATH.test(path || '')) {
    if (!process.env.GROQ_API_KEY) return response.status(503).json({ error: 'Groq is not configured' });
    upstreamUrl = `https://api.groq.com${path}`;
    headers.Authorization = `Bearer ${process.env.GROQ_API_KEY}`;
  } else {
    return response.status(400).json({ error: 'Unsupported provider request' });
  }

  const expectsPost = path.endsWith(':generateContent') || path.endsWith('/chat/completions');
  if ((expectsPost && method !== 'POST') || (!expectsPost && method !== 'GET')) {
    return response.status(400).json({ error: 'Method is not valid for this provider path' });
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, { method, headers, body: method === 'GET' ? undefined : JSON.stringify(body || {}) });
  } catch {
    return response.status(502).json({ error: 'AI provider unavailable' });
  }
  const text = await upstream.text();
  response.status(upstream.status).setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json').send(text);
}
