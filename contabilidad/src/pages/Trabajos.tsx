import React, { useEffect, useMemo, useState } from 'react';
import { setState, uid } from '../lib/store';
import { useDatosVisibles } from '../lib/vista';
import { EstadoTarea, Tarea } from '../types';
import { fmtEur } from '../lib/format';
import { generarPlanTrabajos, ofertaDeProyecto, resumenTrabajos } from '../lib/trabajos';
import { getEasyEsgConfig, kpisActivo, listarActivos, ActivoESG, KpisActivo } from '../lib/easyesg';
import { Card, PageTitle, Btn, inputCls, Empty, Badge } from '../components/ui';

const SIGUIENTE_ESTADO: Record<EstadoTarea, EstadoTarea> = {
  pendiente: 'en_curso',
  en_curso: 'hecha',
  hecha: 'pendiente',
};
const ETIQUETA_ESTADO: Record<EstadoTarea, { texto: string; color: string }> = {
  pendiente: { texto: 'Pendiente', color: 'bg-gray-100 text-gray-600' },
  en_curso: { texto: 'En curso', color: 'bg-amber-100 text-amber-700' },
  hecha: { texto: 'Hecha ✓', color: 'bg-green-100 text-green-700' },
};

const num = (s: string) => parseFloat(s) || 0;

const Trabajos: React.FC = () => {
  const data = useDatosVisibles();
  const [proyectoId, setProyectoId] = useState<string>('');
  const [kpis, setKpis] = useState<KpisActivo | null>(null);
  const [activos, setActivos] = useState<ActivoESG[] | null>(null);

  const activosProyectos = data.proyectos.filter((p) => p.estado === 'activo');
  const proyecto = data.proyectos.find((p) => p.id === proyectoId);
  useEffect(() => {
    if (!proyectoId && activosProyectos.length > 0) setProyectoId(activosProyectos[0].id);
  }, [proyectoId, activosProyectos.length]);

  const tareas = useMemo(
    () =>
      data.tareas
        .filter((t) => t.proyectoId === proyectoId)
        .sort((a, b) => (a.estado === 'hecha' ? 1 : 0) - (b.estado === 'hecha' ? 1 : 0)),
    [data.tareas, proyectoId]
  );
  const resumen = resumenTrabajos(tareas);
  const oferta = ofertaDeProyecto(data, proyectoId);
  const conectorListo = !!getEasyEsgConfig();

  // KPIs del activo vinculado en EasyESG.pro
  useEffect(() => {
    setKpis(null);
    if (!proyecto?.easyEsgActivoId || !conectorListo) return;
    let vivo = true;
    kpisActivo(proyecto.easyEsgActivoId)
      .then((k) => vivo && setKpis(k))
      .catch(() => vivo && setKpis(null));
    return () => {
      vivo = false;
    };
  }, [proyecto?.easyEsgActivoId, conectorListo]);

  const cargarActivos = () => {
    listarActivos()
      .then(setActivos)
      .catch((e) => alert(`No se pudieron cargar los activos de EasyESG.pro: ${(e as Error).message}`));
  };

  const actualizar = (id: string, cambios: Partial<Tarea>) => {
    setState((p) => ({ ...p, tareas: p.tareas.map((t) => (t.id === id ? { ...t, ...cambios } : t)) }));
  };
  const borrar = (t: Tarea) => {
    if (confirm(`¿Eliminar la tarea "${t.titulo}"?`)) {
      setState((p) => ({ ...p, tareas: p.tareas.filter((x) => x.id !== t.id) }));
    }
  };
  const anadir = () => {
    if (!proyectoId) return;
    setState((p) => ({
      ...p,
      tareas: [
        ...p.tareas,
        { id: uid(), proyectoId, titulo: 'Nueva tarea', horasPrevistas: 0, horasReales: 0, estado: 'pendiente' as const },
      ],
    }));
  };
  const generarPlan = () => {
    if (!proyecto) return;
    const plan = generarPlanTrabajos(proyecto, oferta);
    setState((p) => ({ ...p, tareas: [...p.tareas, ...plan] }));
  };
  const vincularActivo = (activoId: string) => {
    setState((p) => ({
      ...p,
      proyectos: p.proyectos.map((x) => (x.id === proyectoId ? { ...x, easyEsgActivoId: activoId || undefined } : x)),
    }));
  };

  const colaboradores = data.contactos.filter((c) => c.tipo === 'colaborador');
  const nombreContacto = (id?: string) => data.contactos.find((c) => c.id === id)?.nombre;

  return (
    <div>
      <PageTitle
        title="Trabajos"
        subtitle="Ejecución de los proyectos: el plan nace de la oferta y las horas reales se comparan con lo presupuestado"
        actions={proyectoId ? <Btn onClick={anadir}>+ Añadir tarea</Btn> : undefined}
      />

      {activosProyectos.length === 0 ? (
        <Card>
          <Empty>No hay proyectos activos. Acepta una oferta (→ Proyecto) para arrancar los trabajos.</Empty>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 mb-4 flex-wrap items-center">
            <select className={`${inputCls} max-w-md`} value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
              {activosProyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} · {p.nombre}
                </option>
              ))}
            </select>
            {tareas.length === 0 && proyecto && (
              <Btn onClick={generarPlan}>
                ⚙ Generar plan desde la oferta{oferta?.estimacion ? ` (${oferta.estimacion.totalHoras} h)` : ''}
              </Btn>
            )}
          </div>

          {proyecto && tareas.length > 0 && (
            <Card className="mb-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div>
                  <span className="text-xs text-gray-500 block">Tareas</span>
                  <span className="font-medium">{resumen.hechas}/{resumen.total} hechas{resumen.enCurso ? ` · ${resumen.enCurso} en curso` : ''}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Avance (por horas)</span>
                  <span className="font-medium">{(resumen.avance * 100).toFixed(0)}%</span>
                  <div className="h-1.5 bg-gray-200 rounded mt-1">
                    <div className="h-1.5 bg-teal-600 rounded" style={{ width: `${Math.min(100, resumen.avance * 100)}%` }} />
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Horas previstas</span>
                  <span className="font-medium">{resumen.horasPrevistas} h</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Horas reales</span>
                  <span className={`font-medium ${resumen.excedido ? 'text-red-600' : 'text-green-700'}`}>
                    {resumen.horasReales} h {resumen.excedido ? '⚠ excedido' : ''}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Presupuesto de la oferta</span>
                  <span className="font-medium">{oferta ? fmtEur(oferta.importe) : '—'}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Activo EasyESG.pro vinculado */}
          {proyecto && (
            <Card className="mb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-sm">
                  <span className="font-medium">🌍 Activo en EasyESG.pro:</span>{' '}
                  {proyecto.easyEsgActivoId ? (
                    <Badge color="bg-emerald-100 text-emerald-700">{proyecto.easyEsgActivoId}</Badge>
                  ) : (
                    <span className="text-gray-500">sin vincular</span>
                  )}
                  {!conectorListo && (
                    <span className="text-xs text-gray-400 ml-2">Configura el conector en Ajustes → Conectores.</span>
                  )}
                </div>
                {conectorListo && (
                  <div className="flex gap-2 items-center">
                    {activos ? (
                      <select
                        className={`${inputCls} py-1`}
                        value={proyecto.easyEsgActivoId || ''}
                        onChange={(e) => vincularActivo(e.target.value)}
                      >
                        <option value="">— sin vincular —</option>
                        {activos.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nombre}
                            {a.superficieM2 ? ` (${a.superficieM2.toLocaleString('es-ES')} m²)` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Btn variant="secondary" onClick={cargarActivos}>Cargar activos</Btn>
                    )}
                  </div>
                )}
              </div>
              {kpis && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mt-3 pt-3 border-t border-gray-100">
                  <div><span className="text-xs text-gray-500 block">Consumo</span>{kpis.consumoKwh != null ? `${kpis.consumoKwh.toLocaleString('es-ES')} kWh` : '—'}</div>
                  <div><span className="text-xs text-gray-500 block">Emisiones</span>{kpis.co2Kg != null ? `${(kpis.co2Kg / 1000).toFixed(1)} t CO₂` : '—'}</div>
                  <div><span className="text-xs text-gray-500 block">Agua</span>{kpis.aguaM3 != null ? `${kpis.aguaM3.toLocaleString('es-ES')} m³` : '—'}</div>
                  <div><span className="text-xs text-gray-500 block">Calidad de aire</span>{kpis.iaqScore != null ? `${kpis.iaqScore}/100` : '—'}</div>
                  <div><span className="text-xs text-gray-500 block">Renovable</span>{kpis.renovablePct != null ? `${kpis.renovablePct}%` : '—'}</div>
                </div>
              )}
            </Card>
          )}

          <Card>
            {tareas.length === 0 ? (
              <Empty>
                Este proyecto aún no tiene plan de trabajos.
                {oferta?.estimacion
                  ? ' Genera el plan desde la oferta con el botón de arriba: una tarea por disciplina con sus horas.'
                  : ' Añade tareas manualmente o genera el esqueleto básico.'}
              </Empty>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="py-2 px-2 w-28">Estado</th>
                    <th className="py-2 px-2">Tarea</th>
                    <th className="py-2 px-2 w-44">Responsable</th>
                    <th className="py-2 px-2 w-24">Previstas</th>
                    <th className="py-2 px-2 w-24">Reales</th>
                    <th className="py-2 px-2 w-32">Fecha límite</th>
                    <th className="py-2 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {tareas.map((t) => {
                    const e = ETIQUETA_ESTADO[t.estado];
                    return (
                      <tr key={t.id} className={`border-b border-gray-100 ${t.estado === 'hecha' ? 'opacity-60' : ''}`}>
                        <td className="px-2 py-1">
                          <button
                            className={`px-2 py-0.5 rounded-full text-xs ${e.color}`}
                            title="Clic para cambiar el estado"
                            onClick={() => actualizar(t.id, { estado: SIGUIENTE_ESTADO[t.estado] })}
                          >
                            {e.texto}
                          </button>
                        </td>
                        <td className="px-2 py-1">
                          <input
                            className={`${inputCls} py-1`}
                            value={t.titulo}
                            onChange={(ev) => actualizar(t.id, { titulo: ev.target.value })}
                          />
                          {t.disciplina && <span className="text-xs text-gray-400">{t.disciplina}</span>}
                        </td>
                        <td className="px-2 py-1">
                          <select
                            className={`${inputCls} py-1 text-xs`}
                            value={t.contactoId || ''}
                            onChange={(ev) => actualizar(t.id, { contactoId: ev.target.value || undefined })}
                          >
                            <option value="">—</option>
                            {colaboradores.map((c) => (
                              <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                            {t.contactoId && !colaboradores.some((c) => c.id === t.contactoId) && (
                              <option value={t.contactoId}>{nombreContacto(t.contactoId) || t.contactoId}</option>
                            )}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number" step="0.5" min="0"
                            className={`${inputCls} py-1`}
                            value={t.horasPrevistas}
                            onChange={(ev) => actualizar(t.id, { horasPrevistas: num(ev.target.value) })}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number" step="0.5" min="0"
                            className={`${inputCls} py-1 ${t.horasReales > t.horasPrevistas && t.horasPrevistas > 0 ? 'border-red-400' : ''}`}
                            value={t.horasReales}
                            onChange={(ev) => actualizar(t.id, { horasReales: num(ev.target.value) })}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="date"
                            className={`${inputCls} py-1 text-xs`}
                            value={t.fechaLimite || ''}
                            onChange={(ev) => actualizar(t.id, { fechaLimite: ev.target.value || undefined })}
                          />
                        </td>
                        <td className="px-2 py-1 text-right">
                          <Btn variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => borrar(t)}>✕</Btn>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default Trabajos;
