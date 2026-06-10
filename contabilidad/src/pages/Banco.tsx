import React, { useMemo, useState } from 'react';
import { useAppData, setState, uid } from '../lib/store';
import { MovimientoBancario, TipoMovimiento, TIPOS_MOVIMIENTO } from '../types';
import { fmtEur, fmtDate, hoy } from '../lib/format';
import { Card, PageTitle, Btn, Modal, Field, inputCls, Table, Badge, Empty } from '../components/ui';

interface FormMov {
  fecha: string;
  concepto: string;
  importe: string;
  tipo: TipoMovimiento;
  cuenta: string;
}

const Banco: React.FC = () => {
  const data = useAppData();
  const [filtroTipo, setFiltroTipo] = useState<TipoMovimiento | 'todos'>('todos');
  const [soloSinConciliar, setSoloSinConciliar] = useState(false);
  const [busca, setBusca] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<MovimientoBancario | null>(null);
  const [conciliando, setConciliando] = useState<MovimientoBancario | null>(null);
  const [form, setForm] = useState<FormMov>({ fecha: hoy(), concepto: '', importe: '', tipo: 'cuenta', cuenta: '' });

  const abrir = (m?: MovimientoBancario) => {
    if (m) {
      setEditando(m);
      setForm({ fecha: m.fecha, concepto: m.concepto, importe: String(m.importe), tipo: m.tipo, cuenta: m.cuenta || '' });
    } else {
      setEditando(null);
      setForm({ fecha: hoy(), concepto: '', importe: '', tipo: 'cuenta', cuenta: '' });
    }
    setAbierto(true);
  };

  const guardar = () => {
    const nuevo = {
      fecha: form.fecha,
      concepto: form.concepto,
      importe: parseFloat(form.importe) || 0,
      tipo: form.tipo,
      cuenta: form.cuenta || undefined,
    };
    if (editando) {
      setState((p) => ({
        ...p,
        movimientos: p.movimientos.map((x) => (x.id === editando.id ? { ...x, ...nuevo } : x)),
      }));
    } else {
      setState((p) => ({ ...p, movimientos: [...p.movimientos, { id: uid(), ...nuevo }] }));
    }
    setAbierto(false);
  };

  const borrar = (m: MovimientoBancario) => {
    if (confirm('¿Eliminar este movimiento?')) {
      setState((p) => ({ ...p, movimientos: p.movimientos.filter((x) => x.id !== m.id) }));
    }
  };

  /** Conciliar un movimiento con una factura: la marca cobrada. */
  const conciliarFactura = (m: MovimientoBancario, facturaId: string) => {
    setState((p) => ({
      ...p,
      movimientos: p.movimientos.map((x) =>
        x.id === m.id ? { ...x, conciliacion: { tipo: 'factura' as const, id: facturaId } } : x
      ),
      facturas: p.facturas.map((f) =>
        f.id === facturaId ? { ...f, estado: 'cobrada' as const, fechaCobro: m.fecha } : f
      ),
    }));
    setConciliando(null);
  };

  /** Conciliar con un gasto: lo marca pagado. */
  const conciliarGasto = (m: MovimientoBancario, gastoId: string) => {
    setState((p) => ({
      ...p,
      movimientos: p.movimientos.map((x) =>
        x.id === m.id ? { ...x, conciliacion: { tipo: 'gasto' as const, id: gastoId } } : x
      ),
      gastos: p.gastos.map((g) =>
        g.id === gastoId ? { ...g, estado: 'pagado' as const, fechaPago: m.fecha } : g
      ),
    }));
    setConciliando(null);
  };

  /** Conciliar con una liquidación: la marca pagada. */
  const conciliarLiquidacion = (m: MovimientoBancario, liqId: string) => {
    setState((p) => ({
      ...p,
      movimientos: p.movimientos.map((x) =>
        x.id === m.id ? { ...x, conciliacion: { tipo: 'liquidacion' as const, id: liqId } } : x
      ),
      liquidaciones: p.liquidaciones.map((l) =>
        l.id === liqId ? { ...l, estado: 'pagada' as const, fechaPago: m.fecha } : l
      ),
    }));
    setConciliando(null);
  };

  const desconciliar = (m: MovimientoBancario) => {
    setState((p) => ({
      ...p,
      movimientos: p.movimientos.map((x) => (x.id === m.id ? { ...x, conciliacion: undefined } : x)),
    }));
  };

  const descripcionConciliacion = (m: MovimientoBancario): string => {
    if (!m.conciliacion) return '';
    if (m.conciliacion.tipo === 'factura') {
      const f = data.facturas.find((x) => x.id === m.conciliacion!.id);
      return f ? `Factura ${f.numero}` : 'Factura';
    }
    if (m.conciliacion.tipo === 'gasto') {
      const g = data.gastos.find((x) => x.id === m.conciliacion!.id);
      return g ? `Gasto: ${g.concepto.slice(0, 30)}` : 'Gasto';
    }
    const l = data.liquidaciones.find((x) => x.id === m.conciliacion!.id);
    return l ? `Liquidación: ${l.concepto.slice(0, 30)}` : 'Liquidación';
  };

  const lista = useMemo(
    () =>
      data.movimientos
        .filter((m) => filtroTipo === 'todos' || m.tipo === filtroTipo)
        .filter((m) => !soloSinConciliar || !m.conciliacion)
        .filter((m) => !busca || m.concepto.toLowerCase().includes(busca.toLowerCase()))
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [data, filtroTipo, soloSinConciliar, busca]
  );

  const sinConciliar = data.movimientos.filter((m) => !m.conciliacion).length;
  const saldo = data.movimientos.reduce((s, m) => s + m.importe, 0);

  // Candidatos para conciliar: misma dirección del importe y diferencia < 0,5 € primero
  const candidatos = useMemo(() => {
    if (!conciliando) return { facturas: [], gastos: [], liquidaciones: [] };
    const imp = conciliando.importe;
    const cerca = (a: number, b: number) => Math.abs(Math.abs(a) - Math.abs(b)) < 0.5;
    if (imp >= 0) {
      const fs = data.facturas
        .filter((f) => f.estado === 'emitida')
        .sort((a, b) => Number(cerca(b.total, imp)) - Number(cerca(a.total, imp)));
      return { facturas: fs, gastos: [], liquidaciones: [] };
    }
    const gs = data.gastos
      .filter((g) => g.estado === 'pendiente')
      .sort((a, b) => Number(cerca(b.total, imp)) - Number(cerca(a.total, imp)));
    const ls = data.liquidaciones
      .filter((l) => l.estado === 'pendiente')
      .sort((a, b) => Number(cerca(b.importe, imp)) - Number(cerca(a.importe, imp)));
    return { facturas: [], gastos: gs, liquidaciones: ls };
  }, [conciliando, data]);

  const colorTipo: Record<TipoMovimiento, string> = {
    cuenta: 'bg-gray-100 text-gray-700',
    tarjeta: 'bg-purple-100 text-purple-700',
    transferencia_emitida: 'bg-red-100 text-red-700',
    transferencia_recibida: 'bg-green-100 text-green-700',
  };

  return (
    <div>
      <PageTitle
        title="Banco"
        subtitle={`Saldo neto de movimientos: ${fmtEur(saldo)} · ${sinConciliar} sin conciliar`}
        actions={<Btn onClick={() => abrir()}>+ Movimiento manual</Btn>}
      />

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input className={`${inputCls} max-w-xs`} placeholder="Buscar concepto..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select className={`${inputCls} max-w-[230px]`} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as any)}>
          <option value="todos">Todos los tipos</option>
          {Object.entries(TIPOS_MOVIMIENTO).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={soloSinConciliar} onChange={(e) => setSoloSinConciliar(e.target.checked)} />
          Solo sin conciliar
        </label>
      </div>

      <Card>
        {lista.length === 0 ? (
          <Empty>No hay movimientos. Importa tus extractos bancarios desde «Importar Excel».</Empty>
        ) : (
          <Table headers={['Fecha', 'Concepto', 'Tipo', 'Cuenta', 'Importe', 'Conciliado con', '']}>
            {lista.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(m.fecha)}</td>
                <td className="px-3 py-2 text-gray-700 max-w-[280px] truncate" title={m.concepto}>
                  {m.concepto}
                </td>
                <td className="px-3 py-2">
                  <Badge color={colorTipo[m.tipo]}>{TIPOS_MOVIMIENTO[m.tipo]}</Badge>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">{m.cuenta || '—'}</td>
                <td className={`px-3 py-2 font-semibold whitespace-nowrap ${m.importe >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmtEur(m.importe)}
                </td>
                <td className="px-3 py-2 text-xs">
                  {m.conciliacion ? (
                    <span className="text-green-700">✓ {descripcionConciliacion(m)}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {m.conciliacion ? (
                    <Btn variant="ghost" onClick={() => desconciliar(m)}>
                      Desconciliar
                    </Btn>
                  ) : (
                    <Btn variant="ghost" onClick={() => setConciliando(m)}>
                      Conciliar
                    </Btn>
                  )}
                  <Btn variant="ghost" onClick={() => abrir(m)}>
                    Editar
                  </Btn>
                  <Btn variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => borrar(m)}>
                    Eliminar
                  </Btn>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {abierto && (
        <Modal title={editando ? 'Editar movimiento' : 'Nuevo movimiento'} onClose={() => setAbierto(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha">
                <input type="date" className={inputCls} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
              </Field>
              <Field label="Tipo">
                <select className={inputCls} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoMovimiento })}>
                  {Object.entries(TIPOS_MOVIMIENTO).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Concepto *">
              <input className={inputCls} value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Importe (€, negativo si es salida) *">
                <input type="number" step="0.01" className={inputCls} value={form.importe} onChange={(e) => setForm({ ...form, importe: e.target.value })} />
              </Field>
              <Field label="Cuenta / tarjeta">
                <input className={inputCls} value={form.cuenta} onChange={(e) => setForm({ ...form, cuenta: e.target.value })} placeholder="p. ej. BBVA ...1234" />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="secondary" onClick={() => setAbierto(false)}>
                Cancelar
              </Btn>
              <Btn onClick={guardar} disabled={!form.concepto.trim() || !form.importe}>
                Guardar
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {conciliando && (
        <Modal
          title={`Conciliar: ${fmtEur(conciliando.importe)} · ${conciliando.concepto.slice(0, 50)}`}
          onClose={() => setConciliando(null)}
          wide
        >
          {conciliando.importe >= 0 ? (
            <>
              <p className="text-sm text-gray-600 mb-3">
                Es una <strong>entrada</strong>: selecciona la factura cobrada. Se marcará como cobrada con
                fecha {fmtDate(conciliando.fecha)}.
              </p>
              {candidatos.facturas.length === 0 ? (
                <Empty>No hay facturas pendientes de cobro.</Empty>
              ) : (
                <Table headers={['Número', 'Fecha', 'Cliente', 'Total', '']}>
                  {candidatos.facturas.map((f) => (
                    <tr key={f.id} className={Math.abs(f.total - conciliando.importe) < 0.5 ? 'bg-green-50' : ''}>
                      <td className="px-3 py-2 font-medium">{f.numero}</td>
                      <td className="px-3 py-2">{fmtDate(f.fecha)}</td>
                      <td className="px-3 py-2">{data.contactos.find((c) => c.id === f.clienteId)?.nombre}</td>
                      <td className="px-3 py-2 font-semibold">{fmtEur(f.total)}</td>
                      <td className="px-3 py-2 text-right">
                        <Btn onClick={() => conciliarFactura(conciliando, f.id)}>Conciliar</Btn>
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-3">
                Es una <strong>salida</strong>: selecciona el gasto o la liquidación que paga. Se marcará como
                pagado con fecha {fmtDate(conciliando.fecha)}.
              </p>
              {candidatos.gastos.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Gastos pendientes</h4>
                  <Table headers={['Fecha', 'Proveedor', 'Concepto', 'Total', '']}>
                    {candidatos.gastos.map((g) => (
                      <tr key={g.id} className={Math.abs(g.total + conciliando.importe) < 0.5 ? 'bg-green-50' : ''}>
                        <td className="px-3 py-2">{fmtDate(g.fecha)}</td>
                        <td className="px-3 py-2">{data.contactos.find((c) => c.id === g.contactoId)?.nombre || '—'}</td>
                        <td className="px-3 py-2">{g.concepto}</td>
                        <td className="px-3 py-2 font-semibold">{fmtEur(g.total)}</td>
                        <td className="px-3 py-2 text-right">
                          <Btn onClick={() => conciliarGasto(conciliando, g.id)}>Conciliar</Btn>
                        </td>
                      </tr>
                    ))}
                  </Table>
                </>
              )}
              {candidatos.liquidaciones.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1 mt-4">Liquidaciones pendientes</h4>
                  <Table headers={['Fecha', 'Colaborador', 'Concepto', 'Importe', '']}>
                    {candidatos.liquidaciones.map((l) => (
                      <tr key={l.id} className={Math.abs(l.importe + conciliando.importe) < 0.5 ? 'bg-green-50' : ''}>
                        <td className="px-3 py-2">{fmtDate(l.fecha)}</td>
                        <td className="px-3 py-2">{data.contactos.find((c) => c.id === l.contactoId)?.nombre || '—'}</td>
                        <td className="px-3 py-2">{l.concepto}</td>
                        <td className="px-3 py-2 font-semibold">{fmtEur(l.importe)}</td>
                        <td className="px-3 py-2 text-right">
                          <Btn onClick={() => conciliarLiquidacion(conciliando, l.id)}>Conciliar</Btn>
                        </td>
                      </tr>
                    ))}
                  </Table>
                </>
              )}
              {candidatos.gastos.length === 0 && candidatos.liquidaciones.length === 0 && (
                <Empty>No hay gastos ni liquidaciones pendientes de pago.</Empty>
              )}
            </>
          )}
        </Modal>
      )}
    </div>
  );
};

export default Banco;
