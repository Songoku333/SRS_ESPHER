import React, { useMemo, useState } from 'react';
import { LineaServicio, LINEAS_SERVICIO, AppData, CATEGORIAS_GASTO, CategoriaGasto } from '../types';
import {
  benchmarksHistorico,
  sugerirParametros,
  calcularPresupuesto,
  evaluarPrecio,
  ajustarHorasAPrecio,
  construirEstimacion,
  Complejidad,
  ParametrosPresupuesto,
  MIN_FACTURAS,
} from '../lib/estimador';
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
  const [precioObjetivo, setPrecioObjetivo] = useState('');
  const [params, setParams] = useState<ParametrosPresupuesto | null>(null);
  const [notas, setNotas] = useState<string[]>([]);

  const b = benchmarks[linea];

  const generar = () => {
    const objetivo = num(precioObjetivo) || undefined;
    const s = sugerirParametros(data, linea, objetivo, complejidad, b);
    setParams(s.params);
    setNotas(s.notas);
  };

  const resultado = params ? calcularPresupuesto(params) : null;
  const objetivo = num(precioObjetivo);
  const evalObjetivo = params && objetivo > 0 ? evaluarPrecio(params, objetivo) : null;
  const importeFinal = objetivo > 0 ? objetivo : (resultado?.precioRecomendado ?? 0);
  const evalFinal = params && importeFinal > 0 ? evaluarPrecio(params, importeFinal) : null;

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
    if (!params || !evalFinal) return;
    onCrear({
      clienteNombre,
      titulo,
      linea,
      importe: importeFinal,
      estimacion: construirEstimacion(params, importeFinal),
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
          <Field label="Precio objetivo (€, opcional)" className="col-span-2">
            <input type="number" step="100" className={inputCls} value={precioObjetivo} onChange={(e) => setPrecioObjetivo(e.target.value)} placeholder={b.ticketMedio > 0 ? `Tu ticket medio: ${b.ticketMedio.toFixed(0)} €` : 'Déjalo vacío para que lo proponga el asistente'} />
          </Field>
        </div>

        {/* Base de conocimiento */}
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm">
          <div className="font-medium text-sky-900 mb-1">📚 Tu histórico en «{linea}»</div>
          {b.nFacturas === 0 ? (
            <p className="text-sky-800">Sin facturas clasificadas en esta línea todavía: usaré precios medios de mercado. La estimación mejorará sola a medida que factures e imputes gastos.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sky-900">
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
                {objetivo > 0 && (
                  <Btn variant="ghost" onClick={ajustarAlObjetivo}>⚖ Ajustar horas al precio objetivo</Btn>
                )}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="py-1">Rol / disciplina</th>
                    <th className="py-1 w-24">Horas</th>
                    <th className="py-1 w-28">Coste €/h</th>
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
                      <td className="text-right whitespace-nowrap">{fmtEur(e.horas * e.costeHora)}</td>
                    </tr>
                  ))}
                  <tr className="font-medium">
                    <td className="py-1">Total equipo</td>
                    <td>{resultado!.totalHoras} h</td>
                    <td></td>
                    <td className="text-right">{fmtEur(resultado!.costeEquipo)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

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
                <div><span className="text-xs text-gray-500 block">Tarifa efectiva</span><span className="font-medium">{resultado!.tarifaEfectiva > 0 ? `${resultado!.tarifaEfectiva.toFixed(0)} €/h` : '—'}</span></div>
              </div>
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
