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
}

/** Reparto de un proyecto con un proveedor o colaborador */
export interface Reparto {
  contactoId: string;
  porcentaje: number; // % sobre la base imponible cobrada del proyecto
  descripcion?: string;
}

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
}

export type EstadoGasto = 'pendiente' | 'pagado';

export const CATEGORIAS_GASTO = [
  'Proveedores / Subcontratación',
  'Colaboradores',
  'Software y licencias',
  'Seguros y tasas',
  'Suministros',
  'Desplazamientos',
  'Material y equipos',
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
  estado: EstadoGasto;
  fechaPago?: string;
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
  contactoId: string;
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
  | 'ajustes';
