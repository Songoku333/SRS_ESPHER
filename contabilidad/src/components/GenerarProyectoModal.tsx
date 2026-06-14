import React, { useState } from 'react';
import { setState, uid, ensureContacto, getState } from '../lib/store';
import { Factura, LineaServicio, LINEAS_SERVICIO, CategoriaGasto, CATEGORIAS_GASTO, Reparto, Gasto } from '../types';
import { estimarProyecto, adivinarLinea } from '../lib/plantillas';
import { fmtEur } from '../lib/format';
import { Modal, Btn, Field, inputCls } from './ui';

interface RolEdit {
  nombre: string;
  horas: string;
}
interface GastoEdit {
  concepto: string;
  categoria: CategoriaGasto;
  base: string;
}

const GenerarProyectoModal: React.FC<{ factura: Factura; onClose: () => void; onHecho?: () => void }> = ({
  factura,
  onClose,
  onHecho,
}) => {
  const construir = (linea: LineaServicio, eurHora?: number) => {
    const est = estimarProyecto(linea, factura.base, eurHora);
    return {
      linea,
      eurPorHora: String(est.eurPorHora),
      comercialPct: String(est.comercialPct),
      generalesPct: String(est.generalesPct),
      roles: est.roles.slice(0, 6).map((r) => ({ nombre: r.nombre, horas: String(r.horas) })),
      gastos: est.gastos.map((g) => ({ concepto: g.concepto, categoria: g.categoria, base: String(g.base) })),
    };
  };

  const lineaInicial = adivinarLinea(factura.concepto);
  const [comercialNombre, setComercialNombre] = useState('');
  const [estado, setEstado] = useState(construir(lineaInicial));

  const totalHoras = estado.roles.reduce((s, r) => s + (parseFloat(r.horas) || 0), 0);

  const recalcular = () => setEstado(construir(estado.linea, parseFloat(estado.eurPorHora)));
  const cambiarLinea = (linea: LineaServicio) => setEstado(construir(linea, parseFloat(estado.eurPorHora)));

  const setRol = (i: number, campo: 'nombre' | 'horas', v: string) => {
    const roles = [...estado.roles];
    roles[i] = { ...roles[i], [campo]: v };
    setEstado({ ...estado, roles });
  };
  const setGasto = (i: number, campo: keyof GastoEdit, v: string) => {
    const gastos = [...estado.gastos];
    gastos[i] = { ...gastos[i], [campo]: v } as GastoEdit;
    setEstado({ ...estado, gastos });
  };

  const crear = () => {
    const data = getState();
    const cliente = data.contactos.find((c) => c.id === factura.clienteId);
    const comercialId = comercialNombre.trim() ? ensureContacto(comercialNombre, 'colaborador') : undefined;
    const repartos: Reparto[] = estado.roles
      .filter((r) => r.nombre.trim() && parseFloat(r.horas) > 0)
      .slice(0, 6)
      .map((r) => ({ contactoId: ensureContacto(r.nombre, 'colaborador'), valor: parseFloat(r.horas) }));

    const proyectoId = uid();
    const codigo = `PR-${factura.numero}`;
    const nuevosGastos: Gasto[] = estado.gastos
      .filter((g) => g.concepto.trim() && parseFloat(g.base) > 0)
      .map((g) => {
        const base = parseFloat(g.base) || 0;
        const ivaPct = 21;
        return {
          id: uid(),
          fecha: factura.fecha,
          concepto: g.concepto,
          categoria: g.categoria,
          base,
          ivaPct,
          total: Math.round(base * (1 + ivaPct / 100) * 100) / 100,
          proyectoId,
          facturaId: factura.id,
          estado: 'pendiente' as const,
        };
      });

    setState((p) => ({
      ...p,
      proyectos: [
        ...p.proyectos,
        {
          id: proyectoId,
          codigo,
          nombre: factura.concepto || `Proyecto ${factura.numero}`,
          clienteId: factura.clienteId,
          lineaServicio: estado.linea,
          presupuesto: factura.base,
          fechaInicio: factura.fecha,
          estado: 'activo' as const,
          modoReparto: 'horas' as const,
          comercialId,
          comercialPct: parseFloat(estado.comercialPct) || 0,
          gastosGeneralesPct: parseFloat(estado.generalesPct) || 0,
          repartos,
          notas: `Proyecto generado con estimación orientativa a partir de la factura ${factura.numero}` + (cliente ? ` · ${cliente.nombre}` : ''),
        },
      ],
      gastos: [...p.gastos, ...nuevosGastos],
      facturas: p.facturas.map((f) => (f.id === factura.id ? { ...f, proyectoId } : f)),
    }));
    onHecho?.();
    onClose();
  };

  return (
    <Modal title={`Generar proyecto para ${factura.numero}`} onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Estimación <strong>orientativa</strong> de equipo, horas y gastos típicos según el tipo de proyecto y
          el importe de la factura ({fmtEur(factura.base)} de base). Ajusta lo que necesites: todo es editable
          ahora y también después en el proyecto y en los gastos.
        </p>

        <div className="grid md:grid-cols-4 gap-3">
          <Field label="Tipo de proyecto" className="md:col-span-2">
            <select className={inputCls} value={estado.linea} onChange={(e) => cambiarLinea(e.target.value as LineaServicio)}>
              {LINEAS_SERVICIO.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Tarifa media (€/h)">
            <input
              type="number"
              className={inputCls}
              value={estado.eurPorHora}
              onChange={(e) => setEstado({ ...estado, eurPorHora: e.target.value })}
              onBlur={recalcular}
            />
          </Field>
          <div className="flex items-end">
            <Btn variant="secondary" onClick={recalcular} className="w-full">
              ↻ Recalcular
            </Btn>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Comercial (recibe la comisión)">
            <input className={inputCls} value={comercialNombre} onChange={(e) => setComercialNombre(e.target.value)} placeholder="Opcional" />
          </Field>
          <Field label="% comisión comercial">
            <input type="number" step="0.5" className={inputCls} value={estado.comercialPct} onChange={(e) => setEstado({ ...estado, comercialPct: e.target.value })} />
          </Field>
          <Field label="% gastos generales">
            <input type="number" step="0.5" className={inputCls} value={estado.generalesPct} onChange={(e) => setEstado({ ...estado, generalesPct: e.target.value })} />
          </Field>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Equipo y horas estimadas <span className="text-gray-400 font-normal">· {totalHoras} h en total · reparto por horas</span>
            </span>
            <Btn
              variant="secondary"
              disabled={estado.roles.length >= 6}
              onClick={() => setEstado({ ...estado, roles: [...estado.roles, { nombre: '', horas: '' }] })}
            >
              + Rol
            </Btn>
          </div>
          {estado.roles.map((r, i) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <div className="flex-1 min-w-0">
                <input className={inputCls} placeholder="Rol o colaborador" value={r.nombre} onChange={(e) => setRol(i, 'nombre', e.target.value)} />
              </div>
              <div className="w-24 flex-none">
                <input type="number" className={inputCls} placeholder="h" value={r.horas} onChange={(e) => setRol(i, 'horas', e.target.value)} />
              </div>
              <span className="text-xs text-gray-400">h</span>
              <button className="text-red-500 hover:text-red-700 px-1" onClick={() => setEstado({ ...estado, roles: estado.roles.filter((_, j) => j !== i) })}>
                ✕
              </button>
            </div>
          ))}
          <p className="text-xs text-gray-400">
            Renombra cada rol con la persona real cuando la conozcas. El reparto se hace proporcional a las horas.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Gastos típicos estimados (pendientes de pago)</span>
            <Btn
              variant="secondary"
              onClick={() => setEstado({ ...estado, gastos: [...estado.gastos, { concepto: '', categoria: 'Otros', base: '' }] })}
            >
              + Gasto
            </Btn>
          </div>
          {estado.gastos.map((g, i) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <div className="flex-1 min-w-0">
                <input className={inputCls} placeholder="Concepto" value={g.concepto} onChange={(e) => setGasto(i, 'concepto', e.target.value)} />
              </div>
              <div className="w-56 flex-none">
                <select className={inputCls} value={g.categoria} onChange={(e) => setGasto(i, 'categoria', e.target.value)}>
                  {CATEGORIAS_GASTO.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="w-28 flex-none">
                <input type="number" step="0.01" className={inputCls} placeholder="€ base" value={g.base} onChange={(e) => setGasto(i, 'base', e.target.value)} />
              </div>
              <button className="text-red-500 hover:text-red-700 px-1" onClick={() => setEstado({ ...estado, gastos: estado.gastos.filter((_, j) => j !== i) })}>
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Btn variant="secondary" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn onClick={crear}>Crear proyecto y gastos</Btn>
        </div>
      </div>
    </Modal>
  );
};

export default GenerarProyectoModal;
