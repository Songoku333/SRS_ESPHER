import React, { useMemo, useState } from 'react';
import { useAppData } from '../lib/store';
import { rentabilidadProyectos, totalesRentabilidad, Rango, RentabilidadProyecto } from '../lib/rentabilidad';
import { fmtEur, fmtDate } from '../lib/format';
import { Card, PageTitle, Table, Badge, badgeEstado, Empty, inputCls, Btn } from '../components/ui';

const KpiCard: React.FC<{ label: string; value: string; sub?: string; tone?: 'pos' | 'neg' | 'neutral' }> = ({
  label,
  value,
  sub,
  tone = 'neutral',
}) => (
  <Card className="p-4">
    <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
    <div
      className={`text-xl font-bold mt-1 ${
        tone === 'pos' ? 'text-green-600' : tone === 'neg' ? 'text-red-600' : 'text-gray-900'
      }`}
    >
      {value}
    </div>
    {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
  </Card>
);

const Detalle: React.FC<{ r: RentabilidadProyecto }> = ({ r }) => {
  const data = useAppData();
  const nombre = (id?: string) => (id ? data.contactos.find((c) => c.id === id)?.nombre || '—' : '—');
  return (
    <tr className="bg-gray-50/60">
      <td colSpan={9} className="px-4 py-3">
        <div className="grid lg:grid-cols-3 gap-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase mb-1">Facturas</h4>
            {r.facturas.length === 0 ? (
              <p className="text-xs text-gray-400">—</p>
            ) : (
              <ul className="text-xs space-y-1">
                {r.facturas.map((f) => (
                  <li key={f.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {f.numero} <Badge color={badgeEstado[f.estado]}>{f.estado}</Badge>
                    </span>
                    <span className="font-medium whitespace-nowrap">{fmtEur(f.base)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase mb-1">Gastos imputados</h4>
            {r.gastos.length === 0 ? (
              <p className="text-xs text-gray-400">—</p>
            ) : (
              <ul className="text-xs space-y-1">
                {r.gastos.map((g) => (
                  <li key={g.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {g.concepto} <Badge color={badgeEstado[g.estado]}>{g.estado}</Badge>
                    </span>
                    <span className="font-medium whitespace-nowrap">{fmtEur(g.base)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase mb-1">Liquidaciones a colaboradores</h4>
            {r.liquidaciones.length === 0 && r.liqEstimada === 0 ? (
              <p className="text-xs text-gray-400">—</p>
            ) : (
              <ul className="text-xs space-y-1">
                {r.liqEstimada > 0 && (
                  <li className="flex justify-between gap-2 text-gray-500">
                    <span>Reparto estimado (sobre facturado)</span>
                    <span className="font-medium whitespace-nowrap">{fmtEur(r.liqEstimada)}</span>
                  </li>
                )}
                {r.liquidaciones.map((l) => (
                  <li key={l.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {nombre(l.contactoId)} <Badge color={badgeEstado[l.estado]}>{l.estado}</Badge>
                    </span>
                    <span className="font-medium whitespace-nowrap">{fmtEur(l.importe)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

const Rentabilidad: React.FC = () => {
  const data = useAppData();
  const anyo = new Date().getFullYear();
  const [rango, setRango] = useState<Rango>({ desde: `${anyo}-01-01`, hasta: `${anyo}-12-31` });
  const [expandido, setExpandido] = useState<string | null>(null);

  const usarRango = rango.desde || rango.hasta ? rango : undefined;
  const filas = useMemo(() => rentabilidadProyectos(data, usarRango), [data, rango]);
  const tot = useMemo(() => totalesRentabilidad(filas), [filas]);

  const setPreset = (d: string, h: string) => setRango({ desde: d, hasta: h });

  return (
    <div>
      <PageTitle
        title="Rentabilidad"
        subtitle="Beneficio neto por proyecto y global, cruzando facturas, gastos y liquidaciones"
      />

      <Card className="p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-gray-600 mb-1">Desde</span>
            <input
              type="date"
              className={inputCls}
              value={rango.desde}
              onChange={(e) => setRango({ ...rango, desde: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-600 mb-1">Hasta</span>
            <input
              type="date"
              className={inputCls}
              value={rango.hasta}
              onChange={(e) => setRango({ ...rango, hasta: e.target.value })}
            />
          </label>
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => setPreset(`${anyo}-01-01`, `${anyo}-12-31`)}>
              {anyo}
            </Btn>
            <Btn variant="secondary" onClick={() => setPreset(`${anyo - 1}-01-01`, `${anyo - 1}-12-31`)}>
              {anyo - 1}
            </Btn>
            <Btn variant="secondary" onClick={() => setPreset('', '')}>
              Todo
            </Btn>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Facturado (base)" value={fmtEur(tot.facturado)} sub={`Cobrado: ${fmtEur(tot.cobrado)}`} />
        <KpiCard
          label="Costes (gastos + reparto)"
          value={fmtEur(tot.gastosBase + tot.liqEstimada)}
          sub={`Gastos ${fmtEur(tot.gastosBase)} · reparto ${fmtEur(tot.liqEstimada)}`}
        />
        <KpiCard
          label="Beneficio neto estimado"
          value={fmtEur(tot.beneficio)}
          tone={tot.beneficio >= 0 ? 'pos' : 'neg'}
          sub={`Margen ${(tot.margen * 100).toFixed(1)}%`}
        />
        <KpiCard
          label="Beneficio en caja"
          value={fmtEur(tot.beneficioCaja)}
          tone={tot.beneficioCaja >= 0 ? 'pos' : 'neg'}
          sub="Cobrado − pagado realmente"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <KpiCard label="Pendiente de cobro" value={fmtEur(tot.pendienteCobro)} tone={tot.pendienteCobro > 0 ? 'neg' : 'neutral'} sub="Clientes" />
        <KpiCard label="Gastos pendientes de pago" value={fmtEur(tot.gastosPendientes)} tone={tot.gastosPendientes > 0 ? 'neg' : 'neutral'} sub="Proveedores" />
        <KpiCard label="Pendiente de liquidar" value={fmtEur(tot.liqPendiente)} tone={tot.liqPendiente > 0 ? 'neg' : 'neutral'} sub="Colaboradores (devengado)" />
      </div>

      <Card>
        <div className="px-4 pt-4">
          <h3 className="font-semibold text-gray-800 mb-1">Detalle por proyecto</h3>
          <p className="text-xs text-gray-500 mb-2">
            Pulsa una fila para ver sus facturas, gastos y liquidaciones. El beneficio estimado descuenta
            todos los costes imputados; el de caja, solo lo cobrado y pagado de verdad.
          </p>
        </div>
        {filas.length === 0 ? (
          <Empty>No hay datos en el periodo seleccionado.</Empty>
        ) : (
          <Table
            headers={['Proyecto', 'Cliente', 'Facturado', 'Cobrado', 'Gastos', 'Reparto', 'Beneficio', 'Margen', 'Pendiente']}
          >
            {filas.map((r) => {
              const key = r.proyectoId || 'sin';
              const pendienteTotal = r.pendienteCobro + r.gastosPendientes + r.liqPendiente;
              return (
                <React.Fragment key={key}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandido(expandido === key ? null : key)}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-gray-400 mr-1">{expandido === key ? '▾' : '▸'}</span>
                      {r.codigo} <span className="text-gray-400 text-xs">{r.nombre}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.clienteNombre}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtEur(r.facturado)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">{fmtEur(r.cobrado)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">{fmtEur(r.gastosBase)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">{fmtEur(r.liqEstimada)}</td>
                    <td className={`px-3 py-2 font-semibold whitespace-nowrap ${r.beneficio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmtEur(r.beneficio)}
                    </td>
                    <td className={`px-3 py-2 whitespace-nowrap ${r.margen >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                      {r.facturado > 0 ? `${(r.margen * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className={`px-3 py-2 whitespace-nowrap ${pendienteTotal > 0.005 ? 'text-amber-700' : 'text-gray-400'}`}>
                      {fmtEur(pendienteTotal)}
                    </td>
                  </tr>
                  {expandido === key && <Detalle r={r} />}
                </React.Fragment>
              );
            })}
            <tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
              <td className="px-3 py-2" colSpan={2}>
                TOTAL
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{fmtEur(tot.facturado)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{fmtEur(tot.cobrado)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{fmtEur(tot.gastosBase)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{fmtEur(tot.liqEstimada)}</td>
              <td className={`px-3 py-2 whitespace-nowrap ${tot.beneficio >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {fmtEur(tot.beneficio)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{(tot.margen * 100).toFixed(1)}%</td>
              <td className="px-3 py-2 whitespace-nowrap text-amber-700">
                {fmtEur(tot.pendienteCobro + tot.gastosPendientes + tot.liqPendiente)}
              </td>
            </tr>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default Rentabilidad;
