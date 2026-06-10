import React, { useState } from 'react';
import { useAppData, setState, uid, ensureContacto } from '../lib/store';
import { Proyecto, EstadoProyecto, LineaServicio, LINEAS_SERVICIO, Reparto } from '../types';
import { fmtEur, fmtDate, hoy } from '../lib/format';
import { baseFacturadaProyecto, baseCobradaProyecto } from '../lib/calculos';
import { Card, PageTitle, Btn, Modal, Field, inputCls, Table, Badge, badgeEstado, Empty } from '../components/ui';

interface FormProyecto {
  codigo: string;
  nombre: string;
  clienteNombre: string;
  lineaServicio: LineaServicio;
  presupuesto: string;
  fechaInicio: string;
  estado: EstadoProyecto;
  repartos: { contactoNombre: string; porcentaje: string; descripcion: string }[];
  notas: string;
}

const Proyectos: React.FC = () => {
  const data = useAppData();
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Proyecto | null>(null);
  const [form, setForm] = useState<FormProyecto>(formVacio());

  function formVacio(): FormProyecto {
    return {
      codigo: `PR-${new Date().getFullYear()}-${String((data?.proyectos?.length ?? 0) + 1).padStart(3, '0')}`,
      nombre: '',
      clienteNombre: '',
      lineaServicio: 'Ingeniería MEP',
      presupuesto: '',
      fechaInicio: hoy(),
      estado: 'activo',
      repartos: [],
      notas: '',
    };
  }

  const nombreContacto = (id: string) => data.contactos.find((c) => c.id === id)?.nombre || '—';

  const abrir = (p?: Proyecto) => {
    if (p) {
      setEditando(p);
      setForm({
        codigo: p.codigo,
        nombre: p.nombre,
        clienteNombre: nombreContacto(p.clienteId),
        lineaServicio: p.lineaServicio,
        presupuesto: String(p.presupuesto),
        fechaInicio: p.fechaInicio,
        estado: p.estado,
        repartos: p.repartos.map((r) => ({
          contactoNombre: nombreContacto(r.contactoId),
          porcentaje: String(r.porcentaje),
          descripcion: r.descripcion || '',
        })),
        notas: p.notas || '',
      });
    } else {
      setEditando(null);
      setForm(formVacio());
    }
    setAbierto(true);
  };

  const guardar = () => {
    const clienteId = ensureContacto(form.clienteNombre, 'cliente');
    const repartos: Reparto[] = form.repartos
      .filter((r) => r.contactoNombre.trim() && parseFloat(r.porcentaje) > 0)
      .map((r) => ({
        contactoId: ensureContacto(r.contactoNombre, 'colaborador'),
        porcentaje: parseFloat(r.porcentaje),
        descripcion: r.descripcion,
      }));
    const base = {
      codigo: form.codigo,
      nombre: form.nombre,
      clienteId,
      lineaServicio: form.lineaServicio,
      presupuesto: parseFloat(form.presupuesto) || 0,
      fechaInicio: form.fechaInicio,
      estado: form.estado,
      repartos,
      notas: form.notas,
    };
    if (editando) {
      setState((p) => ({
        ...p,
        proyectos: p.proyectos.map((x) => (x.id === editando.id ? { ...x, ...base } : x)),
      }));
    } else {
      setState((p) => ({ ...p, proyectos: [...p.proyectos, { id: uid(), ...base }] }));
    }
    setAbierto(false);
  };

  const borrar = (p: Proyecto) => {
    if (data.facturas.some((f) => f.proyectoId === p.id)) {
      alert('No se puede eliminar: el proyecto tiene facturas asociadas.');
      return;
    }
    if (confirm(`¿Eliminar el proyecto ${p.codigo}?`)) {
      setState((s) => ({ ...s, proyectos: s.proyectos.filter((x) => x.id !== p.id) }));
    }
  };

  const totalPct = form.repartos.reduce((s, r) => s + (parseFloat(r.porcentaje) || 0), 0);
  const lista = [...data.proyectos].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));

  return (
    <div>
      <PageTitle
        title="Proyectos"
        subtitle="Cada proyecto define su reparto con colaboradores y proveedores"
        actions={<Btn onClick={() => abrir()}>+ Nuevo proyecto</Btn>}
      />

      <Card>
        {lista.length === 0 ? (
          <Empty>No hay proyectos. Créalos aquí o conviértelos desde una oferta aceptada.</Empty>
        ) : (
          <Table headers={['Código', 'Proyecto', 'Cliente', 'Línea', 'Presupuesto', 'Facturado', 'Cobrado', 'Reparto', 'Estado', '']}>
            {lista.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium whitespace-nowrap">{p.codigo}</td>
                <td className="px-3 py-2">{p.nombre}</td>
                <td className="px-3 py-2">{nombreContacto(p.clienteId)}</td>
                <td className="px-3 py-2 text-gray-500 text-xs">{p.lineaServicio}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtEur(p.presupuesto)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtEur(baseFacturadaProyecto(data, p.id))}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtEur(baseCobradaProyecto(data, p.id))}</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {p.repartos.length === 0
                    ? '—'
                    : p.repartos.map((r) => `${nombreContacto(r.contactoId)} ${r.porcentaje}%`).join(', ')}
                </td>
                <td className="px-3 py-2">
                  <Badge color={badgeEstado[p.estado]}>{p.estado}</Badge>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Btn variant="ghost" onClick={() => abrir(p)}>
                    Editar
                  </Btn>
                  <Btn variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => borrar(p)}>
                    Eliminar
                  </Btn>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {abierto && (
        <Modal title={editando ? 'Editar proyecto' : 'Nuevo proyecto'} onClose={() => setAbierto(false)} wide>
          <div className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              <Field label="Código">
                <input className={inputCls} value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
              </Field>
              <Field label="Fecha de inicio">
                <input type="date" className={inputCls} value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
              </Field>
              <Field label="Estado">
                <select className={inputCls} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoProyecto })}>
                  <option value="activo">activo</option>
                  <option value="cerrado">cerrado</option>
                </select>
              </Field>
            </div>
            <Field label="Nombre del proyecto *">
              <input className={inputCls} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </Field>
            <div className="grid md:grid-cols-3 gap-3">
              <Field label="Cliente *" className="md:col-span-2">
                <input
                  className={inputCls}
                  list="clientes-proy"
                  value={form.clienteNombre}
                  onChange={(e) => setForm({ ...form, clienteNombre: e.target.value })}
                />
                <datalist id="clientes-proy">
                  {data.contactos.filter((c) => c.tipo === 'cliente').map((c) => (
                    <option key={c.id} value={c.nombre} />
                  ))}
                </datalist>
              </Field>
              <Field label="Presupuesto (€, sin IVA)">
                <input type="number" step="0.01" className={inputCls} value={form.presupuesto} onChange={(e) => setForm({ ...form, presupuesto: e.target.value })} />
              </Field>
            </div>
            <Field label="Línea de servicio">
              <select className={inputCls} value={form.lineaServicio} onChange={(e) => setForm({ ...form, lineaServicio: e.target.value as LineaServicio })}>
                {LINEAS_SERVICIO.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </Field>

            <div className="border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">
                  Reparto con colaboradores / proveedores
                </span>
                <Btn
                  variant="secondary"
                  onClick={() =>
                    setForm({
                      ...form,
                      repartos: [...form.repartos, { contactoNombre: '', porcentaje: '', descripcion: '' }],
                    })
                  }
                >
                  + Añadir
                </Btn>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                Porcentaje sobre la base imponible cobrada del proyecto. La app calcula automáticamente lo
                pendiente de liquidar a cada uno.
              </p>
              {form.repartos.map((r, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <input
                    className={`${inputCls} flex-1`}
                    placeholder="Colaborador o proveedor"
                    list="colaboradores-proy"
                    value={r.contactoNombre}
                    onChange={(e) => {
                      const repartos = [...form.repartos];
                      repartos[i] = { ...r, contactoNombre: e.target.value };
                      setForm({ ...form, repartos });
                    }}
                  />
                  <input
                    type="number"
                    step="0.1"
                    className={`${inputCls} w-24`}
                    placeholder="%"
                    value={r.porcentaje}
                    onChange={(e) => {
                      const repartos = [...form.repartos];
                      repartos[i] = { ...r, porcentaje: e.target.value };
                      setForm({ ...form, repartos });
                    }}
                  />
                  <input
                    className={`${inputCls} flex-1`}
                    placeholder="Concepto (opcional)"
                    value={r.descripcion}
                    onChange={(e) => {
                      const repartos = [...form.repartos];
                      repartos[i] = { ...r, descripcion: e.target.value };
                      setForm({ ...form, repartos });
                    }}
                  />
                  <button
                    className="text-red-500 hover:text-red-700 px-1"
                    onClick={() => setForm({ ...form, repartos: form.repartos.filter((_, j) => j !== i) })}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <datalist id="colaboradores-proy">
                {data.contactos
                  .filter((c) => c.tipo !== 'cliente')
                  .map((c) => (
                    <option key={c.id} value={c.nombre} />
                  ))}
              </datalist>
              {form.repartos.length > 0 && (
                <div className={`text-xs ${totalPct > 100 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                  Total reparto: {totalPct.toFixed(1)}% {totalPct > 100 && '· ¡Supera el 100%!'}
                </div>
              )}
            </div>

            <Field label="Notas">
              <textarea className={inputCls} rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="secondary" onClick={() => setAbierto(false)}>
                Cancelar
              </Btn>
              <Btn onClick={guardar} disabled={!form.nombre.trim() || !form.clienteNombre.trim()}>
                Guardar
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Proyectos;
