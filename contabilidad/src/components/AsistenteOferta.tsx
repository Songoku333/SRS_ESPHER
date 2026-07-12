import React, { useMemo, useState } from 'react';
import { LineaServicio, LINEAS_SERVICIO, AppData, CATEGORIAS_GASTO, CategoriaGasto } from '../types';
import {
  benchmarksHistorico,
  sugerirParametros,
  calcularPresupuesto,
  evaluarPrecio,
  ajustarHorasAPrecio,
  construirEstimacion,
  referenciaMercado,
  precioMercadoEquipo,
  horasPorSuperficie,
  desglosarDisciplinas,
  Complejidad,
  ParametrosPresupuesto,
  MIN_FACTURAS,
} from '../lib/estimador';
import {
  NIVELES,
  ESTANDARES_REPORTE,
  calcularModuloSostenibilidad,
  NivelSostenibilidad,
  EstandarId,
} from '../lib/sostenibilidad';
import { PLANTILLAS } from '../lib/plantillas';
import { fmtEur } from '../lib/format';
import { Btn, Modal, Field, inputCls } from './ui';

const fmtPct = (n: number) => `${(n * 100).toFixed(1).replace('.', ',')}%`;
const num = (s: string) => parseFloat(s) || 0;

interface Props {
  data: AppData;
  clientes: { id: string; nombre: string }[];
  onCrear: (r: {
    clienteNombre: string;
    titulo: string;
    linea: LineaServicio;
    importe: number;
    superficieM2?: number;
    estimacion: ReturnType<typeof construirEstimacion>;
  }) => void;
  onClose: () => void;
}

/** Asistente de preparación de ofertas: estima horas de colaborador por rol,
 *  gastos directos y precio recomendado a partir del histórico + mercado. */
const AsistenteOferta: React.FC<Props> = ({ data, clientes, onCrear, onClose }) => {
  const benchmarks = useMemo(() => benchmarksHistorico(data), [data]);

  const [clienteNombre, setClienteNombre] = useState('');
  const [titulo, setTitulo] = useState('');
  const [linea, setLinea] = useState<LineaServicio>('Ingeniería MEP');
  const [complejidad, setComplejidad] = useState<Complejidad>('medio');
  const [superficie, setSuperficie] = useState('');
  const [precioObjetivo, setPrecioObjetivo] = useState('');
  const [params, setParams] = useState<ParametrosPresupuesto | null>(null);
  const [notas, setNotas] = useState<string[]>([]);
  const [pesos, setPesos] = useState<{ nombre: string; peso: number }[]>([]);
  const [sostActivo, setSostActivo] = useState(false);
  const [sostNivel, setSostNivel] = useState<NivelSostenibilidad>('avanzado');
  const [sostEstandares, setSostEstandares] = useState<EstandarId[]>([]);

  const b = benchmarks[linea];
  const mercado = referenciaMercado(linea);

  const m2 = num(superficie);

  const generar = () => {
    const objetivo = num(precioObjetivo) || undefined;
    const s = sugerirParametros(data, linea, objetivo, complejidad, b, m2 > 0 ? m2 : undefined);
    setParams(s.params);
    setNotas(s.notas);
    setPesos((PLANTILLAS[linea] ?? PLANTILLAS['Otros']).disciplinas?.map((d) => ({ ...d })) ?? []);
  };

  // Módulo de sostenibilidad: sus horas y hardware se suman a la oferta
  const modulo = sostActivo ? calcularModuloSostenibilidad(m2, sostNivel, sostEstandares) : null;
  const paramsEf: ParametrosPresupuesto | null = params
    ? modulo
      ? { ...params, equipo: [...params.equipo, ...modulo.equipo], gastos: [...params.gastos, ...modulo.gastos] }
      : params
    : null;

  const resultado = paramsEf ? calcularPresupuesto(paramsEf) : null;
  const objetivo = num(precioObjetivo);
  const evalObjetivo = paramsEf && objetivo > 0 ? evaluarPrecio(paramsEf, objetivo) : null;
  const importeFinal = objetivo > 0 ? objetivo : (resultado?.precioRecomendado ?? 0);
  const evalFinal = paramsEf && importeFinal > 0 ? evaluarPrecio(paramsEf, importeFinal) : null;

  // Desglose técnico por disciplina de las horas base (sin el módulo)
  const base = params ? calcularPresupuesto(params) : null;
  const disciplinas =
    params && base && pesos.length > 0 ? desglosarDisciplinas(pesos, base.totalHoras, base.costeEquipo) : [];

  const semaforo = (m: number) =>
    m >= 0.1495 ? 'text-green-700 bg-green-50 border-green-200' : m >= 0.05 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-700 bg-red-50 border-red-200';

  const setEquipo = (i: number, campo: 'horas' | 'costeHora', valor: number) => {
    if (!params) return;
    const equipo = params.equipo.map((e, j) => (j === i ? { ...e, [campo]: valor } : e));
    setParams({ ...params, equipo });
  };
  const setGasto = (i: number, base: number) => {
    if (!params) return;
    setParams({ ...params, gastos: params.gastos.map((g, j) => (j === i ? { ...g, base } : g)) });
  };
  const addGasto = () => {
    if (!params) return;
    setParams({
      ...params,
      gastos: [...params.gastos, { concepto: 'Otro gasto', categoria: 'Otros' as CategoriaGasto, base: 0 }],
    });
  };
  const setParam = (campo: 'contingenciaPct' | 'comercialPct' | 'generalesPct' | 'margenObjetivoPct', valor: number) => {
    if (!params) return;
    setParams({ ...params, [campo]: valor });
  };

  const ajustarAlObjetivo = () => {
    if (!params || objetivo <= 0) return;
    setParams({ ...params, equipo: ajustarHorasAPrecio(params, objetivo) });
  };

  const crear = () => {
    if (!paramsEf || !evalFinal) return;
    onCrear({
      clienteNombre,
      titulo,
      linea,
      importe: importeFinal,
      superficieM2: m2 > 0 ? m2 : undefined,
      estimacion: construirEstimacion(paramsEf, importeFinal, {
        superficieM2: m2 > 0 ? m2 : undefined,
        disciplinas,
        sostenibilidad: modulo
          ? {
              nivel: NIVELES[sostNivel].etiqueta,
              estandares: [...sostEstandares],
              horas: modulo.horas,
              hardware: modulo.hardware,
              saasAnual: modulo.saasAnual,
            }
          : undefined,
      }),
    });
  };

  return (
    <Modal title="🧮 Preparar oferta — costes y recursos" onClose={onClose} wide>
      <div className="space-y-4">
        {/* Datos básicos */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cliente *">
            <input className={inputCls} list="ao-clientes" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="Nombre del cliente" />
            <datalist id="ao-clientes">
              {clientes.map((c) => (
                <option key={c.id} value={c.nombre} />
              ))}
            </datalist>
          </Field>
          <Field label="Título / objeto *">
            <input className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Proyecto MEP nave logística…" />
          </Field>
          <Field label="Línea de servicio">
            <select className={inputCls} value={linea} onChange={(e) => { setLinea(e.target.value as LineaServicio); setParams(null); }}>
              {LINEAS_SERVICIO.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Complejidad">
            <select className={inputCls} value={complejidad} onChange={(e) => { setComplejidad(e.target.value as Complejidad); setParams(null); }}>
              <option value="sencillo">Sencillo (−20% horas)</option>
              <option value="medio">Medio</option>
              <option value="complejo">Complejo (+30% horas y contingencia)</option>
            </select>
          </Field>
          <Field label="Superficie del activo (m²)">
            <input
              type="number"
              step="10"
              min="0"
              className={inputCls}
              value={superficie}
              onChange={(e) => { setSuperficie(e.target.value); setParams(null); }}
              placeholder="La variable clave del sector"
            />
          </Field>
          <Field label="Precio objetivo (€, opcional)">
            <input type="number" step="100" className={inputCls} value={precioObjetivo} onChange={(e) => setPrecioObjetivo(e.target.value)} placeholder={b.ticketMedio > 0 ? `Tu ticket medio: ${b.ticketMedio.toFixed(0)} €` : 'Déjalo vacío para que lo proponga el asistente'} />
          </Field>
        </div>

        {/* Base de conocimiento: tu histórico + referencia oficial de mercado */}
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm">
            <div className="font-medium text-sky-900 mb-1">📚 Tu histórico en «{linea}»</div>
            {b.nFacturas === 0 ? (
              <p className="text-sky-800">Sin facturas clasificadas en esta línea todavía: usaré la referencia de mercado. La estimación mejorará sola a medida que factures e imputes gastos.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-sky-900">
                <div><span className="text-xs text-sky-600 block">Facturas</span>{b.nFacturas}</div>
                <div><span className="text-xs text-sky-600 block">Ticket medio</span>{fmtEur(b.ticketMedio)}</div>
                <div><span className="text-xs text-sky-600 block">Coste directo real</span>{b.pctGastosDirectos !== null ? fmtPct(b.pctGastosDirectos) : '—'}</div>
                <div><span className="text-xs text-sky-600 block">Margen real (cerradas)</span>{b.margenReal !== null ? fmtPct(b.margenReal) : '—'}</div>
              </div>
            )}
            {b.nFacturas > 0 && b.nFacturas < MIN_FACTURAS && (
              <p className="text-xs text-sky-700 mt-1">Con menos de {MIN_FACTURAS} facturas el asistente aún se apoya en tarifas de mercado.</p>
            )}
          </div>
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm">
            <div className="font-medium text-violet-900 mb-1">🇪🇸 Mercado España (referencia)</div>
            <div className="grid grid-cols-2 gap-2 text-violet-900">
              <div><span className="text-xs text-violet-600 block">Venta media</span>{mercado.ventaMediaHora.toFixed(0)} €/h</div>
              <div><span className="text-xs text-violet-600 block">Coste colaborador medio</span>{mercado.costeMedioHora.toFixed(0)} €/h</div>
              <div className="col-span-2"><span className="text-xs text-violet-600 block">Ticket típico del trabajo</span>{fmtEur(mercado.ticketMercado[0])} – {fmtEur(mercado.ticketMercado[1])}</div>
              {m2 > 0 && (() => {
                const h = horasPorSuperficie(linea, m2, complejidad);
                const precio = h * mercado.ventaMediaHora;
                return (
                  <div className="col-span-2">
                    <span className="text-xs text-violet-600 block">Para {m2.toLocaleString('es-ES')} m²</span>
                    ≈ {h} h · {fmtEur(precio)} ({(precio / m2).toFixed(2)} €/m²)
                  </div>
                );
              })()}
            </div>
            <p className="text-xs text-violet-700 mt-1">Medias orientativas del sector en España (honorarios liberalizados); editables por rol en la tabla.</p>
          </div>
        </div>

        {!params ? (
          <div className="text-center py-2">
            <Btn onClick={generar}>Calcular propuesta</Btn>
          </div>
        ) : (
          <>
            {notas.length > 0 && (
              <ul className="text-xs text-gray-500 list-disc pl-4">
                {notas.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            )}

            {/* Equipo: horas por rol */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-sm">👥 Recursos: horas de colaborador por rol</h3>
                {objetivo > 0 && !sostActivo && (
                  <Btn variant="ghost" onClick={ajustarAlObjetivo}>⚖ Ajustar horas al precio objetivo</Btn>
                )}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="py-1">Rol / disciplina</th>
                    <th className="py-1 w-24">Horas</th>
                    <th className="py-1 w-28">Coste €/h</th>
                    <th className="py-1 w-24" title="Tarifa de venta media de mercado en España para este rol">Venta mercado</th>
                    <th className="py-1 w-28 text-right">Coste</th>
                  </tr>
                </thead>
                <tbody>
                  {params.equipo.map((e, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1">{e.rol}</td>
                      <td>
                        <input type="number" step="0.5" min="0" className={`${inputCls} py-1`} value={e.horas} onChange={(ev) => setEquipo(i, 'horas', num(ev.target.value))} />
                      </td>
                      <td>
                        <input type="number" step="0.5" min="0" className={`${inputCls} py-1`} value={e.costeHora} onChange={(ev) => setEquipo(i, 'costeHora', num(ev.target.value))} />
                      </td>
                      <td className="text-violet-700 text-xs whitespace-nowrap">{e.ventaHora ? `${e.ventaHora} €/h` : '—'}</td>
                      <td className="text-right whitespace-nowrap">{fmtEur(e.horas * e.costeHora)}</td>
                    </tr>
                  ))}
                  <tr className="font-medium">
                    <td className="py-1">Total equipo{sostActivo ? ' (sin módulo 🌱)' : ''}</td>
                    <td>{base!.totalHoras} h</td>
                    <td></td>
                    <td></td>
                    <td className="text-right">{fmtEur(base!.costeEquipo)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Desglose técnico por actividad/disciplina */}
            {disciplinas.length > 0 && (
              <div>
                <h3 className="font-medium text-sm mb-1">⚡ Desglose por actividad / disciplina</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="py-1">Disciplina</th>
                      <th className="py-1 w-24">Peso %</th>
                      <th className="py-1 w-24 text-right">Horas</th>
                      <th className="py-1 w-28 text-right">Coste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pesos.map((d, i) => {
                      const desglose = disciplinas.find((x) => x.nombre === d.nombre);
                      return (
                        <tr key={d.nombre} className="border-b border-gray-100">
                          <td className="py-1">{d.nombre}</td>
                          <td>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              className={`${inputCls} py-1`}
                              value={d.peso}
                              onChange={(ev) =>
                                setPesos(pesos.map((x, j) => (j === i ? { ...x, peso: num(ev.target.value) } : x)))
                              }
                            />
                          </td>
                          <td className="text-right">{desglose ? `${desglose.horas} h` : '—'}</td>
                          <td className="text-right whitespace-nowrap">{desglose ? fmtEur(desglose.coste) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="text-xs text-gray-400 mt-1">
                  Reparto de las {base!.totalHoras} h técnicas según el peso de cada disciplina (los pesos se normalizan si no suman 100).
                </p>
              </div>
            )}

            {/* Gastos directos */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-sm">🧾 Gastos directos previstos</h3>
                <Btn variant="ghost" onClick={addGasto}>+ Añadir</Btn>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {params.gastos.map((g, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1">
                        <input
                          className={`${inputCls} py-1`}
                          value={g.concepto}
                          onChange={(ev) => setParams({ ...params, gastos: params.gastos.map((x, j) => (j === i ? { ...x, concepto: ev.target.value } : x)) })}
                        />
                      </td>
                      <td className="w-56 px-1">
                        <select
                          className={`${inputCls} py-1 text-xs`}
                          value={g.categoria}
                          onChange={(ev) => setParams({ ...params, gastos: params.gastos.map((x, j) => (j === i ? { ...x, categoria: ev.target.value as CategoriaGasto } : x)) })}
                        >
                          {CATEGORIAS_GASTO.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="w-28">
                        <input type="number" step="10" min="0" className={`${inputCls} py-1`} value={g.base} onChange={(ev) => setGasto(i, num(ev.target.value))} />
                      </td>
                    </tr>
                  ))}
                  <tr className="font-medium">
                    <td className="py-1">Total gastos directos</td>
                    <td></td>
                    <td className="text-right pr-2">{fmtEur(resultado!.gastosDirectos)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Módulo opcional: sostenibilidad inteligente */}
            <div className={`rounded-lg border p-3 ${sostActivo ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={sostActivo} onChange={(e) => setSostActivo(e.target.checked)} />
                <span>
                  <span className="font-medium text-sm">🌱 Módulo de sostenibilidad inteligente (opcional)</span>
                  <span className="block text-xs text-gray-500">
                    Inmótica y sensórica conectadas al BMS: eficiencia, CO₂, calidad de aire y confort, con KPIs reportables
                    vía <span className="font-medium">EasyESG.pro</span>. Se puede ofertar solo o como extra de cualquier línea.
                  </span>
                </span>
              </label>
              {sostActivo && modulo && (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Field label="Alcance">
                      <select className={inputCls} value={sostNivel} onChange={(e) => setSostNivel(e.target.value as NivelSostenibilidad)}>
                        {(Object.keys(NIVELES) as NivelSostenibilidad[]).map((n) => (
                          <option key={n} value={n}>{NIVELES[n].etiqueta}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">{NIVELES[sostNivel].descripcion}</p>
                    </Field>
                    <Field label="Marcos de reporte (setup incluido)">
                      <div className="space-y-1">
                        {ESTANDARES_REPORTE.map((e) => (
                          <label key={e.id} className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={sostEstandares.includes(e.id)}
                              onChange={(ev) =>
                                setSostEstandares(
                                  ev.target.checked ? [...sostEstandares, e.id] : sostEstandares.filter((x) => x !== e.id)
                                )
                              }
                            />
                            {e.nombre} <span className="text-gray-400">+{e.horasSetup} h</span>
                          </label>
                        ))}
                      </div>
                    </Field>
                  </div>
                  <div className="rounded border border-emerald-200 bg-white p-2">
                    {modulo.equipo.map((e) => (
                      <div key={e.rol} className="flex justify-between text-xs py-0.5">
                        <span>{e.rol}</span>
                        <span className="whitespace-nowrap">{e.horas} h × {e.costeHora} €/h = {fmtEur(e.horas * e.costeHora)}</span>
                      </div>
                    ))}
                    {modulo.gastos.map((g) => (
                      <div key={g.concepto} className="flex justify-between text-xs py-0.5 text-gray-600">
                        <span>{g.concepto}</span>
                        <span className="whitespace-nowrap">{fmtEur(g.base)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs pt-1 mt-1 border-t border-emerald-100 font-medium">
                      <span>Módulo: {modulo.horas} h de servicio + hardware</span>
                      <span>{fmtEur(modulo.horas ? modulo.equipo.reduce((s, e) => s + e.horas * e.costeHora, 0) + modulo.hardware : modulo.hardware)}</span>
                    </div>
                    <div className="flex justify-between text-xs py-0.5 text-emerald-700 font-medium">
                      <span>Suscripción EasyESG.pro (recurrente, se factura aparte)</span>
                      <span>{fmtEur(modulo.saasAnual)}/año</span>
                    </div>
                  </div>
                  {modulo.notas.map((n, i) => (
                    <p key={i} className="text-xs text-emerald-800">{n}</p>
                  ))}
                  {m2 <= 0 && (
                    <p className="text-xs text-amber-700">⚠ Sin superficie, el módulo se dimensiona para un activo tipo de 1.000 m²: introduce los m² arriba para afinarlo.</p>
                  )}
                </div>
              )}
            </div>

            {/* Parámetros */}
            <div className="grid grid-cols-4 gap-3">
              <Field label="Contingencia %">
                <input type="number" step="1" min="0" className={inputCls} value={params.contingenciaPct} onChange={(e) => setParam('contingenciaPct', num(e.target.value))} />
              </Field>
              <Field label="Comercial %">
                <input type="number" step="1" min="0" className={inputCls} value={params.comercialPct} onChange={(e) => setParam('comercialPct', num(e.target.value))} />
              </Field>
              <Field label="Gastos generales %">
                <input type="number" step="1" min="0" className={inputCls} value={params.generalesPct} onChange={(e) => setParam('generalesPct', num(e.target.value))} />
              </Field>
              <Field label="Margen objetivo %">
                <input type="number" step="1" min="0" className={inputCls} value={params.margenObjetivoPct} onChange={(e) => setParam('margenObjetivoPct', num(e.target.value))} />
              </Field>
            </div>

            {/* Resultado */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm space-y-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div><span className="text-xs text-gray-500 block">Coste total</span><span className="font-medium">{fmtEur(resultado!.costeTotal)}</span></div>
                <div><span className="text-xs text-gray-500 block">Precio mínimo viable</span><span className="font-medium">{fmtEur(resultado!.precioMinimo)}</span></div>
                <div><span className="text-xs text-gray-500 block">Precio recomendado</span><span className="font-semibold text-teal-700">{fmtEur(resultado!.precioRecomendado)}</span></div>
                <div>
                  <span className="text-xs text-gray-500 block">{m2 > 0 ? 'Tarifa efectiva · €/m²' : 'Tarifa efectiva'}</span>
                  <span className="font-medium">
                    {resultado!.tarifaEfectiva > 0 ? `${resultado!.tarifaEfectiva.toFixed(0)} €/h` : '—'}
                    {m2 > 0 && importeFinal > 0 ? ` · ${(importeFinal / m2).toFixed(2)} €/m²` : ''}
                  </span>
                </div>
              </div>
              {sostActivo && modulo && (
                <p className="text-xs text-emerald-700">
                  🌱 Incluye el módulo de sostenibilidad ({modulo.horas} h + {fmtEur(modulo.hardware)} de sensórica/BMS) ·
                  suscripción EasyESG.pro de {fmtEur(modulo.saasAnual)}/año aparte.
                </p>
              )}
              {(() => {
                const pm = precioMercadoEquipo(paramsEf!.equipo) + resultado!.gastosDirectos;
                if (pm <= 0 || importeFinal <= 0) return null;
                const dif = (importeFinal - pm) / pm;
                return (
                  <p className="text-xs text-violet-700">
                    🇪🇸 Este trabajo a precio de mercado ({resultado!.totalHoras} h × tarifas de venta + gastos directos): {fmtEur(pm)} —{' '}
                    {Math.abs(dif) < 0.05
                      ? 'tu precio está en línea con el mercado.'
                      : dif > 0
                        ? `tu precio va un ${fmtPct(dif)} por encima.`
                        : `tu precio va un ${fmtPct(-dif)} por debajo: tienes recorrido para subirlo.`}
                  </p>
                );
              })()}
              {evalObjetivo && (
                <div className={`mt-2 rounded border px-3 py-2 ${semaforo(evalObjetivo.margen)}`}>
                  A tu precio objetivo de {fmtEur(objetivo)}: beneficio neto {fmtEur(evalObjetivo.beneficio)} ({fmtPct(evalObjetivo.margen)})
                  · la empresa retiene {fmtEur(evalObjetivo.retornoEmpresa)} (generales + beneficio).
                  {evalObjetivo.margen < 0.05 && ' ⚠ Por debajo del umbral rentable: sube el precio o recorta horas.'}
                </div>
              )}
              {!evalObjetivo && evalFinal && (
                <div className={`mt-2 rounded border px-3 py-2 ${semaforo(evalFinal.margen)}`}>
                  Al precio recomendado: beneficio neto {fmtEur(evalFinal.beneficio)} ({fmtPct(evalFinal.margen)}) · la empresa retiene {fmtEur(evalFinal.retornoEmpresa)}.
                </div>
              )}
              {b.margenReal !== null && (
                <p className="text-xs text-gray-500">Referencia: tu margen real medio en {linea} (facturas cerradas) es {fmtPct(b.margenReal)}.</p>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <Btn variant="secondary" onClick={generar}>↺ Recalcular sugerencia</Btn>
              <div className="flex gap-2">
                <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
                <Btn onClick={crear} disabled={!clienteNombre.trim() || !titulo.trim() || importeFinal <= 0}>
                  Crear oferta por {fmtEur(importeFinal)}
                </Btn>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default AsistenteOferta;
