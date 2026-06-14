import React, { useState } from 'react';
import { useAppData, setState, uid, ensureContacto } from '../lib/store';
import { Proyecto, EstadoProyecto, LineaServicio, LINEAS_SERVICIO, Reparto, ModoReparto } from '../types';
import { fmtEur, hoy } from '../lib/format';
import { baseFacturadaProyecto, baseCobradaProyecto } from '../lib/calculos';
import { repartoValor } from '../lib/liquidacion';
import { Card, PageTitle, Btn, Modal, Field, inputCls, Table, Badge, badgeEstado, Empty } from '../components/ui';

interface FormProyecto {
  codigo: string;
  nombre: string;
  clienteNombre: string;
  lineaServicio: LineaServicio;
  presupuesto: string;
  fechaInicio: string;
  estado: EstadoProyecto;
  modoReparto: ModoReparto;
  comercialNombre: string;
  comercialPct: string;
  gastosGeneralesPct: string;
  repartos: { contactoNombre: string; valor: string; descripcion: string }[];
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
      modoReparto: 'porcentaje',
      comercialNombre: '',
      comercialPct: '10',
      gastosGeneralesPct: '20',
      repartos: [],
      notas: '',
    };
  }

  const nombreContacto = (id?: string) => (id ? data.contactos.find((c) => c.id === id)?.nombre || '—' : '');

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
        modoReparto: p.modoReparto ?? 'porcentaje',
        comercialNombre: nombreContacto(p.comercialId),
        comercialPct: String(p.comercialPct ?? 10),
        gastosGeneralesPct: String(p.gastosGeneralesPct ?? 20),
        repartos: p.repartos.map((r) => ({
          contactoNombre: nombreContacto(r.contactoId),
          valor: String(repartoValor(r)),
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
    const comercialId = form.comercialNombre.trim()
      ? ensureContacto(form.comercialNombre, 'colaborador')
      : undefined;
    const repartos: Reparto[] = form.repartos
      .filter((r) => r.contactoNombre.trim() && parseFloat(r.valor) > 0)
      .slice(0, 6)
      .map((r) => ({
        contactoId: ensureContacto(r.contactoNombre, 'colaborador'),
        valor: parseFloat(r.valor),
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
      modoReparto: form.modoReparto,
      comercialId,
      comercialPct: parseFloat(form.comercialPct) || 0,
      gastosGeneralesPct: parseFloat(form.gastosGeneralesPct) || 0,
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

  const unidad = form.modoReparto === 'horas' ? 'h' : '%';
  const totalReparto = form.repartos.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
  const lista = [...data.proyectos].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));

  const setReparto = (i: number, campo: 'contactoNombre' | 'valor' | 'descripcion', v: string) => {
    const repartos = [...form.repartos];
    repartos[i] = { ...repartos[i], [campo]: v };
    setForm({ ...form, repartos });
  };

  return (
    <div>
      <PageTitle
        title="Proyectos"
        subtitle="Cada proyecto define su comercial, gastos generales y reparto del equipo"
        actions={<Btn onClick={() => abrir()}>+ Nuevo proyecto</Btn>}
      />

      <Card>
        {lista.length === 0 ? (
          <Empty>No hay proyectos. Créalos aquí o conviértelos desde una oferta aceptada.</Empty>
        ) : (
          <Table headers={['Código', 'Proyecto', 'Cliente', 'Línea', 'Facturado', 'Cobrado', 'Reparto', 'Estado', '']}>
            {lista.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium whitespace-nowrap">{p.codigo}</td>
                <td className="px-3 py-2">{p.nombre}</td>
                <td className="px-3 py-2">{nombreContacto(p.clienteId)}</td>
                <td className="px-3 py-2 text-gray-500 text-xs">{p.lineaServicio}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtEur(baseFacturadaProyecto(data, p.id))}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtEur(baseCobradaProyecto(data, p.id))}</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {p.repartos.length === 0
                    ? '—'
                    : p.repartos
                        .map((r) => `${nombreContacto(r.contactoId)} ${repartoValor(r)}${p.modoReparto === 'horas' ? 'h' : '%'}`)
                        .join(', ')}
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

            {/* Reglas de liquidación */}
            <div className="border-t border-gray-200 pt-3">
              <span className="text-sm font-semibold text-gray-700">Reglas de liquidación</span>
              <p className="text-xs text-gray-500 mb-2">
                De cada factura cobrada se descuentan primero los gastos imputados, luego la comisión comercial
                y los gastos generales. El resto se reparte entre el equipo.
              </p>
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="Comercial (recibe la comisión)">
                  <input
                    className={inputCls}
                    list="comercial-proy"
                    value={form.comercialNombre}
                    onChange={(e) => setForm({ ...form, comercialNombre: e.target.value })}
                    placeholder="Opcional"
                  />
                  <datalist id="comercial-proy">
                    {data.contactos.filter((c) => c.tipo !== 'cliente').map((c) => (
                      <option key={c.id} value={c.nombre} />
                    ))}
                  </datalist>
                </Field>
                <Field label="% comisión comercial">
                  <input type="number" step="0.5" className={inputCls} value={form.comercialPct} onChange={(e) => setForm({ ...form, comercialPct: e.target.value })} />
                </Field>
                <Field label="% gastos generales empresa">
                  <input type="number" step="0.5" className={inputCls} value={form.gastosGeneralesPct} onChange={(e) => setForm({ ...form, gastosGeneralesPct: e.target.value })} />
                </Field>
              </div>
            </div>

            {/* Reparto del equipo */}
            <div className="border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-700">Reparto del equipo (hasta 6)</span>
                <div className="flex items-center gap-2">
                  <select
                    className={`${inputCls} w-auto`}
                    value={form.modoReparto}
                    onChange={(e) => setForm({ ...form, modoReparto: e.target.value as ModoReparto })}
                  >
                    <option value="porcentaje">Repartir por %</option>
                    <option value="horas">Repartir por horas</option>
                  </select>
                  <Btn
                    variant="secondary"
                    disabled={form.repartos.length >= 6}
                    onClick={() =>
                      setForm({ ...form, repartos: [...form.repartos, { contactoNombre: '', valor: '', descripcion: '' }] })
                    }
                  >
                    + Añadir
                  </Btn>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                {form.modoReparto === 'horas'
                  ? 'Cada colaborador recibe una parte de la base de reparto proporcional a sus horas.'
                  : 'Cada colaborador recibe ese % de la base de reparto (lo que queda tras gastos, comisión y generales).'}
              </p>
              {form.repartos.map((r, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <input
                    className={`${inputCls} flex-1`}
                    placeholder="Colaborador"
                    list="colaboradores-proy"
                    value={r.contactoNombre}
                    onChange={(e) => setReparto(i, 'contactoNombre', e.target.value)}
                  />
                  <div className="relative w-28">
                    <input
                      type="number"
                      step="0.1"
                      className={inputCls}
                      placeholder={unidad}
                      value={r.valor}
                      onChange={(e) => setReparto(i, 'valor', e.target.value)}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-4">{unidad}</span>
                  <input
                    className={`${inputCls} flex-1`}
                    placeholder="Concepto (opcional)"
                    value={r.descripcion}
                    onChange={(e) => setReparto(i, 'descripcion', e.target.value)}
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
                {data.contactos.filter((c) => c.tipo !== 'cliente').map((c) => (
                  <option key={c.id} value={c.nombre} />
                ))}
              </datalist>
              {form.repartos.length > 0 && (
                <div className={`text-xs ${form.modoReparto === 'porcentaje' && totalReparto > 100 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                  Total: {totalReparto.toFixed(1)} {unidad}
                  {form.modoReparto === 'porcentaje' && totalReparto > 100 && ' · ¡Supera el 100% de la base de reparto!'}
                  {form.modoReparto === 'porcentaje' && totalReparto < 100 && totalReparto > 0 && ` · ${(100 - totalReparto).toFixed(1)}% se queda en la empresa`}
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
