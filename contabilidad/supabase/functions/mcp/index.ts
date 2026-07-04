// ============================================================
// SRS Gestión · Servidor MCP (Model Context Protocol)
// Edge Function de Supabase. Permite consultar la contabilidad
// desde Claude u otro LLM, respetando los roles de la app
// (Dirección / Gestión / Colaborador) mediante claves personales.
//
// Despliegue: Dashboard → Edge Functions → Deploy new function,
// nombre "mcp", pegar este fichero y DESACTIVAR "Verify JWT"
// (la autenticación la hace la propia función con las claves
// generadas en Ajustes → Conectar tu IA).
// ============================================================

type Json = Record<string, unknown>;

interface Deps {
  url: string;
  serviceKey: string;
  fetchFn: typeof fetch;
}

interface Acceso {
  email: string;
  rol: 'direccion' | 'gestion' | 'colaborador';
  contactoId?: string;
  clientes: string[];
  proyectos: string[];
}

const TABLAS = ['contactos', 'ofertas', 'proyectos', 'facturas', 'gastos', 'movimientos', 'liquidaciones'] as const;

const r2 = (n: number) => Math.round(n * 100) / 100;

// ---------- utilidades ----------
async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function pg(deps: Deps, path: string): Promise<any[]> {
  const res = await deps.fetchFn(`${deps.url}/rest/v1/${path}`, {
    headers: { apikey: deps.serviceKey, Authorization: `Bearer ${deps.serviceKey}` },
  });
  if (!res.ok) throw new Error(`REST ${path}: ${res.status}`);
  return await res.json();
}

async function pgInsert(deps: Deps, tabla: string, fila: Json): Promise<void> {
  const res = await deps.fetchFn(`${deps.url}/rest/v1/${tabla}`, {
    method: 'POST',
    headers: {
      apikey: deps.serviceKey,
      Authorization: `Bearer ${deps.serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(fila),
  });
  if (!res.ok) throw new Error(`insert ${tabla}: ${res.status} ${await res.text()}`);
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ---------- autenticación por clave personal ----------
async function autenticar(deps: Deps, token: string | null): Promise<Acceso | null> {
  if (!token || !token.startsWith('srs_')) return null;
  const hash = await sha256hex(token);
  const filas = await pg(deps, `mcp_tokens?token_hash=eq.${hash}&select=email`);
  if (!filas.length) return null;
  const email = String(filas[0].email).toLowerCase();
  const miembros = await pg(deps, `miembros?email=eq.${encodeURIComponent(email)}&select=*`);
  if (!miembros.length || miembros[0].activo === false) return null;
  const m = miembros[0];
  return {
    email,
    rol: m.rol,
    contactoId: m.contacto_id || undefined,
    clientes: m.clientes_asignados || [],
    proyectos: m.proyectos_asignados || [],
  };
}

// ---------- datos + alcance (mismas reglas que la app) ----------
async function cargarDatos(deps: Deps): Promise<Json> {
  const out: Json = {};
  for (const t of TABLAS) {
    const filas = await pg(deps, `${t}?select=data`);
    out[t] = filas.map((f: any) => f.data);
  }
  return out;
}

function filtrarPorAlcance(data: any, a: Acceso): any {
  if (a.rol === 'direccion') return data;

  if (a.rol === 'gestion') {
    const clientes = new Set(a.clientes);
    const proyIds = new Set(a.proyectos);
    const proyectos = data.proyectos.filter((p: any) => proyIds.has(p.id) || clientes.has(p.clienteId));
    const visibles = new Set(proyectos.map((p: any) => p.id));
    const facturas = data.facturas.filter(
      (f: any) => clientes.has(f.clienteId) || (f.proyectoId && visibles.has(f.proyectoId))
    );
    const facturaIds = new Set(facturas.map((f: any) => f.id));
    const gastos = data.gastos.filter(
      (g: any) => (g.proyectoId && visibles.has(g.proyectoId)) || (g.facturaId && facturaIds.has(g.facturaId))
    );
    const ofertas = data.ofertas.filter((o: any) => clientes.has(o.clienteId));
    const liquidaciones = data.liquidaciones.filter((l: any) => visibles.has(l.proyectoId));
    const contIds = new Set<string>([...clientes]);
    proyectos.forEach((p: any) => {
      (p.repartos || []).forEach((r: any) => contIds.add(r.contactoId));
      if (p.comercialId) contIds.add(p.comercialId);
    });
    gastos.forEach((g: any) => g.contactoId && contIds.add(g.contactoId));
    const contactos = data.contactos.filter((c: any) => contIds.has(c.id));
    return { contactos, ofertas, proyectos, facturas, gastos, movimientos: [], liquidaciones };
  }

  // colaborador
  const cid = a.contactoId;
  const proyectos = data.proyectos.filter(
    (p: any) => cid && (p.comercialId === cid || (p.repartos || []).some((r: any) => r.contactoId === cid))
  );
  const proyIds = new Set(proyectos.map((p: any) => p.id));
  const facturas = data.facturas.filter((f: any) => f.proyectoId && proyIds.has(f.proyectoId));
  const liquidaciones = data.liquidaciones.filter((l: any) => l.contactoId === cid);
  const contactos = data.contactos.filter((c: any) => c.id === cid);
  return { contactos, ofertas: [], proyectos, facturas, gastos: [], movimientos: [], liquidaciones };
}

// ---------- cascada de liquidación (misma regla que la app) ----------
function desglose(data: any, f: any) {
  const nombre = (id?: string) => data.contactos.find((c: any) => c.id === id)?.nombre || id || '—';
  const p = data.proyectos.find((x: any) => x.id === f.proyectoId);
  const gastos = data.gastos.filter((g: any) => g.facturaId === f.id);
  const totalGastos = r2(gastos.reduce((s: number, g: any) => s + g.base, 0));
  const neto = r2(f.base - totalGastos);
  const cPct = p?.comercialPct ?? 10;
  const gPct = p?.gastosGeneralesPct ?? 20;
  const comision = r2((neto * cPct) / 100);
  const generales = r2((neto * gPct) / 100);
  const baseReparto = r2(neto - comision - generales);
  const modo = p?.modoReparto ?? 'porcentaje';
  const repartos = (p?.repartos || []).slice(0, 6);
  const totalHoras = repartos.reduce((s: number, r: any) => s + (r.valor ?? r.porcentaje ?? 0), 0);
  const liqDe = (cid: string, rol: string) =>
    data.liquidaciones.find(
      (l: any) => l.facturaId === f.id && l.contactoId === cid && (l.rol ?? 'colaborador') === rol
    );
  const lineas: any[] = [];
  if (p?.comercialId && comision > 0) {
    const l = liqDe(p.comercialId, 'comercial');
    lineas.push({ beneficiario: nombre(p.comercialId), rol: 'comercial', importe: comision, pagada: l?.estado === 'pagada' });
  }
  for (const r of repartos) {
    const valor = r.valor ?? r.porcentaje ?? 0;
    const importe = modo === 'porcentaje' ? r2((baseReparto * valor) / 100) : totalHoras > 0 ? r2((baseReparto * valor) / totalHoras) : 0;
    const l = liqDe(r.contactoId, 'colaborador');
    lineas.push({ beneficiario: nombre(r.contactoId), rol: 'colaborador', [modo === 'horas' ? 'horas' : 'pct']: valor, importe, pagada: l?.estado === 'pagada' });
  }
  const totalAPagar = r2(lineas.reduce((s, l) => s + l.importe, 0));
  const pagado = r2(lineas.filter((l) => l.pagada).reduce((s, l) => s + l.importe, 0));
  return {
    factura: f.numero,
    cliente: nombre(f.clienteId),
    proyecto: p ? `${p.codigo} · ${p.nombre}` : null,
    baseImponible: f.base,
    gastosPropios: totalGastos,
    netoTrasGastos: neto,
    comisionComercial: comision,
    gastosGenerales: generales,
    baseReparto,
    lineas,
    totalAPagar,
    pagado,
    pendiente: r2(totalAPagar - pagado),
  };
}

// ---------- herramientas ----------
const HERRAMIENTAS = [
  {
    name: 'resumen',
    description: 'Resumen financiero del alcance del usuario: facturado, cobrado, pendiente de cobro, gastos y liquidaciones pendientes. Filtra por año si se indica.',
    inputSchema: { type: 'object', properties: { anyo: { type: 'number', description: 'Año, p. ej. 2026. Vacío = todo.' } } },
  },
  {
    name: 'listar_facturas',
    description: 'Lista facturas emitidas visibles para el usuario, con filtros opcionales.',
    inputSchema: {
      type: 'object',
      properties: {
        estado: { type: 'string', enum: ['emitida', 'cobrada', 'anulada'] },
        texto: { type: 'string', description: 'Busca en número, cliente y concepto' },
        limite: { type: 'number', description: 'Máximo de resultados (por defecto 25)' },
      },
    },
  },
  {
    name: 'listar_proyectos',
    description: 'Lista proyectos visibles con su facturado y cobrado.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'listar_gastos',
    description: 'Lista gastos visibles, con filtros opcionales.',
    inputSchema: {
      type: 'object',
      properties: {
        estado: { type: 'string', enum: ['pendiente', 'pagado'] },
        texto: { type: 'string' },
        limite: { type: 'number' },
      },
    },
  },
  {
    name: 'liquidaciones_pendientes',
    description: 'Facturas cobradas aún no liquidadas, con el desglose completo (gastos propios, comisión comercial, gastos generales y reparto del equipo).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'buscar',
    description: 'Busca un texto en clientes, proyectos y facturas visibles.',
    inputSchema: { type: 'object', properties: { texto: { type: 'string' } }, required: ['texto'] },
  },
  {
    name: 'crear_gasto',
    description: 'Registra un gasto (solo Dirección y Gestión). Puede imputarse a un proyecto por su código y a una factura por su número.',
    inputSchema: {
      type: 'object',
      properties: {
        concepto: { type: 'string' },
        base: { type: 'number', description: 'Base imponible en euros' },
        ivaPct: { type: 'number', description: 'Por defecto 21' },
        fecha: { type: 'string', description: 'yyyy-mm-dd; por defecto hoy' },
        proyectoCodigo: { type: 'string' },
        facturaNumero: { type: 'string' },
        pagado: { type: 'boolean', description: 'Por defecto false (pendiente)' },
      },
      required: ['concepto', 'base'],
    },
  },
];

async function ejecutar(nombre: string, args: any, data: any, acc: Acceso, deps: Deps): Promise<Json> {
  const enAnyo = (fecha?: string) => !args?.anyo || (fecha || '').startsWith(String(args.anyo));
  const nombreDe = (id?: string) => data.contactos.find((c: any) => c.id === id)?.nombre || '—';

  if (nombre === 'resumen') {
    const facturas = data.facturas.filter((f: any) => f.estado !== 'anulada' && enAnyo(f.fecha));
    const pendientes = data.facturas
      .filter((f: any) => f.estado === 'cobrada' && !f.liquidada)
      .map((f: any) => desglose(data, f));
    return {
      rol: acc.rol,
      facturadoBase: r2(facturas.reduce((s: number, f: any) => s + f.base, 0)),
      cobradoBase: r2(facturas.filter((f: any) => f.estado === 'cobrada').reduce((s: number, f: any) => s + f.base, 0)),
      pendienteCobroTotal: r2(data.facturas.filter((f: any) => f.estado === 'emitida').reduce((s: number, f: any) => s + f.total, 0)),
      gastosBase: r2(data.gastos.filter((g: any) => enAnyo(g.fecha)).reduce((s: number, g: any) => s + g.base, 0)),
      gastosPendientesPago: r2(data.gastos.filter((g: any) => g.estado === 'pendiente').reduce((s: number, g: any) => s + g.total, 0)),
      liquidacionesPendientes: r2(pendientes.reduce((s: number, d: any) => s + d.pendiente, 0)),
      facturasSinLiquidar: pendientes.length,
      proyectosActivos: data.proyectos.filter((p: any) => p.estado === 'activo').length,
    };
  }

  if (nombre === 'listar_facturas') {
    const t = (args?.texto || '').toLowerCase();
    const lista = data.facturas
      .filter((f: any) => !args?.estado || f.estado === args.estado)
      .filter(
        (f: any) =>
          !t ||
          f.numero.toLowerCase().includes(t) ||
          nombreDe(f.clienteId).toLowerCase().includes(t) ||
          (f.concepto || '').toLowerCase().includes(t)
      )
      .sort((a: any, b: any) => b.fecha.localeCompare(a.fecha))
      .slice(0, args?.limite || 25)
      .map((f: any) => ({
        numero: f.numero,
        fecha: f.fecha,
        cliente: nombreDe(f.clienteId),
        concepto: f.concepto,
        base: f.base,
        total: f.total,
        estado: f.estado,
        liquidada: !!f.liquidada,
      }));
    return { total: lista.length, facturas: lista };
  }

  if (nombre === 'listar_proyectos') {
    return {
      proyectos: data.proyectos.map((p: any) => {
        const fs = data.facturas.filter((f: any) => f.proyectoId === p.id && f.estado !== 'anulada');
        return {
          codigo: p.codigo,
          nombre: p.nombre,
          cliente: nombreDe(p.clienteId),
          linea: p.lineaServicio,
          estado: p.estado,
          facturadoBase: r2(fs.reduce((s: number, f: any) => s + f.base, 0)),
          cobradoBase: r2(fs.filter((f: any) => f.estado === 'cobrada').reduce((s: number, f: any) => s + f.base, 0)),
        };
      }),
    };
  }

  if (nombre === 'listar_gastos') {
    const t = (args?.texto || '').toLowerCase();
    const lista = data.gastos
      .filter((g: any) => !args?.estado || g.estado === args.estado)
      .filter((g: any) => !t || (g.concepto || '').toLowerCase().includes(t) || nombreDe(g.contactoId).toLowerCase().includes(t))
      .sort((a: any, b: any) => b.fecha.localeCompare(a.fecha))
      .slice(0, args?.limite || 25)
      .map((g: any) => ({
        fecha: g.fecha,
        concepto: g.concepto,
        categoria: g.categoria,
        proveedor: g.contactoId ? nombreDe(g.contactoId) : null,
        base: g.base,
        total: g.total,
        estado: g.estado,
      }));
    return { total: lista.length, gastos: lista };
  }

  if (nombre === 'liquidaciones_pendientes') {
    if (acc.rol === 'colaborador') {
      // El colaborador ve sus propias liquidaciones registradas
      return {
        liquidaciones: data.liquidaciones.map((l: any) => ({
          fecha: l.fecha,
          concepto: l.concepto,
          importe: l.importe,
          estado: l.estado,
          fechaPago: l.fechaPago || null,
        })),
      };
    }
    const pendientes = data.facturas
      .filter((f: any) => f.estado === 'cobrada' && !f.liquidada)
      .map((f: any) => desglose(data, f));
    return { facturasPorLiquidar: pendientes.length, desglose: pendientes };
  }

  if (nombre === 'buscar') {
    const t = String(args?.texto || '').toLowerCase();
    return {
      clientes: data.contactos.filter((c: any) => c.nombre.toLowerCase().includes(t)).map((c: any) => c.nombre),
      proyectos: data.proyectos
        .filter((p: any) => `${p.codigo} ${p.nombre}`.toLowerCase().includes(t))
        .map((p: any) => `${p.codigo} · ${p.nombre}`),
      facturas: data.facturas
        .filter((f: any) => `${f.numero} ${f.concepto}`.toLowerCase().includes(t))
        .map((f: any) => `${f.numero} · ${f.concepto} · ${f.total} €`),
    };
  }

  if (nombre === 'crear_gasto') {
    if (acc.rol === 'colaborador') throw new Error('Tu rol no permite crear gastos.');
    const base = Number(args.base);
    if (!(base > 0) || !String(args.concepto || '').trim()) throw new Error('Faltan concepto o base.');
    const ivaPct = args.ivaPct != null ? Number(args.ivaPct) : 21;
    let proyectoId: string | undefined;
    let facturaId: string | undefined;
    if (args.proyectoCodigo) {
      const p = data.proyectos.find((x: any) => x.codigo === args.proyectoCodigo);
      if (!p) throw new Error(`Proyecto ${args.proyectoCodigo} no encontrado o fuera de tu alcance.`);
      proyectoId = p.id;
    }
    if (args.facturaNumero) {
      const f = data.facturas.find((x: any) => x.numero === args.facturaNumero);
      if (!f) throw new Error(`Factura ${args.facturaNumero} no encontrada o fuera de tu alcance.`);
      facturaId = f.id;
      proyectoId = proyectoId || f.proyectoId;
    }
    const gasto = {
      id: uid(),
      fecha: args.fecha || new Date().toISOString().slice(0, 10),
      concepto: String(args.concepto).trim(),
      categoria: 'Otros',
      base: r2(base),
      ivaPct,
      total: r2(base * (1 + ivaPct / 100)),
      proyectoId,
      facturaId,
      estado: args.pagado ? 'pagado' : 'pendiente',
      fechaPago: args.pagado ? args.fecha || new Date().toISOString().slice(0, 10) : undefined,
    };
    await pgInsert(deps, 'gastos', { id: gasto.id, data: gasto, updated_at: new Date().toISOString() });
    return { creado: true, gasto: { concepto: gasto.concepto, base: gasto.base, total: gasto.total, estado: gasto.estado } };
  }

  throw new Error(`Herramienta desconocida: ${nombre}`);
}

// ---------- protocolo MCP (JSON-RPC sobre HTTP) ----------
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-session-id, mcp-protocol-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function rpcOk(id: unknown, result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
function rpcError(id: unknown, code: number, message: string): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

export async function handleMcp(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ servidor: 'SRS Gestión MCP', estado: 'ok' }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : url.searchParams.get('token');

  let cuerpo: any;
  try {
    cuerpo = await req.json();
  } catch {
    return rpcError(null, -32700, 'JSON inválido');
  }
  const { id, method, params } = cuerpo || {};

  // Notificaciones (sin id): aceptar sin cuerpo
  if (id === undefined && String(method || '').startsWith('notifications/')) {
    return new Response(null, { status: 202, headers: CORS });
  }

  if (method === 'initialize') {
    return rpcOk(id, {
      protocolVersion: params?.protocolVersion || '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'srs-gestion', version: '1.0.0' },
    });
  }
  if (method === 'ping') return rpcOk(id, {});

  // A partir de aquí hace falta clave válida
  const acc = await autenticar(deps, token);
  if (!acc) {
    return rpcError(id ?? null, -32001, 'Clave no válida. Genera la tuya en SRS Gestión → Ajustes → Conectar tu IA.');
  }

  if (method === 'tools/list') return rpcOk(id, { tools: HERRAMIENTAS });

  if (method === 'tools/call') {
    const nombre = params?.name;
    const args = params?.arguments || {};
    try {
      const todo = await cargarDatos(deps);
      const visible = filtrarPorAlcance(todo, acc);
      const resultado = await ejecutar(nombre, args, visible, acc, deps);
      return rpcOk(id, { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] });
    } catch (e) {
      return rpcOk(id, { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true });
    }
  }

  return rpcError(id ?? null, -32601, `Método no soportado: ${method}`);
}

// Arranque en Supabase Edge Runtime (Deno)
declare const Deno: any;
if (typeof Deno !== 'undefined' && Deno?.serve) {
  Deno.serve((req: Request) =>
    handleMcp(req, {
      url: Deno.env.get('SUPABASE_URL')!,
      serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      fetchFn: fetch,
    })
  );
}
