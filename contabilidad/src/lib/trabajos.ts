import { AppData, Oferta, Proyecto, Tarea } from '../types';

/**
 * Módulo de ejecución (Trabajos): el plan de tareas de un proyecto nace
 * automáticamente de la estimación de su oferta — una tarea por disciplina o
 * categoría con sus horas presupuestadas, más los hitos estándar del flujo de
 * la casa y las tareas del módulo de sostenibilidad si lo lleva. Después, las
 * horas reales registradas alimentan el comparativo presupuestado vs real.
 */

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Genera el plan de tareas de un proyecto a partir de su oferta. */
export function generarPlanTrabajos(proyecto: Proyecto, oferta: Oferta | undefined): Tarea[] {
  const est = oferta?.estimacion;
  const tareas: Tarea[] = [];
  const nueva = (titulo: string, horas: number, disciplina?: string): Tarea => ({
    id: uid(),
    proyectoId: proyecto.id,
    titulo,
    disciplina,
    horasPrevistas: r1(horas),
    horasReales: 0,
    estado: 'pendiente',
  });

  if (!est) {
    // Sin estimación: esqueleto mínimo para arrancar
    return [
      nueva('Reunión de arranque y recopilación de documentación', 4),
      nueva('Desarrollo de los trabajos', 0),
      nueva('Revisión interna (QA) y entrega', 4),
    ];
  }

  const totalBase = est.totalHoras - (est.sostenibilidad?.horas || 0);
  // Hitos transversales (~10% del total, mínimos razonables)
  const hArranque = Math.max(2, r1(totalBase * 0.04));
  const hQa = Math.max(2, r1(totalBase * 0.04));
  const hEntrega = Math.max(1, r1(totalBase * 0.02));
  const hHitos = hArranque + hQa + hEntrega;

  tareas.push(nueva('Reunión de arranque y recopilación de documentación', hArranque));

  // Una tarea por disciplina/categoría, descontando proporcionalmente los hitos
  if (est.disciplinas?.length) {
    const sumaDisc = est.disciplinas.reduce((s, d) => s + d.horas, 0) || 1;
    const factor = Math.max(0, (totalBase - hHitos) / sumaDisc);
    for (const d of est.disciplinas) {
      tareas.push(nueva(`Desarrollo: ${d.nombre}`, d.horas * factor, d.nombre));
    }
  } else {
    // Sin disciplinas: una tarea por rol del equipo (sin el módulo 🌱)
    const equipoBase = est.equipo.filter((e) => !e.rol.startsWith('🌱'));
    const sumaEq = equipoBase.reduce((s, e) => s + e.horas, 0) || 1;
    const factor = Math.max(0, (totalBase - hHitos) / sumaEq);
    for (const e of equipoBase) {
      tareas.push(nueva(`Desarrollo: ${e.rol}`, e.horas * factor, e.rol));
    }
  }

  // Módulo de sostenibilidad: sus propias tareas de implantación
  if (est.sostenibilidad) {
    const s = est.sostenibilidad;
    const consultor = est.equipo.find((e) => e.rol.startsWith('🌱 Consultor'));
    const integrador = est.equipo.find((e) => e.rol.startsWith('🌱 Integrador'));
    if (consultor) {
      tareas.push(nueva('🌱 Auditoría inicial, KPIs y configuración en EasyESG.pro', consultor.horas, 'Sostenibilidad'));
    }
    if (integrador) {
      tareas.push(nueva('🌱 Instalación de sensórica e integración BMS/BACS', integrador.horas, 'Sostenibilidad'));
    }
    if (s.estandares.length) {
      tareas.push(nueva(`🌱 Setup de marcos de reporte (${s.estandares.join(', ')})`, 0, 'Sostenibilidad'));
    }
  }

  tareas.push(nueva('Revisión interna (QA)', hQa));
  tareas.push(nueva('Entrega y cierre', hEntrega));
  return tareas;
}

export interface ResumenTrabajos {
  total: number;
  hechas: number;
  enCurso: number;
  horasPrevistas: number;
  horasReales: number;
  /** % de avance por horas de tareas hechas (0-1) */
  avance: number;
  /** true si las horas reales superan las previstas (proyecto quemando margen) */
  excedido: boolean;
}

export function resumenTrabajos(tareas: Tarea[]): ResumenTrabajos {
  const horasPrevistas = r1(tareas.reduce((s, t) => s + t.horasPrevistas, 0));
  const horasReales = r1(tareas.reduce((s, t) => s + t.horasReales, 0));
  const hechasHoras = tareas.filter((t) => t.estado === 'hecha').reduce((s, t) => s + t.horasPrevistas, 0);
  return {
    total: tareas.length,
    hechas: tareas.filter((t) => t.estado === 'hecha').length,
    enCurso: tareas.filter((t) => t.estado === 'en_curso').length,
    horasPrevistas,
    horasReales,
    avance: horasPrevistas > 0 ? hechasHoras / horasPrevistas : 0,
    excedido: horasReales > horasPrevistas && horasPrevistas > 0,
  };
}

/** Proyectos activos sin plan de trabajos (candidatos a generarlo). */
export function proyectosSinPlan(data: AppData): Proyecto[] {
  const conTareas = new Set(data.tareas.map((t) => t.proyectoId));
  return data.proyectos.filter((p) => p.estado === 'activo' && !conTareas.has(p.id));
}

/** La oferta de la que nació un proyecto (para generar su plan). */
export function ofertaDeProyecto(data: AppData, proyectoId: string): Oferta | undefined {
  return data.ofertas.find((o) => o.proyectoId === proyectoId);
}
