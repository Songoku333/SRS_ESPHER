import React, { useMemo, useState } from 'react';
import { useAppData, setState, uid } from '../lib/store';
import { Liquidacion } from '../types';
import { resumenRepartos, ResumenReparto } from '../lib/calculos';
import { fmtEur, fmtDate, hoy } from '../lib/format';
import { Card, PageTitle, Btn, Modal, Field, inputCls, Table, Badge, badgeEstado, Empty } from '../components/ui';

const Liquidaciones: React.FC = () => {
  const data = useAppData();
  const [registrando, setRegistrando] = useState<ResumenReparto | null>(null);
  const [importe, setImporte] = useState('');
  const [fecha, setFecha] = useState(hoy());
  const [pagadaYa, setPagadaYa] = useState(false);

  const resumen = useMemo(() => resumenRepartos(data), [data]);
  const nombre = (id: string) => data.contactos.find((c) => c.id === id)?.nombre || '—';

  const abrirRegistro = (r: ResumenReparto) => {
    setRegistrando(r);
    setImporte(Math.max(0, r.pendiente).toFixed(2));
    setFecha(hoy());
    setPagadaYa(false);
  };

  const registrar = () => {
    if (!registrando) return;
    const liq: Liquidacion = {
      id: uid(),
      proyectoId: registrando.proyecto.id,
      contactoId: registrando.contactoId,
      concepto: `Liquidación ${registrando.proyecto.codigo} · ${nombre(registrando.contactoId)}`,
      importe: parseFloat(importe) || 0,
      fecha,
      estado: pagadaYa ? 'pagada' : 'pendiente',
      fechaPago: pagadaYa ? fecha : undefined,
    };
    setState((p) => ({ ...p, liquidaciones: [...p.liquidaciones, liq] }));
    setRegistrando(null);
  };

  const marcarPagada = (l: Liquidacion) => {
    setState((p) => ({
      ...p,
      liquidaciones: p.liquidaciones.map((x) =>
        x.id === l.id ? { ...x, estado: 'pagada' as const, fechaPago: hoy() } : x
      ),
    }));
  };

  const borrar = (l: Liquidacion) => {
    if (confirm('¿Eliminar esta liquidación?')) {
      setState((p) => ({
        ...p,
        liquidaciones: p.liquidaciones.filter((x) => x.id !== l.id),
        movimientos: p.movimientos.map((m) =>
          m.conciliacion?.tipo === 'liquidacion' && m.conciliacion.id === l.id
            ? { ...m, conciliacion: undefined }
            : m
        ),
      }));
    }
  };

  const conReparto = resumen.filter((r) => r.devengado > 0 || r.comprometido > 0 || r.liquidado > 0);
  const totalPendiente = resumen.reduce((s, r) => s + Math.max(0, r.pendiente), 0);
  const liquidacionesOrdenadas = [...data.liquidaciones].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div>
      <PageTitle
        title="Reparto y liquidaciones"
        subtitle={`${fmtEur(totalPendiente)} devengado pendiente de liquidar con colaboradores y proveedores`}
      />

      <Card className="mb-6">
        <div className="px-4 pt-4">
          <h3 className="font-semibold text-gray-800">Estado del reparto por proyecto</h3>
          <p className="text-xs text-gray-500 mt-1 mb-2">
            Calculado automáticamente: % de reparto sobre la base imponible <strong>cobrada</strong> de cada
            proyecto, menos lo ya liquidado.
          </p>
        </div>
        {conReparto.length === 0 ? (
          <Empty>
            No hay repartos con importes todavía. Define los repartos en cada proyecto y marca facturas como
            cobradas.
          </Empty>
        ) : (
          <Table headers={['Proyecto', 'Colaborador / proveedor', '%', 'Devengado', 'Liquidado', 'Comprometido', 'Pendiente', '']}>
            {conReparto.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.proyecto.codigo} <span className="text-gray-400 text-xs">{r.proyecto.nombre}</span>
                </td>
                <td className="px-3 py-2 font-medium">{nombre(r.contactoId)}</td>
                <td className="px-3 py-2">{r.porcentaje}%</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtEur(r.devengado)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-green-700">{fmtEur(r.liquidado)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-amber-700">{fmtEur(r.comprometido)}</td>
                <td className={`px-3 py-2 font-semibold whitespace-nowrap ${r.pendiente > 0.005 ? 'text-red-600' : 'text-gray-500'}`}>
                  {fmtEur(r.pendiente)}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.pendiente > 0.005 && (
                    <Btn variant="ghost" onClick={() => abrirRegistro(r)}>
                      Registrar liquidación
                    </Btn>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card>
        <div className="px-4 pt-4">
          <h3 className="font-semibold text-gray-800 mb-2">Liquidaciones registradas</h3>
        </div>
        {liquidacionesOrdenadas.length === 0 ? (
          <Empty>Sin liquidaciones registradas.</Empty>
        ) : (
          <Table headers={['Fecha', 'Proyecto', 'Beneficiario', 'Concepto', 'Importe', 'Estado', '']}>
            {liquidacionesOrdenadas.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(l.fecha)}</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {data.proyectos.find((p) => p.id === l.proyectoId)?.codigo || '—'}
                </td>
                <td className="px-3 py-2 font-medium">{nombre(l.contactoId)}</td>
                <td className="px-3 py-2 text-gray-600">{l.concepto}</td>
                <td className="px-3 py-2 font-semibold whitespace-nowrap">{fmtEur(l.importe)}</td>
                <td className="px-3 py-2">
                  <Badge color={badgeEstado[l.estado]}>{l.estado}</Badge>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {l.estado === 'pendiente' && (
                    <Btn variant="ghost" onClick={() => marcarPagada(l)}>
                      ✓ Pagada
                    </Btn>
                  )}
                  <Btn variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => borrar(l)}>
                    Eliminar
                  </Btn>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {registrando && (
        <Modal
          title={`Liquidar a ${nombre(registrando.contactoId)} · ${registrando.proyecto.codigo}`}
          onClose={() => setRegistrando(null)}
        >
          <div className="space-y-3">
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              Pendiente según reparto: <strong>{fmtEur(registrando.pendiente)}</strong> ({registrando.porcentaje}%
              de lo cobrado)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Importe (€)">
                <input type="number" step="0.01" className={inputCls} value={importe} onChange={(e) => setImporte(e.target.value)} />
              </Field>
              <Field label="Fecha">
                <input type="date" className={inputCls} value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={pagadaYa} onChange={(e) => setPagadaYa(e.target.checked)} />
              Ya está pagada (si no, quedará pendiente y podrás conciliarla con el banco)
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="secondary" onClick={() => setRegistrando(null)}>
                Cancelar
              </Btn>
              <Btn onClick={registrar} disabled={!(parseFloat(importe) > 0)}>
                Registrar
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Liquidaciones;
