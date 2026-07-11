import React, { useState } from 'react';
import { useAppData, setState, uid, ensureContacto } from '../lib/store';
import { useDatosVisibles } from '../lib/vista';
import { Oferta, EstadoOferta, LineaServicio, LINEAS_SERVICIO } from '../types';
import { fmtEur, fmtDate, hoy } from '../lib/format';
import { Card, PageTitle, Btn, Modal, Field, inputCls, Table, Badge, badgeEstado, Empty } from '../components/ui';
import AsistenteOferta from '../components/AsistenteOferta';

const ESTADOS: EstadoOferta[] = ['borrador', 'enviada', 'aceptada', 'rechazada'];

interface FormOferta {
  codigo: string;
  clienteNombre: string;
  titulo: string;
  lineaServicio: LineaServicio;
  importe: string;
  fecha: string;
  estado: EstadoOferta;
  notas: string;
}

const Ofertas: React.FC = () => {
  const data = useDatosVisibles();
  const [filtroEstado, setFiltroEstado] = useState<EstadoOferta | 'todas'>('todas');
  const [editando, setEditando] = useState<Oferta | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [asistente, setAsistente] = useState(false);
  const [form, setForm] = useState<FormOferta>(formVacio());

  function formVacio(): FormOferta {
    const n = data?.ofertas?.length ?? 0;
    return {
      codigo: `OF-${new Date().getFullYear()}-${String(n + 1).padStart(3, '0')}`,
      clienteNombre: '',
      titulo: '',
      lineaServicio: 'Ingeniería MEP',
      importe: '',
      fecha: hoy(),
      estado: 'borrador',
      notas: '',
    };
  }

  const nombreCliente = (id: string) => data.contactos.find((c) => c.id === id)?.nombre || '—';

  const abrir = (o?: Oferta) => {
    if (o) {
      setEditando(o);
      setForm({
        codigo: o.codigo,
        clienteNombre: nombreCliente(o.clienteId),
        titulo: o.titulo,
        lineaServicio: o.lineaServicio,
        importe: String(o.importe),
        fecha: o.fecha,
        estado: o.estado,
        notas: o.notas || '',
      });
    } else {
      setEditando(null);
      setForm(formVacio());
    }
    setAbierto(true);
  };

  const guardar = () => {
    const clienteId = ensureContacto(form.clienteNombre, 'cliente');
    const base = {
      codigo: form.codigo,
      clienteId,
      titulo: form.titulo,
      lineaServicio: form.lineaServicio,
      importe: parseFloat(form.importe) || 0,
      fecha: form.fecha,
      estado: form.estado,
      notas: form.notas,
    };
    if (editando) {
      setState((p) => ({
        ...p,
        ofertas: p.ofertas.map((o) => (o.id === editando.id ? { ...o, ...base } : o)),
      }));
    } else {
      setState((p) => ({ ...p, ofertas: [...p.ofertas, { id: uid(), ...base }] }));
    }
    setAbierto(false);
  };

  const borrar = (o: Oferta) => {
    if (confirm(`¿Eliminar la oferta ${o.codigo}?`)) {
      setState((p) => ({ ...p, ofertas: p.ofertas.filter((x) => x.id !== o.id) }));
    }
  };

  /** Crea la oferta que sale del asistente, con su estimación y desglose. */
  const crearDesdeAsistente = (r: {
    clienteNombre: string;
    titulo: string;
    linea: LineaServicio;
    importe: number;
    superficieM2?: number;
    estimacion: { estimacion: NonNullable<Oferta['estimacion']>; resumen: string };
  }) => {
    const clienteId = ensureContacto(r.clienteNombre, 'cliente');
    const n = data?.ofertas?.length ?? 0;
    setState((p) => ({
      ...p,
      ofertas: [
        ...p.ofertas,
        {
          id: uid(),
          codigo: `OF-${new Date().getFullYear()}-${String(n + 1).padStart(3, '0')}`,
          clienteId,
          titulo: r.titulo,
          lineaServicio: r.linea,
          importe: Math.round(r.importe * 100) / 100,
          fecha: hoy(),
          estado: 'borrador' as const,
          notas: r.estimacion.resumen,
          superficieM2: r.superficieM2,
          estimacion: r.estimacion.estimacion,
        },
      ],
    }));
    setAsistente(false);
  };

  /** Acepta la oferta y crea el proyecto asociado en un paso. */
  const convertirEnProyecto = (o: Oferta) => {
    if (o.proyectoId) return;
    const proyectoId = uid();
    setState((p) => ({
      ...p,
      proyectos: [
        ...p.proyectos,
        {
          id: proyectoId,
          codigo: o.codigo.replace('OF', 'PR'),
          nombre: o.titulo,
          clienteId: o.clienteId,
          lineaServicio: o.lineaServicio,
          presupuesto: o.importe,
          fechaInicio: hoy(),
          estado: 'activo' as const,
          repartos: [],
          ...(o.estimacion
            ? {
                comercialPct: o.estimacion.comercialPct,
                gastosGeneralesPct: o.estimacion.generalesPct,
                modoReparto: 'horas' as const,
                notas: `Presupuesto de horas de la oferta:\n${o.estimacion.equipo
                  .map((e) => `· ${e.rol}: ${e.horas} h × ${e.costeHora} €/h`)
                  .join('\n')}`,
              }
            : {}),
        },
      ],
      ofertas: p.ofertas.map((x) =>
        x.id === o.id ? { ...x, estado: 'aceptada' as const, proyectoId } : x
      ),
    }));
    alert(`Proyecto creado a partir de la oferta ${o.codigo}. Configura el reparto en Proyectos.`);
  };

  const lista = data.ofertas
    .filter((o) => filtroEstado === 'todas' || o.estado === filtroEstado)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const totalVivas = data.ofertas
    .filter((o) => o.estado === 'borrador' || o.estado === 'enviada')
    .reduce((s, o) => s + o.importe, 0);

  return (
    <div>
      <PageTitle
        title="Ofertas"
        subtitle={`Pipeline comercial · ${fmtEur(totalVivas)} en ofertas vivas`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => setAsistente(true)}>🧮 Preparar oferta</Btn>
            <Btn onClick={() => abrir()}>+ Nueva oferta</Btn>
          </div>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {(['todas', ...ESTADOS] as const).map((e) => (
          <button
            key={e}
            onClick={() => setFiltroEstado(e as any)}
            className={`px-3 py-1 rounded-full text-sm capitalize ${
              filtroEstado === e ? 'bg-teal-600 text-white' : 'bg-white border border-gray-300 text-gray-600'
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      <Card>
        {lista.length === 0 ? (
          <Empty>No hay ofertas con este filtro.</Empty>
        ) : (
          <Table headers={['Código', 'Fecha', 'Cliente', 'Título', 'Línea', 'Importe', 'Estado', '']}>
            {lista.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium whitespace-nowrap">{o.codigo}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(o.fecha)}</td>
                <td className="px-3 py-2">{nombreCliente(o.clienteId)}</td>
                <td className="px-3 py-2">
                  {o.titulo}
                  {(o.superficieM2 || 0) > 0 && (
                    <span className="text-xs text-gray-400 ml-1 whitespace-nowrap">
                      {o.superficieM2!.toLocaleString('es-ES')} m² · {(o.importe / o.superficieM2!).toFixed(2)} €/m²
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-500 text-xs">{o.lineaServicio}</td>
                <td className="px-3 py-2 font-medium whitespace-nowrap">
                  {fmtEur(o.importe)}
                  {o.estimacion && (
                    <span
                      className={`ml-1 text-xs ${o.estimacion.margenPrevisto >= 0.15 ? 'text-green-600' : o.estimacion.margenPrevisto >= 0.05 ? 'text-amber-600' : 'text-red-600'}`}
                      title={`Estimación: ${o.estimacion.totalHoras} h · coste equipo ${fmtEur(o.estimacion.costeEquipo)} · margen previsto ${(o.estimacion.margenPrevisto * 100).toFixed(1)}%`}
                    >
                      {(o.estimacion.margenPrevisto * 100).toFixed(0)}%
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Badge color={badgeEstado[o.estado]}>{o.estado}</Badge>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {!o.proyectoId && o.estado !== 'rechazada' && (
                    <Btn variant="ghost" onClick={() => convertirEnProyecto(o)}>
                      → Proyecto
                    </Btn>
                  )}
                  <Btn variant="ghost" onClick={() => abrir(o)}>
                    Editar
                  </Btn>
                  <Btn variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => borrar(o)}>
                    Eliminar
                  </Btn>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {asistente && (
        <AsistenteOferta
          data={data}
          clientes={data.contactos.filter((c) => c.tipo === 'cliente')}
          onCrear={crearDesdeAsistente}
          onClose={() => setAsistente(false)}
        />
      )}

      {abierto && (
        <Modal title={editando ? 'Editar oferta' : 'Nueva oferta'} onClose={() => setAbierto(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Código">
                <input className={inputCls} value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
              </Field>
              <Field label="Fecha">
                <input type="date" className={inputCls} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
              </Field>
            </div>
            <Field label="Cliente *">
              <input
                className={inputCls}
                list="clientes-lista"
                value={form.clienteNombre}
                onChange={(e) => setForm({ ...form, clienteNombre: e.target.value })}
                placeholder="Escribe el nombre (se crea si no existe)"
              />
              <datalist id="clientes-lista">
                {data.contactos
                  .filter((c) => c.tipo === 'cliente')
                  .map((c) => (
                    <option key={c.id} value={c.nombre} />
                  ))}
              </datalist>
            </Field>
            <Field label="Título / objeto de la oferta *">
              <input className={inputCls} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Línea de servicio">
                <select className={inputCls} value={form.lineaServicio} onChange={(e) => setForm({ ...form, lineaServicio: e.target.value as LineaServicio })}>
                  {LINEAS_SERVICIO.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Importe (€, sin IVA)">
                <input type="number" step="0.01" className={inputCls} value={form.importe} onChange={(e) => setForm({ ...form, importe: e.target.value })} />
              </Field>
            </div>
            <Field label="Estado">
              <select className={inputCls} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoOferta })}>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notas">
              <textarea className={inputCls} rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="secondary" onClick={() => setAbierto(false)}>
                Cancelar
              </Btn>
              <Btn onClick={guardar} disabled={!form.clienteNombre.trim() || !form.titulo.trim()}>
                Guardar
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Ofertas;
