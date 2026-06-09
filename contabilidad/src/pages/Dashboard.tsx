import React, { useMemo, useState } from 'react';
import { useAppData } from '../lib/store';
import { calcularKPIs } from '../lib/calculos';
import { fmtEur, fmtMes, mesDe } from '../lib/format';
import { Card, PageTitle, Empty, inputCls } from '../components/ui';
import { LINEAS_SERVICIO } from '../types';

const KpiCard: React.FC<{ label: string; value: string; sub?: string; tone?: 'pos' | 'neg' | 'neutral' }> = ({
  label,
  value,
  sub,
  tone = 'neutral',
}) => (
  <Card className="p-4">
    <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
    <div
      className={`text-2xl font-bold mt-1 ${
        tone === 'pos' ? 'text-green-600' : tone === 'neg' ? 'text-red-600' : 'text-gray-900'
      }`}
    >
      {value}
    </div>
    {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
  </Card>
);

const BarChart: React.FC<{ datos: { etiqueta: string; ingresos: number; gastos: number }[] }> = ({
  datos,
}) => {
  const max = Math.max(1, ...datos.map((d) => Math.max(d.ingresos, d.gastos)));
  return (
    <div className="flex items-end gap-3 h-44 mt-4">
      {datos.map((d) => (
        <div key={d.etiqueta} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="flex items-end gap-1 w-full justify-center h-36">
            <div
              className="w-3.5 bg-teal-500 rounded-t"
              style={{ height: `${(d.ingresos / max) * 100}%` }}
              title={`Ingresos: ${fmtEur(d.ingresos)}`}
            />
            <div
              className="w-3.5 bg-red-400 rounded-t"
              style={{ height: `${(d.gastos / max) * 100}%` }}
              title={`Gastos: ${fmtEur(d.gastos)}`}
            />
          </div>
          <div className="text-[10px] text-gray-500 truncate">{d.etiqueta}</div>
        </div>
      ))}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const data = useAppData();
  const [anyo, setAnyo] = useState(new Date().getFullYear());
  const kpis = useMemo(() => calcularKPIs(data, anyo), [data, anyo]);

  const anyos = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    data.facturas.forEach((f) => set.add(parseInt(f.fecha.slice(0, 4), 10)));
    data.gastos.forEach((g) => set.add(parseInt(g.fecha.slice(0, 4), 10)));
    return [...set].filter((n) => !isNaN(n)).sort((a, b) => b - a);
  }, [data]);

  const porMes = useMemo(() => {
    const meses: Record<string, { ingresos: number; gastos: number }> = {};
    for (let m = 1; m <= 12; m++) {
      meses[`${anyo}-${String(m).padStart(2, '0')}`] = { ingresos: 0, gastos: 0 };
    }
    data.facturas
      .filter((f) => f.estado !== 'anulada' && f.fecha.startsWith(String(anyo)))
      .forEach((f) => {
        const m = mesDe(f.fecha);
        if (meses[m]) meses[m].ingresos += f.base;
      });
    data.gastos
      .filter((g) => g.fecha.startsWith(String(anyo)))
      .forEach((g) => {
        const m = mesDe(g.fecha);
        if (meses[m]) meses[m].gastos += g.base;
      });
    return Object.entries(meses).map(([m, v]) => ({ etiqueta: fmtMes(m), ...v }));
  }, [data, anyo]);

  const porLinea = useMemo(() => {
    const map = new Map<string, number>();
    data.facturas
      .filter((f) => f.estado !== 'anulada' && f.fecha.startsWith(String(anyo)))
      .forEach((f) => {
        const proy = data.proyectos.find((p) => p.id === f.proyectoId);
        const linea = proy?.lineaServicio || 'Otros';
        map.set(linea, (map.get(linea) || 0) + f.base);
      });
    return LINEAS_SERVICIO.map((l) => ({ linea: l, importe: map.get(l) || 0 })).filter(
      (x) => x.importe > 0
    );
  }, [data, anyo]);

  const totalLineas = porLinea.reduce((s, x) => s + x.importe, 0);
  const sinDatos =
    data.facturas.length === 0 && data.gastos.length === 0 && data.ofertas.length === 0;

  return (
    <div>
      <PageTitle
        title="Panel de control"
        subtitle="Resumen financiero de la ingeniería"
        actions={
          <select value={anyo} onChange={(e) => setAnyo(parseInt(e.target.value, 10))} className={inputCls}>
            {anyos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        }
      />

      {sinDatos && (
        <Card className="p-6 mb-6 bg-teal-50 border-teal-200">
          <h3 className="font-semibold text-teal-900">Empieza en 2 pasos</h3>
          <ol className="list-decimal list-inside text-sm text-teal-800 mt-2 space-y-1">
            <li>
              Ve a <strong>Importar Excel</strong> y sube tu hoja de facturas y los extractos del banco
              (cuenta, tarjeta y transferencias).
            </li>
            <li>
              Crea tus <strong>proyectos</strong> y asigna el reparto con colaboradores y proveedores: la app
              calcula sola lo que toca liquidar a cada uno según lo cobrado.
            </li>
          </ol>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label={`Facturado ${anyo} (base)`} value={fmtEur(kpis.facturadoAnyo)} />
        <KpiCard
          label="Pendiente de cobro"
          value={fmtEur(kpis.pendienteCobro)}
          tone={kpis.pendienteCobro > 0 ? 'neg' : 'neutral'}
          sub="Facturas emitidas sin cobrar"
        />
        <KpiCard label={`Gastos ${anyo} (base)`} value={fmtEur(kpis.gastosAnyo)} />
        <KpiCard
          label={`Resultado ${anyo}`}
          value={fmtEur(kpis.resultadoAnyo)}
          tone={kpis.resultadoAnyo >= 0 ? 'pos' : 'neg'}
          sub="Facturado − gastos (base)"
        />
        <KpiCard
          label="Liquidaciones pendientes"
          value={fmtEur(kpis.liquidacionesPendientes)}
          sub="Con colaboradores y proveedores"
        />
        <KpiCard
          label="Ofertas vivas"
          value={String(kpis.ofertasVivas)}
          sub={fmtEur(kpis.importeOfertasVivas)}
        />
        <KpiCard label={`IVA repercutido ${anyo}`} value={fmtEur(kpis.ivaRepercutido)} />
        <KpiCard
          label={`IVA soportado ${anyo}`}
          value={fmtEur(kpis.ivaSoportado)}
          sub={`Diferencia: ${fmtEur(kpis.ivaRepercutido - kpis.ivaSoportado)}`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-gray-800">Ingresos vs gastos por mes ({anyo})</h3>
          <div className="flex gap-4 text-xs text-gray-500 mt-1">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-teal-500 rounded-sm inline-block" /> Ingresos (base)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-red-400 rounded-sm inline-block" /> Gastos (base)
            </span>
          </div>
          <BarChart datos={porMes} />
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Facturación por línea de servicio ({anyo})</h3>
          {porLinea.length === 0 ? (
            <Empty>Sin facturas asignadas a proyectos este año.</Empty>
          ) : (
            <div className="space-y-3">
              {porLinea
                .sort((a, b) => b.importe - a.importe)
                .map((x) => (
                  <div key={x.linea}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{x.linea}</span>
                      <span className="font-medium">{fmtEur(x.importe)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full"
                        style={{ width: `${(x.importe / totalLineas) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
