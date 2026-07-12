// ============================================================
// SRS Gestión · Subir documento de oferta a SharePoint
// Edge Function de Supabase. Recibe el HTML de una oferta y lo
// guarda en la carpeta de ofertas de SharePoint (vía Microsoft
// Graph, con las mismas credenciales que la ingesta).
//
// Despliegue: Edge Functions → Deploy new function → nombre
// "subir-oferta" → pegar este fichero → dejar "Verify JWT" ACTIVADO
// (solo usuarios con sesión de la app pueden llamarla).
// Secrets (compartidos con la ingesta):
//   MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, SP_SITE
//   SP_BIBLIOTECA        (opcional) biblioteca de documentos
//   SP_CARPETA_OFERTAS   (opcional) carpeta destino; por defecto "Ofertas SRS"
// NOTA: el registro de aplicación necesita el permiso Graph
// Sites.ReadWrite.All (la ingesta funciona con Sites.Read.All).
// ============================================================

declare const Deno: any;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const env = (k: string) => (Deno.env.get(k) || '').trim();

async function tokenGraph(): Promise<string> {
  const res = await fetch(`https://login.microsoftonline.com/${env('MS_TENANT_ID')}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('MS_CLIENT_ID'),
      client_secret: env('MS_CLIENT_SECRET'),
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
    }).toString(),
  });
  if (!res.ok) throw new Error(`Autenticación con Microsoft fallida (${res.status}).`);
  return (await res.json()).access_token;
}

async function graph(tok: string, path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${tok}`, ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`Graph ${path}: ${res.status} ${await res.text()}`);
  return await res.json();
}

async function elegirDrive(tok: string, siteId: string): Promise<any> {
  const biblioteca = env('SP_BIBLIOTECA');
  if (!biblioteca) return await graph(tok, `/sites/${siteId}/drive`);
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const res = await graph(tok, `/sites/${siteId}/drives?$select=id,name`);
  const drive = (res.value || []).find((d: any) => norm(d.name) === norm(biblioteca));
  if (!drive) throw new Error(`Biblioteca "${biblioteca}" no encontrada.`);
  return drive;
}

function limpiarNombre(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\\/:*?"<>|#%]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
  try {
    const { nombre, html } = await req.json();
    if (!nombre || !html) return json({ error: 'Faltan "nombre" o "html".' }, 400);
    if (String(html).length > 3_000_000) return json({ error: 'Documento demasiado grande.' }, 413);

    const tok = await tokenGraph();
    const site = await graph(tok, `/sites/${env('SP_SITE')}`);
    const drive = await elegirDrive(tok, site.id);
    const carpeta = (env('SP_CARPETA_OFERTAS') || 'Ofertas SRS').replace(/^\/+|\/+$/g, '');
    const fichero = limpiarNombre(String(nombre)).replace(/\.html?$/i, '') + '.html';
    const ruta = `${carpeta}/${fichero}`.split('/').map(encodeURIComponent).join('/');

    const item = await graph(tok, `/drives/${drive.id}/root:/${ruta}:/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/html' },
      body: String(html),
    });
    return json({ ok: true, nombre: fichero, carpeta, webUrl: item.webUrl });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
