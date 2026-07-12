export type LineaServicio =
  | 'Ingeniería MEP'
  | 'Legalizaciones'
  | 'Auditoría energética'
  | 'Modelado y simulación energética'
  | 'Consultoría fondos inmobiliarios'
  | 'Consultoría residencial'
  | 'Clima y sostenibilidad'
  | 'Otros';

export const LINEAS_SERVICIO: LineaServicio[] = [
  'Ingeniería MEP',
  'Legalizaciones',
  'Auditoría energética',
  'Modelado y simulación energética',
  'Consultoría fondos inmobiliarios',
  'Consultoría residencial',
  'Clima y sostenibilidad',
  'Otros',
];

export type TipoContacto = 'cliente' | 'proveedor' | 'colaborador';

export interface Contacto {
  id: string;
  tipo: TipoContacto;
  nombre: string;
  nif?: string;
  email?: string;
  telefono?: string;
  notas?: string;
}

export type EstadoOferta = 'borrador' | 'enviada' | 'aceptada' | 'rechazada';

/** Desglose de costes y recursos con el que se preparó una oferta (asistente). */
export interface EstimacionOferta {
  equipo: { rol: string; horas: number; costeHora: number; ventaHora?: number }[];
  gastos: { concepto: string; categoria: CategoriaGasto; base: number }[];
  /** Desglose técnico por actividad/disciplina (líneas de ingeniería) */
  disciplinas?: { nombre: string; horas: number; coste: number }[];
  /** Módulo opcional de sostenibilidad inteligente (inmótica + reporting ESG) */
  sostenibilidad?: {
    nivel: string;
    estandares: string[];
    horas: number;
    hardware: number;
    saasAnual: number; // suscripción EasyESG.pro, recurrente
  };
  contingenciaPct: number;
  comercialPct: number;
  generalesPct: number;
  margenObjetivoPct: number;
  totalHoras: number;
  costeEquipo: number;
  gastosDirectos: number;
  precioRecomendado: number;
  margenPrevisto: number; // margen neto (0-1) al importe ofertado
}

export interface Oferta {
  id: string;
  codigo: string;
  clienteId: string;
  titulo: string;
  lineaServicio: LineaServicio;
  importe: number;
  fecha: string; // ISO yyyy-mm-dd
  estado: EstadoOferta;
  proyectoId?: string;
  notas?: string;
  superficieM2?: number; // m² del activo: la variable de dimensionado del sector
  estimacion?: EstimacionOferta;
}

/** Reparto de un proyecto con un proveedor o colaborador.
 *  `valor` es el % (si el proyecto reparte por porcentaje) o las horas (si reparte
 *  por horas). `porcentaje` se mantiene por compatibilidad con datos antiguos. */
export interface Reparto {
  contactoId: string;
  valor?: number;
  porcentaje?: number; // legado
  descripcion?: string;
}

export type ModoReparto = 'porcentaje' | 'horas';

export type EstadoProyecto = 'activo' | 'cerrado';

export interface Proyecto {
  id: string;
  codigo: string;
  nombre: string;
  clienteId: string;
  lineaServicio: LineaServicio;
  presupuesto: number;
  fechaInicio: string;
  estado: EstadoProyecto;
  repartos: Reparto[];
  modoReparto?: ModoReparto; // por defecto 'porcentaje'
  comercialId?: string; // contacto que percibe la comisión comercial
  comercialPct?: number; // por defecto 10
  gastosGeneralesPct?: number; // por defecto 20
  notas?: string;
}

export type EstadoFactura = 'emitida' | 'cobrada' | 'anulada';

export interface Factura {
  id: string;
  numero: string;
  fecha: string;
  clienteId: string;
  proyectoId?: string;
  concepto: string;
  base: number;
  ivaPct: number;
  irpfPct: number;
  total: number;
  estado: EstadoFactura;
  vencimiento?: string;
  fechaCobro?: string;
  liquidada?: boolean; // reparto y pago de gastos completado y dado por bueno
}

export type EstadoGasto = 'pendiente' | 'pagado';

export const CATEGORIAS_GASTO = [
  'Subcontratación / Ingeniería externa',
  'OCA / Inspecciones',
  'Visados y colegios',
  'Tasas y licencias administrativas',
  'Desplazamientos y dietas',
  'Colaboradores',
  'Software y licencias',
  'Seguros (RC, decenal)',
  'Material y equipos',
  'Suministros y oficina',
  'Impuestos',
  'Otros',
] as const;

export type CategoriaGasto = (typeof CATEGORIAS_GASTO)[number];

export interface Gasto {
  id: string;
  fecha: string;
  contactoId?: string;
  concepto: string;
  categoria: CategoriaGasto;
  base: number;
  ivaPct: number;
  total: number;
  proyectoId?: string;
  facturaId?: string; // gasto imputado a una factura concreta (para la liquidación)
  estado: EstadoGasto;
  fechaPago?: string;
  numeroProveedor?: string; // nº de la factura del proveedor (informativo)
  cif?: string; // CIF/NIF del proveedor (informativo)
}

export type TipoMovimiento =
  | 'cuenta'
  | 'tarjeta'
  | 'transferencia_emitida'
  | 'transferencia_recibida';

export const TIPOS_MOVIMIENTO: Record<TipoMovimiento, string> = {
  cuenta: 'Movimiento de cuenta',
  tarjeta: 'Movimiento de tarjeta',
  transferencia_emitida: 'Transferencia emitida',
  transferencia_recibida: 'Transferencia recibida',
};

export interface Conciliacion {
  tipo: 'factura' | 'gasto' | 'liquidacion';
  id: string;
}

export interface MovimientoBancario {
  id: string;
  fecha: string;
  concepto: string;
  importe: number; // positivo = entrada, negativo = salida
  tipo: TipoMovimiento;
  cuenta?: string;
  conciliacion?: Conciliacion;
}

export type EstadoLiquidacion = 'pendiente' | 'pagada';

export interface Liquidacion {
  id: string;
  proyectoId: string;
  facturaId?: string; // factura a la que corresponde la liquidación
  contactoId: string;
  rol?: 'colaborador' | 'comercial';
  concepto: string;
  importe: number;
  fecha: string;
  estado: EstadoLiquidacion;
  fechaPago?: string;
}

export interface AppData {
  contactos: Contacto[];
  ofertas: Oferta[];
  proyectos: Proyecto[];
  facturas: Factura[];
  gastos: Gasto[];
  movimientos: MovimientoBancario[];
  liquidaciones: Liquidacion[];
}

export const EMPTY_DATA: AppData = {
  contactos: [],
  ofertas: [],
  proyectos: [],
  facturas: [],
  gastos: [],
  movimientos: [],
  liquidaciones: [],
};

export type Page =
  | 'dashboard'
  | 'ofertas'
  | 'proyectos'
  | 'facturas'
  | 'gastos'
  | 'banco'
  | 'liquidaciones'
  | 'rentabilidad'
  | 'contactos'
  | 'importar'
  | 'usuarios'
  | 'ajustes';

export type Rol = 'direccion' | 'gestion' | 'colaborador';

export const ROLES: { valor: Rol; etiqueta: string; descripcion: string }[] = [
  { valor: 'direccion', etiqueta: 'Dirección general', descripcion: 'Acceso total, incluida la administración de usuarios y los resultados globales.' },
  { valor: 'gestion', etiqueta: 'Gestión', descripcion: 'Parte operativa de los clientes y proyectos asignados. Sin resultados globales ni administración.' },
  { valor: 'colaborador', etiqueta: 'Colaborador', descripcion: 'Solo los proyectos en los que participa y sus propias liquidaciones.' },
];

/** Miembro del equipo con acceso a la plataforma. Vive en una tabla protegida de Supabase. */
export interface Miembro {
  email: string; // identifica al usuario (debe coincidir con su usuario de Supabase)
  nombre: string;
  rol: Rol;
  contactoId?: string; // vincula al contacto (para actuar como colaborador/comercial)
  activo: boolean;
  clientesAsignados: string[]; // ids de contactos cliente (alcance de Gestión)
  proyectosAsignados: string[]; // ids de proyectos (alcance de Gestión)
  secciones?: Page[]; // si se define, lista explícita de secciones visibles (anula el valor por rol)
}
