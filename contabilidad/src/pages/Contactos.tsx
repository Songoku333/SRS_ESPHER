import React, { useState } from 'react';
import { useAppData, setState, uid } from '../lib/store';
import { useDatosVisibles } from '../lib/vista';
import { Contacto, TipoContacto } from '../types';
import { Card, PageTitle, Btn, Modal, Field, inputCls, Table, Badge, Empty } from '../components/ui';

const TIPOS: { valor: TipoContacto; etiqueta: string; color: string }[] = [
  { valor: 'cliente', etiqueta: 'Cliente', color: 'bg-blue-100 text-blue-700' },
  { valor: 'proveedor', etiqueta: 'Proveedor', color: 'bg-purple-100 text-purple-700' },
  { valor: 'colaborador', etiqueta: 'Colaborador', color: 'bg-teal-100 text-teal-700' },
];

const VACIO: Omit<Contacto, 'id'> = { tipo: 'cliente', nombre: '', nif: '', email: '', telefono: '', notas: '' };

/** Redimensiona una imagen a ≤300px de lado y la devuelve como dataURL PNG. */
async function redimensionarLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const escala = Math.min(1, 300 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

const Contactos: React.FC = () => {
  const data = useDatosVisibles();
  const [filtro, setFiltro] = useState<TipoContacto | 'todos'>('todos');
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<Contacto | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState(VACIO);

  const abrir = (c?: Contacto) => {
    if (c) {
      setEditando(c);
      setForm({ ...c });
    } else {
      setNuevo(true);
      setForm(VACIO);
    }
  };

  const cerrar = () => {
    setEditando(null);
    setNuevo(false);
  };

  const guardar = () => {
    if (!form.nombre.trim()) return;
    if (editando) {
      setState((p) => ({
        ...p,
        contactos: p.contactos.map((c) => (c.id === editando.id ? { ...c, ...form } : c)),
      }));
    } else {
      setState((p) => ({ ...p, contactos: [...p.contactos, { id: uid(), ...form }] }));
    }
    cerrar();
  };

  const borrar = (c: Contacto) => {
    const enUso =
      data.facturas.some((f) => f.clienteId === c.id) ||
      data.proyectos.some((p) => p.clienteId === c.id || p.repartos.some((r) => r.contactoId === c.id)) ||
      data.gastos.some((g) => g.contactoId === c.id) ||
      data.ofertas.some((o) => o.clienteId === c.id);
    if (enUso) {
      alert('No se puede eliminar: este contacto tiene facturas, proyectos, gastos u ofertas asociados.');
      return;
    }
    if (confirm(`¿Eliminar a "${c.nombre}"?`)) {
      setState((p) => ({ ...p, contactos: p.contactos.filter((x) => x.id !== c.id) }));
    }
  };

  const lista = data.contactos
    .filter((c) => filtro === 'todos' || c.tipo === filtro)
    .filter((c) => c.nombre.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div>
      <PageTitle
        title="Contactos"
        subtitle="Clientes, proveedores y colaboradores"
        actions={<Btn onClick={() => abrir()}>+ Nuevo contacto</Btn>}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          className={`${inputCls} max-w-xs`}
          placeholder="Buscar..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select className={`${inputCls} max-w-[180px]`} value={filtro} onChange={(e) => setFiltro(e.target.value as any)}>
          <option value="todos">Todos</option>
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.etiqueta}s
            </option>
          ))}
        </select>
      </div>

      <Card>
        {lista.length === 0 ? (
          <Empty>No hay contactos. Se crean automáticamente al importar facturas, o añádelos aquí.</Empty>
        ) : (
          <Table headers={['Nombre', 'Tipo', 'NIF', 'Email', 'Teléfono', '']}>
            {lista.map((c) => {
              const tipo = TIPOS.find((t) => t.valor === c.tipo)!;
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{c.nombre}</td>
                  <td className="px-3 py-2">
                    <Badge color={tipo.color}>{tipo.etiqueta}</Badge>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{c.nif || '—'}</td>
                  <td className="px-3 py-2 text-gray-500">{c.email || '—'}</td>
                  <td className="px-3 py-2 text-gray-500">{c.telefono || '—'}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <Btn variant="ghost" onClick={() => abrir(c)}>
                      Editar
                    </Btn>
                    <Btn variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => borrar(c)}>
                      Eliminar
                    </Btn>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {(nuevo || editando) && (
        <Modal title={editando ? 'Editar contacto' : 'Nuevo contacto'} onClose={cerrar}>
          <div className="space-y-3">
            <Field label="Nombre *">
              <input className={inputCls} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </Field>
            <Field label="Tipo">
              <select className={inputCls} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoContacto })}>
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.etiqueta}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="NIF / CIF">
                <input className={inputCls} value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} />
              </Field>
              <Field label="Teléfono">
                <input className={inputCls} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </Field>
            </div>
            {form.tipo === 'cliente' && (
              <Field label="Logo del cliente (para la portada de las ofertas)">
                <div className="flex items-center gap-3">
                  {form.logo && <img src={form.logo} alt="logo" className="h-10 max-w-[120px] object-contain border border-gray-200 rounded p-1" />}
                  <input
                    type="file"
                    accept="image/*"
                    className="text-sm text-gray-600"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) setForm({ ...form, logo: await redimensionarLogo(f) });
                      e.target.value = '';
                    }}
                  />
                  {form.logo && (
                    <Btn variant="ghost" className="text-red-600" onClick={() => setForm({ ...form, logo: undefined })}>✕</Btn>
                  )}
                </div>
              </Field>
            )}
            <Field label="Email">
              <input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Notas">
              <textarea className={inputCls} rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="secondary" onClick={cerrar}>
                Cancelar
              </Btn>
              <Btn onClick={guardar} disabled={!form.nombre.trim()}>
                Guardar
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Contactos;
