import { useSyncExternalStore } from 'react';
import { AppData, Miembro, Page, Rol } from '../types';
import { getClient } from './supabase';

/** Secciones visibles por defecto según el rol (Dirección puede ajustarlas por miembro). */
export function seccionesPorRol(rol: Rol): Page[] {
  if (rol === 'direccion')
    return ['dashboard', 'ofertas', 'proyectos', 'trabajos', 'facturas', 'gastos', 'banco', 'liquidaciones', 'rentabilidad', 'contactos', 'importar', 'usuarios', 'ajustes'];
  if (rol === 'gestion')
    return ['ofertas', 'proyectos', 'trabajos', 'facturas', 'gastos', 'liquidaciones', 'contactos'];
  // colaborador
  return ['proyectos', 'trabajos', 'liquidaciones'];
}

export interface Acceso {
  cargado: boolean;
  // null = sin restricción de membresía (cuenta única / Dirección por defecto)
  miembro: Miembro | null;
  rol: Rol;
  email: string;
  secciones: Page[];
  // Alcance (para Gestión): ids permitidos. undefined = sin restricción (Dirección).
  clientesAsignados?: string[];
  proyectosAsignados?: string[];
  contactoId?: string; // para Colaborador y para actuar como colaborador/comercial
  miembros: Miembro[]; // lista completa (solo la ve Dirección)
  multiusuarioActivo: boolean; // true si existe la tabla de miembros en Supabase
}

const ACCESO_INICIAL: Acceso = {
  cargado: false,
  miembro: null,
  rol: 'direccion',
  email: '',
  secciones: seccionesPorRol('direccion'),
  miembros: [],
  multiusuarioActivo: false,
};

let acceso: Acceso = ACCESO_INICIAL;
const listeners = new Set<() => void>();

function setAcceso(next: Acceso) {
  acceso = next;
  listeners.forEach((l) => l());
}

export function useAcceso(): Acceso {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => acceso
  );
}

export function getAcceso(): Acceso {
  return acceso;
}

function filaAMiembro(r: any): Miembro {
  return {
    email: r.email,
    nombre: r.nombre || '',
    rol: r.rol,
    contactoId: r.contacto_id || undefined,
    activo: r.activo !== false,
    clientesAsignados: r.clientes_asignados || [],
    proyectosAsignados: r.proyectos_asignados || [],
    secciones: r.secciones || undefined,
  };
}

function miembroAFila(m: Miembro) {
  return {
    email: m.email.trim().toLowerCase(),
    nombre: m.nombre,
    rol: m.rol,
    contacto_id: m.contactoId || null,
    activo: m.activo,
    clientes_asignados: m.clientesAsignados,
    proyectos_asignados: m.proyectosAsignados,
    secciones: m.secciones || null,
  };
}

/** Carga el acceso del usuario tras iniciar sesión. Repliega a Dirección si no hay multiusuario. */
export async function cargarAcceso(email: string) {
  const client = getClient();
  const correo = (email || '').trim().toLowerCase();
  if (!client) {
    setAcceso({ ...ACCESO_INICIAL, cargado: true, email: correo });
    return;
  }
  try {
    const { data, error } = await client.from('miembros').select('*');
    if (error) {
      // La tabla no existe todavía (multiusuario no aplicado): la cuenta es Dirección.
      setAcceso({ ...ACCESO_INICIAL, cargado: true, email: correo, multiusuarioActivo: false });
      return;
    }
    const miembros = (data || []).map(filaAMiembro);
    if (miembros.length === 0) {
      // Tabla vacía: registramos a este usuario como Dirección (evita autobloqueos)
      // y queda como propietario. Si falla, seguimos como Dirección por bootstrap.
      try {
        await client.from('miembros').upsert(
          miembroAFila({ email: correo, nombre: '', rol: 'direccion', activo: true, clientesAsignados: [], proyectosAsignados: [] }),
          { onConflict: 'email' }
        );
      } catch {
        /* el bootstrap del servidor ya da acceso de Dirección */
      }
      setAcceso({ ...ACCESO_INICIAL, cargado: true, email: correo, multiusuarioActivo: true });
      return;
    }
    const yo = miembros.find((m) => m.email.toLowerCase() === correo);
    if (!yo || !yo.activo) {
      // Usuario sin membresía activa: acceso mínimo.
      setAcceso({
        cargado: true,
        miembro: yo || null,
        rol: 'colaborador',
        email: correo,
        secciones: [],
        clientesAsignados: [],
        proyectosAsignados: [],
        miembros: [],
        multiusuarioActivo: true,
      });
      return;
    }
    setAcceso({
      cargado: true,
      miembro: yo,
      rol: yo.rol,
      email: correo,
      secciones: yo.secciones && yo.secciones.length ? yo.secciones : seccionesPorRol(yo.rol),
      clientesAsignados: yo.rol === 'direccion' ? undefined : yo.clientesAsignados,
      proyectosAsignados: yo.rol === 'direccion' ? undefined : yo.proyectosAsignados,
      contactoId: yo.contactoId,
      miembros: yo.rol === 'direccion' ? miembros : [],
      multiusuarioActivo: true,
    });
  } catch {
    setAcceso({ ...ACCESO_INICIAL, cargado: true, email: correo });
  }
}

export function limpiarAcceso() {
  setAcceso(ACCESO_INICIAL);
}

export async function guardarMiembro(m: Miembro): Promise<string | null> {
  const client = getClient();
  if (!client) return 'Sin conexión con la nube.';
  const { error } = await client.from('miembros').upsert(miembroAFila(m), { onConflict: 'email' });
  if (error) return error.message;
  await cargarAcceso(acceso.email);
  return null;
}

export async function eliminarMiembro(email: string): Promise<string | null> {
  const client = getClient();
  if (!client) return 'Sin conexión con la nube.';
  const { error } = await client.from('miembros').delete().eq('email', email.trim().toLowerCase());
  if (error) return error.message;
  await cargarAcceso(acceso.email);
  return null;
}

export function puedeVer(seccion: Page): boolean {
  return acceso.secciones.includes(seccion);
}

/** Filtra los datos según el alcance del usuario (defensa en profundidad sobre la RLS del servidor). */
export function filtrarPorAlcance(data: AppData, a: Acceso): AppData {
  if (a.rol === 'direccion') return data;

  if (a.rol === 'gestion') {
    const clientes = new Set(a.clientesAsignados || []);
    const proyIds = new Set(a.proyectosAsignados || []);
    // Proyectos visibles: asignados directamente o de un cliente asignado
    const proyectos = data.proyectos.filter((p) => proyIds.has(p.id) || clientes.has(p.clienteId));
    const proyectosVisibles = new Set(proyectos.map((p) => p.id));
    const facturaVisible = (cli: string, proy?: string) =>
      clientes.has(cli) || (proy ? proyectosVisibles.has(proy) : false);
    const facturas = data.facturas.filter((f) => facturaVisible(f.clienteId, f.proyectoId));
    const facturaIds = new Set(facturas.map((f) => f.id));
    const gastos = data.gastos.filter(
      (g) => (g.proyectoId && proyectosVisibles.has(g.proyectoId)) || (g.facturaId && facturaIds.has(g.facturaId))
    );
    const ofertas = data.ofertas.filter((o) => clientes.has(o.clienteId));
    const liquidaciones = data.liquidaciones.filter((l) => proyectosVisibles.has(l.proyectoId));
    // Contactos visibles: clientes asignados, colaboradores de sus proyectos y proveedores de sus gastos
    const contIds = new Set<string>([...clientes]);
    proyectos.forEach((p) => {
      p.repartos.forEach((r) => contIds.add(r.contactoId));
      if (p.comercialId) contIds.add(p.comercialId);
    });
    gastos.forEach((g) => g.contactoId && contIds.add(g.contactoId));
    const contactos = data.contactos.filter((c) => contIds.has(c.id));
    const tareas = data.tareas.filter((t) => proyectosVisibles.has(t.proyectoId));
    return { contactos, ofertas, proyectos, facturas, gastos, movimientos: [], liquidaciones, tareas };
  }

  // colaborador: solo proyectos donde participa y sus liquidaciones
  const cid = a.contactoId;
  const proyectos = data.proyectos.filter(
    (p) => cid && (p.comercialId === cid || p.repartos.some((r) => r.contactoId === cid))
  );
  const proyIds = new Set(proyectos.map((p) => p.id));
  const facturas = data.facturas.filter((f) => f.proyectoId && proyIds.has(f.proyectoId));
  const liquidaciones = data.liquidaciones.filter((l) => l.contactoId === cid);
  const contactos = data.contactos.filter((c) => c.id === cid);
  // Tareas: las de sus proyectos que le están asignadas (o sin responsable)
  const tareas = data.tareas.filter(
    (t) => proyIds.has(t.proyectoId) && (!t.contactoId || t.contactoId === cid)
  );
  return { contactos, ofertas: [], proyectos, facturas, gastos: [], movimientos: [], liquidaciones, tareas };
}
