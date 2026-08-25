import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it, afterEach } from 'node:test';
import ts from 'typescript';

const sourceUrl = new URL('../../../api/ai.ts', import.meta.url);
const source = await readFile(sourceUrl, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const loadedModule = { exports: {} };
new Function('module', 'exports', compiled)(loadedModule, loadedModule.exports);
const handler = loadedModule.exports.default;

const originalFetch = globalThis.fetch;
const originalEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY
};

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    payload: undefined,
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name] = value; return this; },
    json(payload) { this.payload = payload; return this; },
    send(payload) { this.payload = payload; return this; }
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('authenticated Vercel AI proxy', () => {
  it('rejects unsupported methods and oversized requests', async () => {
    const methodResponse = responseRecorder();
    await handler({ method: 'GET', headers: {} }, methodResponse);
    assert.equal(methodResponse.statusCode, 405);

    const sizeResponse = responseRecorder();
    await handler({ method: 'POST', headers: { 'content-length': '256001' } }, sizeResponse);
    assert.equal(sizeResponse.statusCode, 413);
  });

  it('requires a valid Supabase session before provider access', async () => {
    process.env.SUPABASE_URL = 'https://staging.example';
    process.env.SUPABASE_ANON_KEY = 'publishable';
    globalThis.fetch = async () => new Response('{}', { status: 401 });
    const response = responseRecorder();
    await handler({ method: 'POST', headers: { authorization: 'Bearer invalid' }, body: {} }, response);
    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.payload, { error: 'Invalid session' });
  });

  it('allows only approved upstream paths and keeps the provider key server-side', async () => {
    process.env.SUPABASE_URL = 'https://staging.example';
    process.env.SUPABASE_ANON_KEY = 'publishable';
    process.env.GEMINI_API_KEY = 'server-secret';
    const calls = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith('/auth/v1/user')) return new Response('{"id":"user-1"}', { status: 200 });
      return new Response('{"models":[]}', { status: 200, headers: { 'content-type': 'application/json' } });
    };

    const blocked = responseRecorder();
    await handler({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      body: { provider: 'GEMINI', path: '/v1beta/evil', method: 'GET' }
    }, blocked);
    assert.equal(blocked.statusCode, 400);

    const allowed = responseRecorder();
    await handler({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      body: { provider: 'GEMINI', path: '/v1beta/models', method: 'GET' }
    }, allowed);
    assert.equal(allowed.statusCode, 200);
    assert.match(calls.at(-1).url, /generativelanguage\.googleapis\.com\/v1beta\/models\?key=server-secret/);
  });
});
