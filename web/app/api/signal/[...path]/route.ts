/**
 * Generic pass-through proxy to the signal backend.
 *
 * Browser-side code can call:
 *   fetch('/api/signal/tasks/t-abc1234/state', { method: 'POST', body: ... })
 * and this route forwards to ${SIGNAL_API_URL}/api/tasks/t-abc1234/state
 * with the x-api-key header injected server-side — the key never reaches
 * the browser.
 */

const API_URL = process.env.SIGNAL_API_URL;
const API_KEY = process.env.SIGNAL_API_KEY;

async function proxy(
  req: Request,
  method: "GET" | "POST" | "DELETE",
  path: string[],
): Promise<Response> {
  if (!API_URL || !API_KEY) {
    return Response.json(
      { error: "signal backend not configured" },
      { status: 503 },
    );
  }
  const target = `${API_URL}/api/${path.join("/")}`;
  const body = method === "GET" || method === "DELETE" ? undefined : await req.text();
  const upstream = await fetch(target, {
    method,
    headers: {
      "x-api-key": API_KEY,
      "content-type": "application/json",
    },
    body,
  });
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
    },
  });
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, "GET", path);
}

export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, "POST", path);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, "DELETE", path);
}
