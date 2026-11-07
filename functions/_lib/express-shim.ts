// Adapter minimal: menjalankan handler gaya Express (req, res) di Cloudflare Pages Functions.
type Handler = (req: any, res: any) => any;

export function createApp() {
  const routes = new Map<string, Handler>();
  return {
    routes,
    use() {},
    get(path: string, h: Handler) { routes.set(`GET ${path}`, h); },
    post(path: string, h: Handler) { routes.set(`POST ${path}`, h); },
    put(path: string, h: Handler) { routes.set(`PUT ${path}`, h); },
  };
}

export async function dispatch(app: ReturnType<typeof createApp>, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const handler = app.routes.get(`${request.method} ${url.pathname}`);
  if (!handler) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  let body: any = {};
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
  const req = { body, headers, query: Object.fromEntries(url.searchParams), method: request.method };

  let statusCode = 200;
  let payload: BodyInit | null = null;
  const outHeaders = new Headers();
  const res: any = {
    status(n: number) { statusCode = n; return res; },
    setHeader(k: string, v: string) { outHeaders.set(k, v); return res; },
    json(o: unknown) {
      outHeaders.set('Content-Type', 'application/json; charset=utf-8');
      payload = JSON.stringify(o);
      return res;
    },
    send(s: any) {
      payload = typeof s === 'string' ? s : JSON.stringify(s);
      return res;
    },
  };

  try {
    await handler(req, res);
  } catch (err: any) {
    console.error('API error:', err);
    return Response.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
  if (payload === null) {
    return Response.json({ error: 'Handler tidak mengirim respons' }, { status: 500 });
  }
  return new Response(payload, { status: statusCode, headers: outHeaders });
}
