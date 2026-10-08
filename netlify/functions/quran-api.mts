export default async (req: Request, context: any) => {
  const slug = context?.params?.splat || "default";
  const url = new URL(req.url);
  const body = {
    success: true,
    message: "Succes",
    service: "Murotal Qur'an API",
    endpoint: `/v1/${slug}`,
    method: req.method,
    query: Object.fromEntries(url.searchParams.entries()),
    data: null
  };
  const acceptsHtml = (req.headers.get("accept") || "").includes("text/html");
  if (acceptsHtml) {
    return new Response(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Murotal Qur'an API</title><style>body{margin:0;background:#050807;color:#fff;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh}main{text-align:center}h1{font-size:28px}button{border:0;background:#101915;color:#fff;border-radius:10px;padding:10px 14px}small{display:block;color:#8ba39a;margin-top:12px}</style></head><body><main><h1>Succes</h1><button>▢</button><small>Murotal Qur'an API • ${slug}</small></main></body></html>`, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  }
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
};

export const config = { path: "/v1/*" };
