import React, { useMemo, useState } from 'react';
import { useAppData, setState, uid, ensureContacto } from '../lib/store';
import { Factura, EstadoFactura } from '../types';
import { fmtEur, fmtDate, hoy } from '../lib/format';
import { Card, PageTitle, Btn, Modal, Field, inputCls, Table, Badge, badgeEstado, Empty } from '../components/ui';

interface FormFactura {
  numero: string;
  fecha: string;
  clienteNombre: string;
  proyectoId: string;
  concepto: string;
  base: string;
  ivaPct: string;
  irpfPct: string;
  estado: EstadoFactura;
  vencimiento: string;
  fechaCobro: string;
}

function calcTotal(base: number, ivaPct: number, irpfPct: number): number {
  return Math.round((base + (base * ivaPct) / 100 - (base * irpfPct) / 100) * 100) / 100;
}

const Facturas: React.FC = () => {
  const data = useAppData();
  const [filtro, setFiltro] = useState<EstadoFactura | 'todas'>('todas');
  const [busca, setBusca] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Factura | null>(null);
  const [form, setForm] = useState<FormFactura>(formVacio());

  function formVacio(): FormFactura {
    return {
      numero: '',
      fecha: hoy(),
      clienteNombre: '',
      proyectoId: '',
      concepto: '',
      base: '',
      ivaPct: '21',
      irpfPct: '0',
      estado: 'emitida',
      vencimiento: '',
      fechaCobro: '',
    };
  }

  const nombreCliente = (id: string) => data.contactos.find((c) => c.id === id)?.nombre || '—';
  const codigoProyecto = (id?: string) => data.proyectos.find((p) => p.id === id)?.codigo || '—';

  const abrir = (f?: Factura) => {
    if (f) {
      setEditando(f);
      setForm({
        numero: f.numero,
        fecha: f.fecha,
        clienteNombre: nombreCliente(f.clienteId),
        proyectoId: f.proyectoId || '',
        concepto: f.concepto,
        base: String(f.base),
        ivaPct: String(f.ivaPct),
        irpfPct: String(f.irpfPct),
        estado: f.estado,
        vencimiento: f.vencimiento || '',
        fechaCobro: f.fechaCobro || '',
      });
    } else {
      setEditando(null);
      setForm(formVacio());
    }
    setAbierto(true);
  };

  const guardar = () => {
    const clienteId = ensureContacto(form.clienteNombre, 'cliente');
    const base = parseFloat(form.base) || 0;
    const ivaPct = parseFloat(form.ivaPct) || 0;
    const irpfPct = parseFloat(form.irpfPct) || 0;
    const nueva = {
      numero: form.numero,
      fecha: form.fecha,
      clienteId,
      proyectoId: form.proyectoId || undefined,
      concepto: form.concepto,
      base,
      ivaPct,
      irpfPct,
      total: calcTotal(base, ivaPct, irpfPct),
      estado: form.estado,
      vencimiento: form.vencimiento || undefined,
      fechaCobro: form.estado === 'cobrada' ? form.fechaCobro || hoy() : undefined,
    };
    if (editando) {
      setState((p) => ({
        ...p,
        facturas: p.facturas.map((x) => (x.id === editando.id ? { ...x, ...nueva } : x)),
      }));
    } else {
      setState((p) => ({ ...p, facturas: [...p.facturas, { id: uid(), ...nueva }] }));
    }
    setAbierto(false);
  };

  const marcarCobrada = (f: Factura) => {
    setState((p) => ({
      ...p,
      facturas: p.facturas.map((x) =>
        x.id === f.id ? { ...x, estado: 'cobrada' as const, fechaCobro: hoy() } : x
      ),
    }));
  };

  const borrar = (f: Factura) => {
    if (confirm(`¿Eliminar la factura ${f.numero}?`)) {
      setState((p) => ({ ...p, facturas: p.facturas.filter((x) => x.id !== f.id) }));
    }
  };

  const lista = useMemo(
    () =>
      data.facturas
        .filter((f) => filtro === 'todas' || f.estado === filtro)
        .filter(
          (f) =>
            !busca ||
            f.numero.toLowerCase().includes(busca.toLowerCase()) ||
            nombreCliente(f.clienteId).toLowerCase().includes(busca.toLowerCase()) ||
            f.concepto.toLowerCase().includes(busca.toLowerCase())
        )
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.numero.localeCompare(a.numero)),
    [data, filtro, busca]
  );

  const pendiente = data.facturas.filter((f) => f.estado === 'emitida').reduce((s, f) => s + f.total, 0);
  const totalForm = calcTotal(parseFloat(form.base) || 0, parseFloat(form.ivaPct) || 0, parseFloat(form.irpfPct) || 0);

  return (
    <div>
      <PageTitle
        title="Facturas emitidas"
        subtitle={`${fmtEur(pendiente)} pendiente de cobro`}
        actions={<Btn onClick={() => abrir()}>+ Nueva factura</Btn>}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <input className={`${inputCls} max-w-xs`} placeholder="Buscar nº, cliente o concepto..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        {(['todas', 'emitida', 'cobrada', 'anulada'] as const).map((e) => (
          <button
            key={e}
            onClick={() => setFiltro(e as any)}
            className={`px-3 py-1 rounded-full text-sm capitalize ${
              filtro === e ? 'bg-teal-600 text-white' : 'bg-white border border-gray-300 text-gray-600'
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      <Card>
        {lista.length === 0 ? (
          <Empty>No hay facturas. Impórtalas desde tu Excel en «Importar Excel» o créalas aquí.</Empty>
        ) : (
          <Table headers={['Número', 'Fecha', 'Cliente', 'Concepto', 'Proyecto', 'Base', 'IVA', 'IRPF', 'Total', 'Estado', '']}>
            {lista.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium whitespace-nowrap">{f.numero}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(f.fecha)}</td>
                <td className="px-3 py-2">{nombreCliente(f.clienteId)}</td>
                <td className="px-3 py-2 text-gray-600 max-w-[220px] truncate" title={f.concepto}>
                  {f.concepto}
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">{codigoProyecto(f.proyectoId)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtEur(f.base)}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{f.ivaPct}%</td>
                <td className="px-3 py-2 text-xs text-gray-500">{f.irpfPct ? `${f.irpfPct}%` : '—'}</td>
                <td className="px-3 py-2 font-semibold whitespace-nowrap">{fmtEur(f.total)}</td>
                <td className="px-3 py-2">
                  <Badge color={badgeEstado[f.estado]}>{f.estado}</Badge>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {f.estado === 'emitida' && (
                    <Btn variant="ghost" onClick={() => marcarCobrada(f)}>
                      ✓ Cobrada
                    </Btn>
                  )}
                  <Btn variant="ghost" onClick={() => abrir(f)}>
                    Editar
                  </Btn>
                  <Btn variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => borrar(f)}>
                    Eliminar
                  </Btn>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {abierto && (
        <Modal title={editando ? `Editar factura ${editando.numero}` : 'Nueva factura'} onClose={() => setAbierto(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Número *">
                <input className={inputCls} value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
              </Field>
              <Field label="Fecha">
                <input type="date" className={inputCls} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
              </Field>
            </div>
            <Field label="Cliente *">
              <input className={inputCls} list="clientes-fac" value={form.clienteNombre} onChange={(e) => setForm({ ...form, clienteNombre: e.target.value })} />
              <datalist id="clientes-fac">
                {data.contactos.filter((c) => c.tipo === 'cliente').map((c) => (
                  <option key={c.id} value={c.nombre} />
                ))}
              </datalist>
            </Field>
            <Field label="Concepto">
              <input className={inputCls} value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} />
            </Field>
            <Field label="Proyecto (para reparto y análisis)">
              <select className={inputCls} value={form.proyectoId} onChange={(e) => setForm({ ...form, proyectoId: e.target.value })}>
                <option value="">— Sin proyecto —</option>
                {data.proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} · {p.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Base (€) *">
                <input type="number" step="0.01" className={inputCls} value={form.base} onChange={(e) => setForm({ ...form, base: e.target.value })} />
              </Field>
              <Field label="IVA %">
                <input type="number" step="0.5" className={inputCls} value={form.ivaPct} onChange={(e) => setForm({ ...form, ivaPct: e.target.value })} />
              </Field>
              <Field label="IRPF %">
                <input type="number" step="0.5" className={inputCls} value={form.irpfPct} onChange={(e) => setForm({ ...form, irpfPct: e.target.value })} />
              </Field>
            </div>
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              Total factura: <strong>{fmtEur(totalForm)}</strong>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Estado">
                <select className={inputCls} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoFactura })}>
                  <option value="emitida">emitida</option>
                  <option value="cobrada">cobrada</option>
                  <option value="anulada">anulada</option>
                </select>
              </Field>
              <Field label="Vencimiento">
                <input type="date" className={inputCls} value={form.vencimiento} onChange={(e) => setForm({ ...form, vencimiento: e.target.value })} />
              </Field>
              {form.estado === 'cobrada' && (
                <Field label="Fecha de cobro">
                  <input type="date" className={inputCls} value={form.fechaCobro} onChange={(e) => setForm({ ...form, fechaCobro: e.target.value })} />
                </Field>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="secondary" onClick={() => setAbierto(false)}>
                Cancelar
              </Btn>
              <Btn onClick={guardar} disabled={!form.numero.trim() || !form.clienteNombre.trim()}>
                Guardar
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Facturas;
