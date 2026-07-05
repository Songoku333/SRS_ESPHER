// ============================================================
// SRS Gestión · Ingesta automática desde SharePoint
// Edge Function de Supabase. Cada ejecución revisa las carpetas
// configuradas de SharePoint (vía Microsoft Graph), importa los
// Excel/CSV nuevos o modificados (facturas, extractos bancarios,
// gastos) con deduplicación, y registra los PDF como pendientes.
//
// Despliegue: Edge Functions → Deploy new function → nombre
// "ingesta" → pegar este fichero → desactivar "Verify JWT".
// Secrets necesarios (Edge Functions → Secrets):
//   MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET
//   SP_SITE                p. ej. "miempresa.sharepoint.com:/sites/Contabilidad"
//   SP_CARPETA_FACTURAS    p. ej. "Documentos compartidos/Contabilidad/Facturas"
//   SP_CARPETA_BANCO       p. ej. "Documentos compartidos/Contabilidad/Banco"
//   SP_CARPETA_GASTOS      (opcional)
// Programación: Dashboard → Integrations → Cron → cada hora →
// HTTP request a esta función con cabecera Authorization: Bearer <service_role>.
// ============================================================

interface Hoja {
  nombre: string;
  cabeceras: string[];
  filas: unknown[][];
}

interface Carpeta {
  ruta: string;
  tipo: 'facturas' | 'banco' | 'gastos';
}

interface Deps {
  url: string;
  serviceKey: string;
  tenant: string;
  client: string;
  secret: string;
  site: string;
  carpetas: Carpeta[];
  fetchFn: typeof fetch;
  parseWorkbook: (bytes: Uint8Array) => Promise<Hoja[]>;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const hoyIso = () => new Date().toISOString().slice(0, 10);

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ---------- REST de Supabase (service role) ----------
async function pg(deps: Deps, path: string): Promise<any[]> {
  const res = await deps.fetchFn(`${deps.url}/rest/v1/${path}`, {
    headers: { apikey: deps.serviceKey, Authorization: `Bearer ${deps.serviceKey}` },
  });
  if (!res.ok) throw new Error(`REST ${path}: ${res.status}`);
  return await res.json();
}

async function pgUpsert(deps: Deps, tabla: string, filas: unknown): Promise<void> {
  const res = await deps.fetchFn(`${deps.url}/rest/v1/${tabla}`, {
    method: 'POST',
    headers: {
      apikey: deps.serviceKey,
      Authorization: `Bearer ${deps.serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(filas),
  });
  if (!res.ok) throw new Error(`upsert ${tabla}: ${res.status} ${await res.text()}`);
}

// ---------- Microsoft Graph ----------
async function tokenGraph(deps: Deps): Promise<string> {
  const res = await deps.fetchFn(`https://login.microsoftonline.com/${deps.tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: deps.client,
      client_secret: deps.secret,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
    }).toString(),
  });
  if (!res.ok) throw new Error(`Autenticación con Microsoft fallida (${res.status}). Revisa MS_TENANT_ID/MS_CLIENT_ID/MS_CLIENT_SECRET.`);
  return (await res.json()).access_token;
}

async function graph(deps: Deps, tok: string, path: string): Promise<any> {
  const res = await deps.fetchFn(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${tok}` },
  });
  if (!res.ok) throw new Error(`Graph ${path}: ${res.status} ${await res.text()}`);
  return await res.json();
}

async function descargar(deps: Deps, tok: string, driveId: string, itemId: string): Promise<Uint8Array> {
  const res = await deps.fetchFn(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content`, {
    headers: { Authorization: `Bearer ${tok}` },
    redirect: 'manual',
  });
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get('location');
    if (!loc) throw new Error('Descarga sin destino');
    const r = await deps.fetchFn(loc);
    if (!r.ok) throw new Error(`Descarga: ${r.status}`);
    return new Uint8Array(await r.arrayBuffer());
  }
  if (res.ok) return new Uint8Array(await res.arrayBuffer());
  throw new Error(`Descarga: ${res.status}`);
}

// ---------- parsers (misma lógica que la app) ----------
function parseImporte(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v == null) return 0;
  let s = String(v).trim().replace(/[€\s]/g, '');
  if (!s) return 0;
  const coma = s.includes(','), punto = s.includes('.');
  if (coma && punto) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (coma) s = s.replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseFecha(v: unknown): string {
  if (v == null || v === '') return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return '';
}

function detectarColumna(cabeceras: string[], claves: string[]): number {
  const norm = cabeceras.map((c) => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  for (const clave of claves) {
    const i = norm.findIndex((c) => c.includes(clave));
    if (i !== -1) return i;
  }
  return -1;
}

function normalizaPct(v: number, base?: number): number {
  if (v > 0 && v < 1) return r2(v * 100);
  if (v > 30 && base && base > 0) return r2((v / base) * 100);
  return v;
}

function esCobrada(v: unknown): boolean {
  const s = String(v ?? '').toLowerCase();
  return s.includes('cobrad') || s.includes('pagad') || s === 'si' || s === 'sí' || s === 'x' || s === 'ok';
}

const CAMPOS = {
  facturas: {
    numero: ['numero', 'nº', 'num', 'factura', 'no.'],
    fecha: ['fecha', 'date', 'emision'],
    cliente: ['cliente', 'razon social', 'nombre', 'customer'],
    concepto: ['concepto', 'descripcion', 'detalle', 'objeto'],
    base: ['base', 'imponible', 'neto', 'subtotal'],
    ivaPct: ['% iva', 'iva %', 'tipo iva', 'iva'],
    irpfPct: ['irpf', 'retencion'],
    total: ['total', 'importe total'],
    estado: ['estado', 'cobrad', 'pagad', 'situacion'],
    fechaCobro: ['cobro', 'fecha pago'],
  },
  banco: {
    fecha: ['fecha', 'f. valor', 'date', 'valor'],
    concepto: ['concepto', 'descripcion', 'detalle', 'observaciones'],
    importe: ['importe', 'cantidad', 'monto', 'amount'],
  },
  gastos: {
    fecha: ['fecha', 'date'],
    proveedor: ['proveedor', 'acreedor', 'emisor', 'nombre'],
    concepto: ['concepto', 'descripcion', 'detalle'],
    base: ['base', 'imponible', 'neto'],
    ivaPct: ['% iva', 'iva %', 'iva'],
  },
} as const;

function mapear(hoja: Hoja, campos: Record<string, readonly string[]>): Record<string, number> {
  const m: Record<string, number> = {};
  for (const [clave, palabras] of Object.entries(campos)) {
    const i = detectarColumna(hoja.cabeceras, palabras as string[]);
    if (i !== -1) m[clave] = i;
  }
  return m;
}

function tipoMovimientoPorNombre(nombre: string): string {
  const n = nombre.toLowerCase();
  if (n.includes('tarjeta')) return 'tarjeta';
  if (n.includes('emitida')) return 'transferencia_emitida';
  if (n.includes('recibida')) return 'transferencia_recibida';
  return 'cuenta';
}

// ---------- contexto de importación (dedup + contactos) ----------
interface Ctx {
  numerosFactura: Set<string>;
  clavesMovimiento: Set<string>;
  clavesGasto: Set<string>;
  contactos: Map<string, string>; // nombre en minúsculas → id
  nuevos: { facturas: any[]; movimientos: any[]; gastos: any[]; contactos: any[] };
}

async function cargarCtx(deps: Deps): Promise<Ctx> {
  const [contactos, facturas, movimientos, gastos] = await Promise.all([
    pg(deps, 'contactos?select=data'),
    pg(deps, 'facturas?select=data'),
    pg(deps, 'movimientos?select=data'),
    pg(deps, 'gastos?select=data'),
  ]);
  const claveMov = (m: any) => `${m.fecha}|${Number(m.importe).toFixed(2)}|${String(m.concepto).toLowerCase().slice(0, 40)}`;
  const claveGasto = (g: any) => `${g.fecha}|${Number(g.base).toFixed(2)}|${String(g.concepto).toLowerCase().slice(0, 40)}`;
  return {
    numerosFactura: new Set(facturas.map((f: any) => String(f.data.numero).trim().toLowerCase())),
    clavesMovimiento: new Set(movimientos.map((m: any) => claveMov(m.data))),
    clavesGasto: new Set(gastos.map((g: any) => claveGasto(g.data))),
    contactos: new Map(contactos.map((c: any) => [String(c.data.nombre).trim().toLowerCase(), c.data.id])),
    nuevos: { facturas: [], movimientos: [], gastos: [], contactos: [] },
  };
}

function contactoId(ctx: Ctx, nombre: string, tipo: string): string {
  const clave = nombre.trim().toLowerCase();
  const existente = ctx.contactos.get(clave);
  if (existente) return existente;
  const c = { id: uid(), tipo, nombre: nombre.trim() };
  ctx.contactos.set(clave, c.id);
  ctx.nuevos.contactos.push(c);
  return c.id;
}

// ---------- importadores ----------
function importarHojas(tipo: Carpeta['tipo'], nombreFichero: string, hojas: Hoja[], ctx: Ctx): { filas: number; omitidas: number } {
  let filas = 0, omitidas = 0;
  for (const hoja of hojas) {
    const m = mapear(hoja, CAMPOS[tipo]);
    const celda = (fila: unknown[], clave: string) => (m[clave] !== undefined ? fila[m[clave]] : undefined);

    if (tipo === 'facturas') {
      if (m.numero === undefined || m.fecha === undefined || m.cliente === undefined || m.base === undefined) continue;
      for (const fila of hoja.filas) {
        const numero = String(celda(fila, 'numero') ?? '').trim();
        const fecha = parseFecha(celda(fila, 'fecha'));
        const cliente = String(celda(fila, 'cliente') ?? '').trim();
        const base = parseImporte(celda(fila, 'base'));
        if (!numero || !fecha || !cliente || !base || ctx.numerosFactura.has(numero.toLowerCase())) { omitidas++; continue; }
        ctx.numerosFactura.add(numero.toLowerCase());
        const ivaPct = m.ivaPct !== undefined ? normalizaPct(parseImporte(celda(fila, 'ivaPct')), base) : 21;
        const irpfPct = m.irpfPct !== undefined ? normalizaPct(parseImporte(celda(fila, 'irpfPct')), base) : 0;
        const totalLeido = m.total !== undefined ? parseImporte(celda(fila, 'total')) : 0;
        const total = totalLeido || r2(base * (1 + ivaPct / 100 - irpfPct / 100));
        const cobrada = m.estado !== undefined && esCobrada(celda(fila, 'estado'));
        const fechaCobro = parseFecha(celda(fila, 'fechaCobro'));
        ctx.nuevos.facturas.push({
          id: uid(), numero, fecha,
          clienteId: contactoId(ctx, cliente, 'cliente'),
          concepto: String(celda(fila, 'concepto') ?? '').trim(),
          base, ivaPct, irpfPct, total,
          estado: cobrada || fechaCobro ? 'cobrada' : 'emitida',
          fechaCobro: cobrada || fechaCobro ? fechaCobro || fecha : undefined,
        });
        filas++;
      }
    } else if (tipo === 'banco') {
      if (m.fecha === undefined || m.concepto === undefined || m.importe === undefined) continue;
      const tipoMov = tipoMovimientoPorNombre(nombreFichero);
      for (const fila of hoja.filas) {
        const fecha = parseFecha(celda(fila, 'fecha'));
        const concepto = String(celda(fila, 'concepto') ?? '').trim();
        const importe = parseImporte(celda(fila, 'importe'));
        if (!fecha || !concepto || importe === 0) { omitidas++; continue; }
        const clave = `${fecha}|${importe.toFixed(2)}|${concepto.toLowerCase().slice(0, 40)}`;
        if (ctx.clavesMovimiento.has(clave)) { omitidas++; continue; }
        ctx.clavesMovimiento.add(clave);
        ctx.nuevos.movimientos.push({
          id: uid(), fecha, concepto, importe, tipo: tipoMov,
          cuenta: nombreFichero.replace(/\.[^.]+$/, ''),
        });
        filas++;
      }
    } else {
      if (m.fecha === undefined || m.concepto === undefined || m.base === undefined) continue;
      for (const fila of hoja.filas) {
        const fecha = parseFecha(celda(fila, 'fecha'));
        const concepto = String(celda(fila, 'concepto') ?? '').trim();
        const base = parseImporte(celda(fila, 'base'));
        if (!fecha || !concepto || !base) { omitidas++; continue; }
        const clave = `${fecha}|${base.toFixed(2)}|${concepto.toLowerCase().slice(0, 40)}`;
        if (ctx.clavesGasto.has(clave)) { omitidas++; continue; }
        ctx.clavesGasto.add(clave);
        const ivaPct = m.ivaPct !== undefined ? normalizaPct(parseImporte(celda(fila, 'ivaPct')), base) : 21;
        const proveedor = String(celda(fila, 'proveedor') ?? '').trim();
        ctx.nuevos.gastos.push({
          id: uid(), fecha,
          contactoId: proveedor ? contactoId(ctx, proveedor, 'proveedor') : undefined,
          concepto, categoria: 'Otros', base, ivaPct,
          total: r2(base * (1 + ivaPct / 100)),
          estado: 'pagado', fechaPago: fecha,
        });
        filas++;
      }
    }
  }
  return { filas, omitidas };
}

// ---------- proceso principal ----------
export async function procesar(deps: Deps): Promise<any> {
  const tok = await tokenGraph(deps);
  const site = await graph(deps, tok, `/sites/${deps.site}`);
  const drive = await graph(deps, tok, `/sites/${site.id}/drive`);

  const registroFilas = await pg(deps, 'ingesta_ficheros?select=id,etag');
  const registro = new Map(registroFilas.map((r: any) => [r.id, r.etag]));

  const ctx = await cargarCtx(deps);
  const resumen: any[] = [];
  const registrosNuevos: any[] = [];

  for (const carpeta of deps.carpetas) {
    let items: any[];
    try {
      const res = await graph(
        deps, tok,
        `/drives/${drive.id}/root:/${carpeta.ruta.split('/').map(encodeURIComponent).join('/')}:/children?$select=id,name,eTag,file,size`
      );
      items = (res.value || []).filter((i: any) => i.file);
    } catch (e) {
      resumen.push({ carpeta: carpeta.ruta, error: (e as Error).message });
      continue;
    }

    for (const item of items) {
      if (registro.get(item.id) === item.eTag) continue; // sin cambios
      const ext = (item.name.split('.').pop() || '').toLowerCase();
      let estado = 'ignorado', filas = 0, mensaje = `Extensión .${ext} no soportada`;
      try {
        if (['xlsx', 'xls', 'csv', 'ods'].includes(ext)) {
          const bytes = await descargar(deps, tok, drive.id, item.id);
          const hojas = await deps.parseWorkbook(bytes);
          const r = importarHojas(carpeta.tipo, item.name, hojas, ctx);
          estado = 'importado';
          filas = r.filas;
          mensaje = `${r.filas} filas nuevas · ${r.omitidas} omitidas (duplicadas o incompletas)`;
        } else if (ext === 'pdf') {
          estado = 'pdf_pendiente';
          mensaje = 'PDF registrado. Procésalo con Claude + MCP (o actívese Document Intelligence).';
        }
      } catch (e) {
        estado = 'error';
        mensaje = (e as Error).message;
      }
      registrosNuevos.push({
        id: item.id, nombre: item.name, carpeta: carpeta.ruta, etag: item.eTag,
        estado, filas, mensaje, procesado_at: new Date().toISOString(),
      });
      resumen.push({ fichero: item.name, carpeta: carpeta.ruta, estado, filas, mensaje });
    }
  }

  // Insertar todo lo importado (contactos primero para respetar referencias lógicas)
  const ahora = new Date().toISOString();
  const filaDb = (item: any) => ({ id: item.id, data: item, updated_at: ahora });
  if (ctx.nuevos.contactos.length) await pgUpsert(deps, 'contactos', ctx.nuevos.contactos.map(filaDb));
  if (ctx.nuevos.facturas.length) await pgUpsert(deps, 'facturas', ctx.nuevos.facturas.map(filaDb));
  if (ctx.nuevos.movimientos.length) await pgUpsert(deps, 'movimientos', ctx.nuevos.movimientos.map(filaDb));
  if (ctx.nuevos.gastos.length) await pgUpsert(deps, 'gastos', ctx.nuevos.gastos.map(filaDb));
  if (registrosNuevos.length) await pgUpsert(deps, 'ingesta_ficheros', registrosNuevos);

  return {
    ejecutado: ahora,
    ficherosProcesados: resumen.length,
    importado: {
      facturas: ctx.nuevos.facturas.length,
      movimientos: ctx.nuevos.movimientos.length,
      gastos: ctx.nuevos.gastos.length,
      contactos: ctx.nuevos.contactos.length,
    },
    detalle: resumen,
  };
}

// ---------- handler HTTP ----------
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export async function handleIngesta(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const auth = req.headers.get('authorization') || '';
  if (auth !== `Bearer ${deps.serviceKey}`) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
  try {
    const resultado = await procesar(deps);
    return new Response(JSON.stringify(resultado, null, 2), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
}

// ---------- arranque en Supabase Edge Runtime (Deno) ----------
declare const Deno: any;
if (typeof Deno !== 'undefined' && Deno?.serve) {
  let xlsxMod: any;
  const parseWorkbook = async (bytes: Uint8Array): Promise<Hoja[]> => {
    xlsxMod ||= await import('npm:xlsx@0.18.5');
    // raw:true evita que las fechas de los CSV se interpreten al estilo americano
    const wb = xlsxMod.read(bytes, { type: 'array', raw: true });
    return wb.SheetNames.map((nombre: string) => {
      const matriz: unknown[][] = xlsxMod.utils.sheet_to_json(wb.Sheets[nombre], { header: 1, defval: '', blankrows: false });
      let idx = 0;
      for (let i = 0; i < Math.min(matriz.length, 15); i++) {
        const textos = matriz[i].filter((c) => typeof c === 'string' && (c as string).trim() !== '');
        if (textos.length >= 2) { idx = i; break; }
      }
      return {
        nombre,
        cabeceras: (matriz[idx] || []).map((c) => String(c ?? '').trim()),
        filas: matriz.slice(idx + 1).filter((f) => f.some((c) => c !== '' && c != null)),
      };
    });
  };
  const env = (k: string) => Deno.env.get(k) || '';
  const carpetas: Carpeta[] = [];
  if (env('SP_CARPETA_FACTURAS')) carpetas.push({ ruta: env('SP_CARPETA_FACTURAS'), tipo: 'facturas' });
  if (env('SP_CARPETA_BANCO')) carpetas.push({ ruta: env('SP_CARPETA_BANCO'), tipo: 'banco' });
  if (env('SP_CARPETA_GASTOS')) carpetas.push({ ruta: env('SP_CARPETA_GASTOS'), tipo: 'gastos' });
  Deno.serve((req: Request) =>
    handleIngesta(req, {
      url: env('SUPABASE_URL'),
      serviceKey: env('SUPABASE_SERVICE_ROLE_KEY'),
      tenant: env('MS_TENANT_ID'),
      client: env('MS_CLIENT_ID'),
      secret: env('MS_CLIENT_SECRET'),
      site: env('SP_SITE'),
      carpetas,
      fetchFn: fetch,
      parseWorkbook,
    })
  );
}
