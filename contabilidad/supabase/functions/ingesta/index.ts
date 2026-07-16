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
//   SP_SITE                p. ej. "miempresa.sharepoint.com:/sites/CEO"
//   SP_BIBLIOTECA          (opcional) nombre de la biblioteca de documentos si
//                          no es la estándar, p. ej. "EasyREM CORE"
//   SP_CARPETA_FACTURAS    ruta de carpeta O de un fichero concreto dentro de
//                          la biblioteca, p. ej. "09_FINANZAS/00_MASTER/base.xlsx"
//   SP_CARPETA_BANCO       p. ej. "09_FINANZAS/01 Bancos"
//   SP_CARPETA_GASTOS      (opcional)
// Cada SP_CARPETA_* admite varias rutas separadas por ";". Las carpetas se
// recorren con sus subcarpetas (se ignoran las llamadas old/antiguo/backup).
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
  biblioteca?: string;
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
  const norm = cabeceras.map((c) => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());
  // Prioridad: coincidencia exacta > empieza por > contiene. As\u00ed "Proveedor" o
  // "Emisor / proveedor" ganan a "N\u00ba factura proveedor".
  const tests: ((c: string, k: string) => boolean)[] = [
    (c, k) => c === k,
    (c, k) => c.startsWith(k),
    (c, k) => c.includes(k),
  ];
  for (const test of tests) {
    for (const clave of claves) {
      const i = norm.findIndex((c) => test(c, clave));
      if (i !== -1) return i;
    }
  }
  return -1;
}

// \u00bfEl texto parece un nombre (persona/empresa) y no una referencia tipo "FA-009-603" o "2026/16"?
function pareceNombre(s: string): boolean {
  return /[a-z\u00f1]{3,}/i.test(s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
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
    fecha: ['fecha factura', 'fecha', 'date'],
    proveedor: ['emisor / proveedor', 'emisor', 'proveedor', 'acreedor', 'nombre'],
    concepto: ['concepto', 'descripcion', 'detalle'],
    base: ['base imponible', 'base', 'imponible', 'neto', 'importe'],
    ivaPct: ['% iva', 'iva %', 'iva'],
    total: ['total', 'importe total'],
    tipoGasto: ['tipo gasto', 'tipo de gasto'],
    facturaAsociada: ['factura srs asociada', 'factura srs', 'factura asociada'],
    numeroProveedor: ['n factura proveedor', 'numero factura proveedor', 'factura proveedor'],
    cif: ['cif/nif', 'cif', 'nif'],
  },
} as const;

// Mapea el texto de la columna "Tipo gasto" del Excel a nuestras categorías.
function categoriaPorTexto(texto: string): string | undefined {
  const n = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (!n) return undefined;
  if (n.includes('subcontrat')) return 'Subcontratación / Ingeniería externa';
  if (n.includes('colaborador')) return 'Colaboradores';
  if (n.includes('oca') || n.includes('inspecc')) return 'OCA / Inspecciones';
  if (n.includes('visado') || n.includes('colegio')) return 'Visados y colegios';
  if (n.includes('tasa') || n.includes('licencia')) return 'Tasas y licencias administrativas';
  if (n.includes('desplaza') || n.includes('dieta') || n.includes('visita') || n.includes('viaje')) return 'Desplazamientos y dietas';
  if (n.includes('software')) return 'Software y licencias';
  if (n.includes('seguro')) return 'Seguros (RC, decenal)';
  if (n.includes('alquiler') || n.includes('equipo') || n.includes('material')) return 'Material y equipos';
  if (n.includes('suministro') || n.includes('oficina')) return 'Suministros y oficina';
  if (n.includes('impuesto')) return 'Impuestos';
  return undefined;
}

function mapear(hoja: Hoja, campos: Record<string, readonly string[]>): Record<string, number> {
  const m: Record<string, number> = {};
  for (const [clave, palabras] of Object.entries(campos)) {
    const i = detectarColumna(hoja.cabeceras, palabras as string[]);
    if (i !== -1) m[clave] = i;
  }
  return m;
}

// Deduce el tipo de movimiento de la ruta (subcarpetas + nombre del fichero).
// Si la ruta solo dice "transferencias", el signo del importe decide el sentido.
function tipoMovimiento(ruta: string, importe: number): string {
  const n = ruta.toLowerCase();
  if (n.includes('tarjeta')) return 'tarjeta';
  if (n.includes('emitida')) return 'transferencia_emitida';
  if (n.includes('recibida')) return 'transferencia_recibida';
  if (n.includes('transferencia')) return importe < 0 ? 'transferencia_emitida' : 'transferencia_recibida';
  return 'cuenta';
}

// Sugiere la categoría de gasto según la carpeta donde vive el fichero.
function categoriaPorRuta(ruta: string): string {
  const n = ruta.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('subcontrat')) return 'Subcontratación / Ingeniería externa';
  if (n.includes('colaborador')) return 'Colaboradores';
  if (/\bocas?\b/.test(n) || n.includes('inspecc')) return 'OCA / Inspecciones';
  if (n.includes('colegio') || n.includes('visado')) return 'Visados y colegios';
  if (n.includes('visita') || n.includes('desplaza') || n.includes('dieta') || n.includes('viaje')) return 'Desplazamientos y dietas';
  if (n.includes('software')) return 'Software y licencias';
  if (n.includes('tasa') || n.includes('licencia')) return 'Tasas y licencias administrativas';
  if (n.includes('seguro')) return 'Seguros (RC, decenal)';
  if (n.includes('alquiler') || n.includes('equipo') || n.includes('material')) return 'Material y equipos';
  if (n.includes('suministro') || n.includes('oficina')) return 'Suministros y oficina';
  if (n.includes('impuesto')) return 'Impuestos';
  return 'Otros';
}

// ---------- contexto de importación (dedup + contactos) ----------
interface Ctx {
  numerosFactura: Set<string>;
  clavesMovimiento: Set<string>;
  clavesGasto: Set<string>;
  contactos: Map<string, string>; // nombre en minúsculas → id
  facturasPorNumero: Map<string, string>; // nº factura SRS en minúsculas → id de factura
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
    facturasPorNumero: new Map(facturas.map((f: any) => [normNumFactura(String(f.data.numero)), f.data.id])),
    nuevos: { facturas: [], movimientos: [], gastos: [], contactos: [] },
  };
}

// Normaliza un nº de factura SRS para casarlo: "2026000005", "2026/000005",
// espacios… → solo dígitos si es puramente numérico.
function normNumFactura(s: string): string {
  const limpio = s.trim().toLowerCase();
  const soloDigitos = limpio.replace(/[^0-9]/g, '');
  return soloDigitos.length >= 6 ? soloDigitos : limpio;
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
// "ruta" es la ruta relativa dentro de la carpeta configurada (subcarpetas
// incluidas), y sirve para deducir tipo de movimiento y categoría de gasto.
function importarHojas(tipo: Carpeta['tipo'], ruta: string, hojas: Hoja[], ctx: Ctx): { filas: number; omitidas: number } {
  const nombreFichero = ruta.split('/').pop() || ruta;
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
        const idFactura = uid();
        const ivaPct = m.ivaPct !== undefined ? normalizaPct(parseImporte(celda(fila, 'ivaPct')), base) : 21;
        const irpfPct = m.irpfPct !== undefined ? normalizaPct(parseImporte(celda(fila, 'irpfPct')), base) : 0;
        const totalLeido = m.total !== undefined ? parseImporte(celda(fila, 'total')) : 0;
        const total = totalLeido || r2(base * (1 + ivaPct / 100 - irpfPct / 100));
        const cobrada = m.estado !== undefined && esCobrada(celda(fila, 'estado'));
        const fechaCobro = parseFecha(celda(fila, 'fechaCobro'));
        ctx.facturasPorNumero.set(normNumFactura(numero), idFactura);
        ctx.nuevos.facturas.push({
          id: idFactura, numero, fecha,
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
      for (const fila of hoja.filas) {
        const fecha = parseFecha(celda(fila, 'fecha'));
        const concepto = String(celda(fila, 'concepto') ?? '').trim();
        const importe = parseImporte(celda(fila, 'importe'));
        if (!fecha || !concepto || importe === 0) { omitidas++; continue; }
        const clave = `${fecha}|${importe.toFixed(2)}|${concepto.toLowerCase().slice(0, 40)}`;
        if (ctx.clavesMovimiento.has(clave)) { omitidas++; continue; }
        ctx.clavesMovimiento.add(clave);
        ctx.nuevos.movimientos.push({
          id: uid(), fecha, concepto, importe, tipo: tipoMovimiento(ruta, importe),
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
        // Proveedor: solo lo tomamos si parece un nombre (no una referencia de factura)
        const provRaw = String(celda(fila, 'proveedor') ?? '').trim();
        const proveedor = pareceNombre(provRaw) ? provRaw : '';
        // Categoría: primero la columna "Tipo gasto" del Excel; si no, la carpeta
        const categoria = categoriaPorTexto(String(celda(fila, 'tipoGasto') ?? '')) || categoriaPorRuta(ruta);
        // Enlace a la factura SRS asociada (para la cascada de liquidación)
        const numFacturaRaw = String(celda(fila, 'facturaAsociada') ?? '').trim();
        const facturaId = numFacturaRaw ? ctx.facturasPorNumero.get(normNumFactura(numFacturaRaw)) : undefined;
        const numeroProveedor = String(celda(fila, 'numeroProveedor') ?? '').trim() || undefined;
        const cif = String(celda(fila, 'cif') ?? '').trim() || undefined;
        const totalLeido = m.total !== undefined ? parseImporte(celda(fila, 'total')) : 0;
        ctx.nuevos.gastos.push({
          id: uid(), fecha,
          contactoId: proveedor ? contactoId(ctx, proveedor, 'proveedor') : undefined,
          concepto, categoria, base, ivaPct,
          total: totalLeido || r2(base * (1 + ivaPct / 100)),
          facturaId, numeroProveedor, cif,
          estado: 'pagado', fechaPago: fecha,
        });
        filas++;
      }
    }
  }
  return { filas, omitidas };
}

// ---------- localización de ficheros en SharePoint ----------
// Elige la biblioteca de documentos: la estándar del sitio o, si se configuró
// SP_BIBLIOTECA, la que tenga ese nombre (p. ej. "EasyREM CORE").
async function elegirDrive(deps: Deps, tok: string, siteId: string): Promise<any> {
  if (!deps.biblioteca) return await graph(deps, tok, `/sites/${siteId}/drive`);
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const res = await graph(deps, tok, `/sites/${siteId}/drives?$select=id,name`);
  const drive = (res.value || []).find((d: any) => norm(d.name) === norm(deps.biblioteca!));
  if (!drive) {
    const nombres = (res.value || []).map((d: any) => d.name).join(', ') || '(ninguna)';
    throw new Error(`Biblioteca "${deps.biblioteca}" no encontrada en el sitio. Disponibles: ${nombres}`);
  }
  return drive;
}

const CARPETAS_IGNORADAS = /\b(old|antiguos?|antiguas?|backups?|copias?|papelera|borradores)\b/i;

// Lista los ficheros de una ruta. Si la ruta apunta a un fichero, devuelve solo
// ese. Si es una carpeta, la recorre con sus subcarpetas (hasta 4 niveles),
// ignorando las de nombre old/antiguo/backup/copia, y siguiendo la paginación.
async function listarFicheros(deps: Deps, tok: string, driveId: string, ruta: string): Promise<{ item: any; ruta: string }[]> {
  const codificada = ruta.split('/').map(encodeURIComponent).join('/');
  const raiz = await graph(deps, tok, `/drives/${driveId}/root:/${codificada}`);
  if (raiz.file) return [{ item: raiz, ruta: raiz.name }];
  const ficheros: { item: any; ruta: string }[] = [];
  const pendientes = [{ id: raiz.id as string, ruta: '', nivel: 0 }];
  while (pendientes.length) {
    const dir = pendientes.shift()!;
    let path = `/drives/${driveId}/items/${dir.id}/children?$select=id,name,eTag,file,folder&$top=200`;
    while (path) {
      const res = await graph(deps, tok, path);
      for (const item of res.value || []) {
        const rutaItem = dir.ruta ? `${dir.ruta}/${item.name}` : item.name;
        if (item.file) ficheros.push({ item, ruta: rutaItem });
        else if (item.folder && dir.nivel < 4 && !CARPETAS_IGNORADAS.test(item.name)) {
          pendientes.push({ id: item.id, ruta: rutaItem, nivel: dir.nivel + 1 });
        }
      }
      const next = res['@odata.nextLink'];
      path = next ? String(next).replace('https://graph.microsoft.com/v1.0', '') : '';
    }
  }
  return ficheros;
}

// ---------- proceso principal ----------
export async function procesar(deps: Deps): Promise<any> {
  const tok = await tokenGraph(deps);
  const site = await graph(deps, tok, `/sites/${deps.site}`);
  const drive = await elegirDrive(deps, tok, site.id);

  const registroFilas = await pg(deps, 'ingesta_ficheros?select=id,etag');
  const registro = new Map(registroFilas.map((r: any) => [r.id, r.etag]));

  const ctx = await cargarCtx(deps);
  const resumen: any[] = [];
  const registrosNuevos: any[] = [];

  for (const carpeta of deps.carpetas) {
    let ficheros: { item: any; ruta: string }[];
    try {
      ficheros = await listarFicheros(deps, tok, drive.id, carpeta.ruta);
    } catch (e) {
      resumen.push({ carpeta: carpeta.ruta, error: (e as Error).message });
      continue;
    }

    for (const { item, ruta } of ficheros) {
      if (registro.get(item.id) === item.eTag) continue; // sin cambios
      const ext = (item.name.split('.').pop() || '').toLowerCase();
      let estado = 'ignorado', filas = 0, mensaje = `Extensión .${ext} no soportada`;
      try {
        if (['xlsx', 'xls', 'csv', 'ods'].includes(ext)) {
          const bytes = await descargar(deps, tok, drive.id, item.id);
          const hojas = await deps.parseWorkbook(bytes);
          const r = importarHojas(carpeta.tipo, ruta, hojas, ctx);
          estado = 'importado';
          filas = r.filas;
          mensaje = `${r.filas} filas nuevas · ${r.omitidas} omitidas (duplicadas o incompletas)`;
        } else if (ext === 'pdf') {
          estado = 'pdf_pendiente';
          mensaje = carpeta.tipo === 'gastos'
            ? `PDF registrado (categoría sugerida: ${categoriaPorRuta(ruta)}). Procésalo con Claude + MCP.`
            : 'PDF registrado. Procésalo con Claude + MCP (o actívese Document Intelligence).';
        }
      } catch (e) {
        estado = 'error';
        mensaje = (e as Error).message;
      }
      registrosNuevos.push({
        id: item.id, nombre: ruta, carpeta: carpeta.ruta, etag: item.eTag,
        estado, filas, mensaje, procesado_at: new Date().toISOString(),
      });
      resumen.push({ fichero: ruta, carpeta: carpeta.ruta, estado, filas, mensaje });
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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/** ¿La petición viene de un usuario con sesión y rol Dirección? Permite lanzar
 *  la ingesta a demanda desde el botón de Ajustes, además del cron horario. */
async function esDireccion(req: Request, deps: Deps): Promise<boolean> {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  try {
    const res = await deps.fetchFn(`${deps.url}/auth/v1/user`, {
      headers: { apikey: deps.serviceKey, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const email = String((await res.json())?.email || '').trim().toLowerCase();
    if (!email) return false;
    // Multiusuario: comprueba el rol en la tabla de miembros. Si la tabla no
    // existe (modo cuenta única), cualquier usuario con sesión es Dirección.
    const m = await deps.fetchFn(
      `${deps.url}/rest/v1/miembros?email=eq.${encodeURIComponent(email)}&select=rol,activo`,
      { headers: { apikey: deps.serviceKey, Authorization: `Bearer ${deps.serviceKey}` } }
    );
    if (!m.ok) return true; // tabla ausente → cuenta única
    const filas = await m.json();
    if (!Array.isArray(filas) || filas.length === 0) return true; // sin membresías aún (bootstrap)
    return filas[0].rol === 'direccion' && filas[0].activo !== false;
  } catch {
    return false;
  }
}

export async function handleIngesta(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const auth = req.headers.get('authorization') || '';
  const esCron = auth === `Bearer ${deps.serviceKey}`;
  if (!esCron && !(await esDireccion(req, deps))) {
    return new Response(JSON.stringify({ error: 'No autorizado: se necesita sesión con rol Dirección.' }), {
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
  const env = (k: string) => (Deno.env.get(k) || '').trim();
  // Separadores tolerantes: ';' y también tabuladores/saltos de línea que se
  // cuelan al pegar el valor del secret. Los fragmentos rotos fallan solos
  // sin bloquear las rutas buenas.
  const rutas = (k: string) => env(k).split(/[;\t\n\r]+/).map((r: string) => r.trim().replace(/^\/+|\/+$/g, '')).filter(Boolean);
  const carpetas: Carpeta[] = [];
  for (const ruta of rutas('SP_CARPETA_FACTURAS')) carpetas.push({ ruta, tipo: 'facturas' });
  for (const ruta of rutas('SP_CARPETA_BANCO')) carpetas.push({ ruta, tipo: 'banco' });
  for (const ruta of rutas('SP_CARPETA_GASTOS')) carpetas.push({ ruta, tipo: 'gastos' });
  Deno.serve((req: Request) =>
    handleIngesta(req, {
      url: env('SUPABASE_URL'),
      serviceKey: env('SUPABASE_SERVICE_ROLE_KEY'),
      tenant: env('MS_TENANT_ID'),
      client: env('MS_CLIENT_ID'),
      secret: env('MS_CLIENT_SECRET'),
      site: env('SP_SITE'),
      biblioteca: env('SP_BIBLIOTECA'),
      carpetas,
      fetchFn: fetch,
      parseWorkbook,
    })
  );
}
