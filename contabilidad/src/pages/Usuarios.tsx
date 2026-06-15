import React, { useState } from 'react';
import { useAppData } from '../lib/store';
import { useAcceso, guardarMiembro, eliminarMiembro, seccionesPorRol } from '../lib/acceso';
import { Miembro, Rol, ROLES, Page } from '../types';
import { Card, PageTitle, Btn, Modal, Field, inputCls, Table, Badge, Empty } from '../components/ui';

const SECCIONES: { page: Page; label: string }[] = [
  { page: 'dashboard', label: 'Panel' },
  { page: 'ofertas', label: 'Ofertas' },
  { page: 'proyectos', label: 'Proyectos' },
  { page: 'facturas', label: 'Facturas' },
  { page: 'gastos', label: 'Gastos' },
  { page: 'banco', label: 'Banco' },
  { page: 'liquidaciones', label: 'Liquidaciones' },
  { page: 'rentabilidad', label: 'Rentabilidad' },
  { page: 'contactos', label: 'Contactos' },
  { page: 'importar', label: 'Importar Excel' },
  { page: 'usuarios', label: 'Usuarios' },
  { page: 'ajustes', label: 'Ajustes' },
];

const ROL_COLOR: Record<Rol, string> = {
  direccion: 'bg-teal-100 text-teal-700',
  gestion: 'bg-blue-100 text-blue-700',
  colaborador: 'bg-purple-100 text-purple-700',
};

function vacio(): Miembro {
  return { email: '', nombre: '', rol: 'colaborador', activo: true, clientesAsignados: [], proyectosAsignados: [], contactoId: undefined };
}

const Usuarios: React.FC = () => {
  const data = useAppData();
  const acceso = useAcceso();
  const [abierto, setAbierto] = useState(false);
  const [esNuevo, setEsNuevo] = useState(true);
  const [form, setForm] = useState<Miembro>(vacio());
  const [secOverride, setSecOverride] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const nombreContacto = (id?: string) => (id ? data.contactos.find((c) => c.id === id)?.nombre || '—' : '—');
  const clientes = data.contactos.filter((c) => c.tipo === 'cliente');
  const colaboradores = data.contactos.filter((c) => c.tipo !== 'cliente');

  const abrir = (m?: Miembro) => {
    if (m) {
      setForm({ ...m });
      setSecOverride(!!m.secciones);
      setEsNuevo(false);
    } else {
      setForm(vacio());
      setSecOverride(false);
      setEsNuevo(true);
    }
    setMsg(null);
    setAbierto(true);
  };

  const guardar = async () => {
    if (!form.email.trim()) return;
    const m: Miembro = { ...form, secciones: secOverride ? form.secciones ?? seccionesPorRol(form.rol) : undefined };
    const err = await guardarMiembro(m);
    if (err) setMsg('No se pudo guardar: ' + err);
    else setAbierto(false);
  };

  const borrar = async (m: Miembro) => {
    if (m.email.toLowerCase() === acceso.email.toLowerCase()) {
      alert('No puedes eliminar tu propio acceso.');
      return;
    }
    if (confirm(`¿Quitar el acceso de ${m.email}?`)) {
      const err = await eliminarMiembro(m.email);
      if (err) setMsg('No se pudo eliminar: ' + err);
    }
  };

  const toggle = (lista: string[], id: string): string[] =>
    lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];

  const seccionesActuales = secOverride ? form.secciones ?? seccionesPorRol(form.rol) : seccionesPorRol(form.rol);

  if (!acceso.multiusuarioActivo) {
    return (
      <div>
        <PageTitle title="Usuarios y accesos" subtitle="Equipo, roles y permisos" />
        <Card className="p-6 bg-amber-50 border-amber-200">
          <h3 className="font-semibold text-amber-900">Falta activar el multiusuario en tu Supabase</h3>
          <p className="text-sm text-amber-800 mt-2">
            Para dar acceso a tu equipo con permisos por rol, primero hay que crear la tabla de miembros y las
            reglas de seguridad en tu proyecto. Ejecuta el script <code>supabase/schema-multiusuario.sql</code>
            en el SQL Editor (con una copia de seguridad previa desde Ajustes). En cuanto esté, esta pantalla te
            dejará invitar y gestionar a David, Rubén y al resto del equipo.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageTitle
        title="Usuarios y accesos"
        subtitle="Equipo, roles y permisos"
        actions={<Btn onClick={() => abrir()}>+ Dar acceso</Btn>}
      />
      {msg && <Card className="p-3 mb-4 bg-red-50 border-red-200 text-sm text-red-700">{msg}</Card>}

      <Card className="p-4 mb-4 bg-blue-50 border-blue-200 text-sm text-blue-900">
        Cada persona entra con su propio email y contraseña (créalos en Supabase → Authentication → Users con el
        mismo email). <strong>Dirección general</strong> ve y administra todo. <strong>Gestión</strong> ve solo
        los clientes y proyectos que le asignes, sin resultados globales. <strong>Colaborador</strong> ve solo
        los proyectos en los que participa y sus liquidaciones.
      </Card>

      <Card>
        {acceso.miembros.length === 0 ? (
          <Empty>Aún no has dado acceso a nadie. Tú entras como Dirección por defecto.</Empty>
        ) : (
          <Table headers={['Email', 'Nombre', 'Rol', 'Vinculado a', 'Alcance', 'Estado', '']}>
            {acceso.miembros.map((m) => (
              <tr key={m.email} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{m.email}</td>
                <td className="px-3 py-2">{m.nombre || '—'}</td>
                <td className="px-3 py-2">
                  <Badge color={ROL_COLOR[m.rol]}>{ROLES.find((r) => r.valor === m.rol)?.etiqueta}</Badge>
                </td>
                <td className="px-3 py-2 text-gray-500">{nombreContacto(m.contactoId)}</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {m.rol === 'direccion'
                    ? 'Todo'
                    : m.rol === 'gestion'
                    ? `${m.clientesAsignados.length} clientes · ${m.proyectosAsignados.length} proyectos`
                    : 'Sus proyectos'}
                </td>
                <td className="px-3 py-2">
                  <Badge color={m.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                    {m.activo ? 'activo' : 'inactivo'}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Btn variant="ghost" onClick={() => abrir(m)}>
                    Editar
                  </Btn>
                  <Btn variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => borrar(m)}>
                    Quitar
                  </Btn>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {abierto && (
        <Modal title={esNuevo ? 'Dar acceso a una persona' : `Editar acceso de ${form.email}`} onClose={() => setAbierto(false)} wide>
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Email *">
                <input className={inputCls} value={form.email} disabled={!esNuevo} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="persona@empresa.com" />
              </Field>
              <Field label="Nombre">
                <input className={inputCls} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="David García Andrés" />
              </Field>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Rol">
                <select className={inputCls} value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}>
                  {ROLES.map((r) => (
                    <option key={r.valor} value={r.valor}>
                      {r.etiqueta}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Vinculado al contacto (para actuar como colaborador/comercial)">
                <input className={inputCls} list="contactos-mie" value={nombreContacto(form.contactoId)} onChange={(e) => {
                  const c = data.contactos.find((x) => x.nombre === e.target.value);
                  setForm({ ...form, contactoId: c?.id });
                }} placeholder="Opcional" />
                <datalist id="contactos-mie">
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.nombre} />
                  ))}
                </datalist>
              </Field>
            </div>
            <p className="text-xs text-gray-500">{ROLES.find((r) => r.valor === form.rol)?.descripcion}</p>

            {form.rol === 'gestion' && (
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <span className="block text-xs font-medium text-gray-600 mb-1">Clientes asignados</span>
                  <div className="border border-gray-200 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                    {clientes.length === 0 ? (
                      <p className="text-xs text-gray-400">No hay clientes.</p>
                    ) : (
                      clientes.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={form.clientesAsignados.includes(c.id)} onChange={() => setForm({ ...form, clientesAsignados: toggle(form.clientesAsignados, c.id) })} />
                          {c.nombre}
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-medium text-gray-600 mb-1">Proyectos asignados (además de los de sus clientes)</span>
                  <div className="border border-gray-200 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                    {data.proyectos.length === 0 ? (
                      <p className="text-xs text-gray-400">No hay proyectos.</p>
                    ) : (
                      data.proyectos.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={form.proyectosAsignados.includes(p.id)} onChange={() => setForm({ ...form, proyectosAsignados: toggle(form.proyectosAsignados, p.id) })} />
                          {p.codigo} · {p.nombre}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                <input type="checkbox" checked={secOverride} onChange={(e) => setSecOverride(e.target.checked)} />
                Personalizar qué secciones ve (si no, usa las del rol)
              </label>
              {secOverride && (
                <div className="flex flex-wrap gap-2">
                  {SECCIONES.map((s) => (
                    <label key={s.page} className={`flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-1 cursor-pointer ${seccionesActuales.includes(s.page) ? 'bg-teal-50 border-teal-300 text-teal-800' : 'border-gray-200 text-gray-500'}`}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={seccionesActuales.includes(s.page)}
                        onChange={() => {
                          const base = form.secciones ?? seccionesPorRol(form.rol);
                          const next = base.includes(s.page) ? base.filter((x) => x !== s.page) : [...base, s.page];
                          setForm({ ...form, secciones: next });
                        }}
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
              Acceso activo
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="secondary" onClick={() => setAbierto(false)}>
                Cancelar
              </Btn>
              <Btn onClick={guardar} disabled={!form.email.trim()}>
                Guardar acceso
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Usuarios;
