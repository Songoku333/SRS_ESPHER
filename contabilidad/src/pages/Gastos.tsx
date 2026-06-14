import React, { useMemo, useState } from 'react';
import { useAppData, setState, uid, ensureContacto } from '../lib/store';
import { Gasto, EstadoGasto, CategoriaGasto, CATEGORIAS_GASTO } from '../types';
import { fmtEur, fmtDate, hoy } from '../lib/format';
import { Card, PageTitle, Btn, Modal, Field, inputCls, Table, Badge, badgeEstado, Empty } from '../components/ui';

interface FormGasto {
  fecha: string;
  proveedorNombre: string;
  concepto: string;
  categoria: CategoriaGasto;
  base: string;
  ivaPct: string;
  proyectoId: string;
  facturaId: string;
  estado: EstadoGasto;
  fechaPago: string;
}

const Gastos: React.FC = () => {
  const data = useAppData();
  const [filtro, setFiltro] = useState<EstadoGasto | 'todos'>('todos');
  const [busca, setBusca] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Gasto | null>(null);
  const [form, setForm] = useState<FormGasto>(formVacio());

  function formVacio(): FormGasto {
    return {
      fecha: hoy(),
      proveedorNombre: '',
      concepto: '',
      categoria: 'Subcontratación / Ingeniería externa',
      base: '',
      ivaPct: '21',
      proyectoId: '',
      facturaId: '',
      estado: 'pagado',
      fechaPago: hoy(),
    };
  }

  const nombreContacto = (id?: string) =>
    id ? data.contactos.find((c) => c.id === id)?.nombre || '—' : '—';

  const abrir = (g?: Gasto) => {
    if (g) {
      setEditando(g);
      setForm({
        fecha: g.fecha,
        proveedorNombre: g.contactoId ? nombreContacto(g.contactoId) : '',
        concepto: g.concepto,
        categoria: g.categoria,
        base: String(g.base),
        ivaPct: String(g.ivaPct),
        proyectoId: g.proyectoId || '',
        facturaId: g.facturaId || '',
        estado: g.estado,
        fechaPago: g.fechaPago || '',
      });
    } else {
      setEditando(null);
      setForm(formVacio());
    }
    setAbierto(true);
  };

  const guardar = () => {
    const base = parseFloat(form.base) || 0;
    const ivaPct = parseFloat(form.ivaPct) || 0;
    const nuevo = {
      fecha: form.fecha,
      contactoId: form.proveedorNombre.trim()
        ? ensureContacto(form.proveedorNombre, 'proveedor')
        : undefined,
      concepto: form.concepto,
      categoria: form.categoria,
      base,
      ivaPct,
      total: Math.round((base + (base * ivaPct) / 100) * 100) / 100,
      proyectoId: form.proyectoId || undefined,
      facturaId: form.facturaId || undefined,
      estado: form.estado,
      fechaPago: form.estado === 'pagado' ? form.fechaPago || hoy() : undefined,
    };
    if (editando) {
      setState((p) => ({
        ...p,
        gastos: p.gastos.map((x) => (x.id === editando.id ? { ...x, ...nuevo } : x)),
      }));
    } else {
      setState((p) => ({ ...p, gastos: [...p.gastos, { id: uid(), ...nuevo }] }));
    }
    setAbierto(false);
  };

  const borrar = (g: Gasto) => {
    if (confirm('¿Eliminar este gasto?')) {
      setState((p) => ({ ...p, gastos: p.gastos.filter((x) => x.id !== g.id) }));
    }
  };

  const lista = useMemo(
    () =>
      data.gastos
        .filter((g) => filtro === 'todos' || g.estado === filtro)
        .filter(
          (g) =>
            !busca ||
            g.concepto.toLowerCase().includes(busca.toLowerCase()) ||
            nombreContacto(g.contactoId).toLowerCase().includes(busca.toLowerCase())
        )
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [data, filtro, busca]
  );

  const totalPendiente = data.gastos.filter((g) => g.estado === 'pendiente').reduce((s, g) => s + g.total, 0);

  return (
    <div>
      <PageTitle
        title="Gastos"
        subtitle={`${fmtEur(totalPendiente)} pendiente de pago`}
        actions={<Btn onClick={() => abrir()}>+ Nuevo gasto</Btn>}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <input className={`${inputCls} max-w-xs`} placeholder="Buscar concepto o proveedor..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        {(['todos', 'pendiente', 'pagado'] as const).map((e) => (
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
          <Empty>No hay gastos registrados.</Empty>
        ) : (
          <Table headers={['Fecha', 'Proveedor', 'Concepto', 'Categoría', 'Proyecto', 'Base', 'Total', 'Estado', '']}>
            {lista.map((g) => (
              <tr key={g.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(g.fecha)}</td>
                <td className="px-3 py-2">{nombreContacto(g.contactoId)}</td>
                <td className="px-3 py-2 text-gray-600 max-w-[220px] truncate" title={g.concepto}>
                  {g.concepto}
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">{g.categoria}</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {data.proyectos.find((p) => p.id === g.proyectoId)?.codigo || '—'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtEur(g.base)}</td>
                <td className="px-3 py-2 font-semibold whitespace-nowrap">{fmtEur(g.total)}</td>
                <td className="px-3 py-2">
                  <Badge color={badgeEstado[g.estado]}>{g.estado}</Badge>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Btn variant="ghost" onClick={() => abrir(g)}>
                    Editar
                  </Btn>
                  <Btn variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => borrar(g)}>
                    Eliminar
                  </Btn>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {abierto && (
        <Modal title={editando ? 'Editar gasto' : 'Nuevo gasto'} onClose={() => setAbierto(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha">
                <input type="date" className={inputCls} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
              </Field>
              <Field label="Categoría">
                <select className={inputCls} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaGasto })}>
                  {CATEGORIAS_GASTO.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Proveedor / colaborador">
              <input className={inputCls} list="proveedores-gasto" value={form.proveedorNombre} onChange={(e) => setForm({ ...form, proveedorNombre: e.target.value })} />
              <datalist id="proveedores-gasto">
                {data.contactos.filter((c) => c.tipo !== 'cliente').map((c) => (
                  <option key={c.id} value={c.nombre} />
                ))}
              </datalist>
            </Field>
            <Field label="Concepto *">
              <input className={inputCls} value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Base (€) *">
                <input type="number" step="0.01" className={inputCls} value={form.base} onChange={(e) => setForm({ ...form, base: e.target.value })} />
              </Field>
              <Field label="IVA %">
                <input type="number" step="0.5" className={inputCls} value={form.ivaPct} onChange={(e) => setForm({ ...form, ivaPct: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Proyecto (para imputar costes)">
                <select
                  className={inputCls}
                  value={form.proyectoId}
                  onChange={(e) => setForm({ ...form, proyectoId: e.target.value, facturaId: '' })}
                >
                  <option value="">— Sin proyecto —</option>
                  {data.proyectos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} · {p.nombre}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Factura (para descontarlo antes del reparto)">
                <select
                  className={inputCls}
                  value={form.facturaId}
                  onChange={(e) => setForm({ ...form, facturaId: e.target.value })}
                  disabled={!form.proyectoId}
                >
                  <option value="">— Sin factura concreta —</option>
                  {data.facturas
                    .filter((f) => f.proyectoId === form.proyectoId && f.estado !== 'anulada')
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.numero} · {fmtEur(f.base)}
                      </option>
                    ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Estado">
                <select className={inputCls} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoGasto })}>
                  <option value="pendiente">pendiente</option>
                  <option value="pagado">pagado</option>
                </select>
              </Field>
              {form.estado === 'pagado' && (
                <Field label="Fecha de pago">
                  <input type="date" className={inputCls} value={form.fechaPago} onChange={(e) => setForm({ ...form, fechaPago: e.target.value })} />
                </Field>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="secondary" onClick={() => setAbierto(false)}>
                Cancelar
              </Btn>
              <Btn onClick={guardar} disabled={!form.concepto.trim()}>
                Guardar
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Gastos;
