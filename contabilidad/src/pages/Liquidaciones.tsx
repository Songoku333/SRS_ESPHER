import React, { useMemo, useState } from 'react';
import { useAppData, setState, uid } from '../lib/store';
import { useDatosVisibles } from '../lib/vista';
import { Liquidacion } from '../types';
import { facturasPorLiquidar, desgloseFactura, DesgloseFactura, LineaLiquidacion, totalPendienteLiquidar } from '../lib/liquidacion';
import { fmtEur, fmtDate, hoy } from '../lib/format';
import { Card, PageTitle, Btn, Table, Badge, badgeEstado, Empty } from '../components/ui';

const Fila: React.FC<{ etiqueta: string; valor: string; signo?: '+' | '−'; fuerte?: boolean; nota?: string }> = ({
  etiqueta,
  valor,
  signo,
  fuerte,
  nota,
}) => (
  <div className={`flex justify-between items-baseline py-1 ${fuerte ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
    <span className="text-sm">
      {signo && <span className="text-gray-400 mr-1">{signo}</span>}
      {etiqueta}
      {nota && <span className="text-xs text-gray-400 ml-1">{nota}</span>}
    </span>
    <span className="text-sm whitespace-nowrap">{valor}</span>
  </div>
);

const TarjetaFactura: React.FC<{ d: DesgloseFactura }> = ({ d }) => {
  const data = useDatosVisibles();
  const cliente = data.contactos.find((c) => c.id === d.factura.clienteId)?.nombre || '—';

  const togglePagada = (linea: LineaLiquidacion) => {
    if (linea.pagada && linea.liquidacionId) {
      // Deshacer pago: eliminar la liquidación y desconciliar movimientos
      const lid = linea.liquidacionId;
      setState((p) => ({
        ...p,
        liquidaciones: p.liquidaciones.filter((l) => l.id !== lid),
        movimientos: p.movimientos.map((m) =>
          m.conciliacion?.tipo === 'liquidacion' && m.conciliacion.id === lid
            ? { ...m, conciliacion: undefined }
            : m
        ),
      }));
    } else {
      const liq: Liquidacion = {
        id: uid(),
        proyectoId: d.factura.proyectoId || '',
        facturaId: d.factura.id,
        contactoId: linea.contactoId,
        rol: linea.rol,
        concepto: `${linea.rol === 'comercial' ? 'Comisión comercial' : 'Reparto'} ${d.factura.numero} · ${linea.nombre}`,
        importe: linea.importe,
        fecha: hoy(),
        estado: 'pagada',
        fechaPago: hoy(),
      };
      setState((p) => ({ ...p, liquidaciones: [...p.liquidaciones, liq] }));
    }
  };

  const marcarLiquidada = (valor: boolean) => {
    setState((p) => ({
      ...p,
      facturas: p.facturas.map((f) => (f.id === d.factura.id ? { ...f, liquidada: valor } : f)),
    }));
  };

  const gastosPendientes = d.gastos.filter((g) => g.estado === 'pendiente');

  return (
    <Card className="mb-4 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-gray-900">{d.factura.numero}</span>
          <span className="text-gray-500 text-sm ml-2">{fmtDate(d.factura.fecha)} · {cliente}</span>
          {d.proyecto && <span className="text-gray-400 text-xs ml-2">{d.proyecto.codigo} · {d.proyecto.nombre}</span>}
        </div>
        <div className="flex items-center gap-2">
          {d.liquidada ? (
            <Badge color="bg-green-100 text-green-700">liquidada</Badge>
          ) : d.pendiente <= 0.005 ? (
            <Badge color="bg-teal-100 text-teal-700">todo pagado</Badge>
          ) : (
            <Badge color="bg-amber-100 text-amber-700">{fmtEur(d.pendiente)} pendiente</Badge>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 p-4">
        {/* Cascada */}
        <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Cálculo de la base de reparto</h4>
          <Fila etiqueta="Base imponible cobrada" valor={fmtEur(d.baseImponible)} fuerte />
          <Fila etiqueta="Gastos propios de la factura" valor={fmtEur(d.totalGastos)} signo="−" />
          <div className="border-t border-gray-200 my-1" />
          <Fila etiqueta="Neto tras gastos" valor={fmtEur(d.netoTrasGastos)} fuerte />
          <Fila etiqueta={`Comisión comercial`} nota={`(${d.comercialPct}%)`} valor={fmtEur(d.importeComercial)} signo="−" />
          <Fila etiqueta={`Gastos generales de empresa`} nota={`(${d.generalesPct}%)`} valor={fmtEur(d.importeGenerales)} signo="−" />
          <div className="border-t border-gray-300 my-1" />
          <Fila etiqueta="Base de reparto a colaboradores" valor={fmtEur(d.baseReparto)} fuerte />

          {d.gastos.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Gastos imputados</div>
              <ul className="text-xs text-gray-600 space-y-0.5">
                {d.gastos.map((g) => (
                  <li key={g.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {g.concepto} <Badge color={badgeEstado[g.estado]}>{g.estado}</Badge>
                    </span>
                    <span className="whitespace-nowrap">{fmtEur(g.base)}</span>
                  </li>
                ))}
              </ul>
              {gastosPendientes.length > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Hay gastos pendientes de pago; págalos o concílialos en Banco antes de dar la factura por liquidada.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Reparto */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Reparto {d.modoReparto === 'horas' ? '(por horas)' : '(por %)'}
          </h4>
          {d.lineas.length === 0 ? (
            <Empty>
              Este proyecto no tiene comercial ni colaboradores con reparto. Configúralos en Proyectos.
            </Empty>
          ) : (
            <Table headers={['Beneficiario', d.modoReparto === 'horas' ? 'Horas' : '%', 'A percibir', 'Pagado']}>
              {d.lineas.map((l, i) => (
                <tr key={i} className={l.pagada ? 'bg-green-50/40' : ''}>
                  <td className="px-3 py-2">
                    {l.nombre}
                    {l.rol === 'comercial' && <Badge color="bg-blue-100 text-blue-700"> comercial</Badge>}
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {l.rol === 'comercial' ? `${l.valor}% com.` : d.modoReparto === 'horas' ? `${l.valor} h` : `${l.valor}%`}
                  </td>
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">{fmtEur(l.importe)}</td>
                  <td className="px-3 py-2">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={l.pagada} onChange={() => togglePagada(l)} />
                      {l.pagada ? <span className="text-green-700">pagado</span> : <span className="text-gray-400">pendiente</span>}
                    </label>
                  </td>
                </tr>
              ))}
              <tr className="border-t border-gray-200 font-semibold">
                <td className="px-3 py-2" colSpan={2}>
                  Total a repartir
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtEur(d.totalAPagar)}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{fmtEur(d.totalPagado)} pagado</td>
              </tr>
            </Table>
          )}

          <div className="flex justify-end mt-3">
            {d.liquidada ? (
              <Btn variant="secondary" onClick={() => marcarLiquidada(false)}>
                Reabrir factura
              </Btn>
            ) : (
              <Btn
                onClick={() => marcarLiquidada(true)}
                disabled={d.pendiente > 0.005 || gastosPendientes.length > 0}
                title={
                  d.pendiente > 0.005
                    ? 'Marca todos los repartos como pagados primero'
                    : gastosPendientes.length > 0
                    ? 'Quedan gastos pendientes de pago'
                    : ''
                }
              >
                ✓ Marcar factura como liquidada
              </Btn>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

const Liquidaciones: React.FC = () => {
  const data = useDatosVisibles();
  const [verLiquidadas, setVerLiquidadas] = useState(false);

  const porLiquidar = useMemo(() => facturasPorLiquidar(data), [data]);
  const totalPendiente = useMemo(() => totalPendienteLiquidar(data), [data]);
  const liquidadas = useMemo(
    () => data.facturas.filter((f) => f.liquidada).map((f) => desgloseFactura(data, f)).sort((a, b) => b.factura.fecha.localeCompare(a.factura.fecha)),
    [data]
  );

  return (
    <div>
      <PageTitle
        title="Reparto y liquidaciones"
        subtitle={`${fmtEur(totalPendiente)} pendiente de repartir entre comercial y colaboradores`}
      />

      <Card className="p-4 mb-5 bg-blue-50 border-blue-200 text-sm text-blue-900">
        <strong>Cómo se liquida cada factura:</strong> de la base imponible cobrada se descuentan primero los
        gastos propios (OCAs, visados, desplazamientos, subcontratación…), luego un % de comisión comercial y
        un % de gastos generales de la empresa. Lo que queda es la base que se reparte entre los colaboradores
        (por % o por horas). Configura los porcentajes y el equipo en cada Proyecto.
      </Card>

      {porLiquidar.length === 0 ? (
        <Card>
          <Empty>
            No hay facturas cobradas pendientes de liquidar. Marca facturas como cobradas (o concílialas en
            Banco) para que aparezcan aquí.
          </Empty>
        </Card>
      ) : (
        porLiquidar.map((d) => <TarjetaFactura key={d.factura.id} d={d} />)
      )}

      {liquidadas.length > 0 && (
        <div className="mt-6">
          <button
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            onClick={() => setVerLiquidadas((v) => !v)}
          >
            {verLiquidadas ? '▾' : '▸'} Facturas ya liquidadas ({liquidadas.length})
          </button>
          {verLiquidadas && <div className="mt-3">{liquidadas.map((d) => <TarjetaFactura key={d.factura.id} d={d} />)}</div>}
        </div>
      )}
    </div>
  );
};

export default Liquidaciones;
