import React, { useMemo, useState } from 'react';
import { useAppData, setState, uid, ensureContacto, getState } from '../lib/store';
import { leerExcel, detectarColumna, HojaExcel } from '../lib/excel';
import { parseImporte, parseFecha, fmtEur } from '../lib/format';
import { TipoMovimiento, TIPOS_MOVIMIENTO } from '../types';
import { Card, PageTitle, Btn, Field, inputCls, Table, Empty } from '../components/ui';

type TipoImport = 'facturas' | 'banco' | 'gastos';

interface CampoDef {
  clave: string;
  etiqueta: string;
  obligatorio?: boolean;
  detectar: string[];
}

const CAMPOS: Record<TipoImport, CampoDef[]> = {
  facturas: [
    { clave: 'numero', etiqueta: 'Nº de factura', obligatorio: true, detectar: ['numero', 'nº', 'num', 'factura', 'no.'] },
    { clave: 'fecha', etiqueta: 'Fecha', obligatorio: true, detectar: ['fecha', 'date', 'emision'] },
    { clave: 'cliente', etiqueta: 'Cliente', obligatorio: true, detectar: ['cliente', 'razon social', 'nombre', 'customer'] },
    { clave: 'concepto', etiqueta: 'Concepto', detectar: ['concepto', 'descripcion', 'detalle', 'objeto'] },
    { clave: 'base', etiqueta: 'Base imponible', obligatorio: true, detectar: ['base', 'imponible', 'neto', 'subtotal'] },
    { clave: 'ivaPct', etiqueta: '% IVA', detectar: ['% iva', 'iva %', 'tipo iva', 'iva'] },
    { clave: 'irpfPct', etiqueta: '% IRPF', detectar: ['irpf', 'retencion'] },
    { clave: 'total', etiqueta: 'Total', detectar: ['total', 'importe total'] },
    { clave: 'estado', etiqueta: 'Estado / cobrada', detectar: ['estado', 'cobrad', 'pagad', 'situacion'] },
    { clave: 'fechaCobro', etiqueta: 'Fecha de cobro', detectar: ['cobro', 'fecha pago'] },
  ],
  banco: [
    { clave: 'fecha', etiqueta: 'Fecha', obligatorio: true, detectar: ['fecha', 'f. valor', 'date', 'valor'] },
    { clave: 'concepto', etiqueta: 'Concepto', obligatorio: true, detectar: ['concepto', 'descripcion', 'detalle', 'observaciones'] },
    { clave: 'importe', etiqueta: 'Importe', obligatorio: true, detectar: ['importe', 'cantidad', 'monto', 'amount'] },
  ],
  gastos: [
    { clave: 'fecha', etiqueta: 'Fecha', obligatorio: true, detectar: ['fecha', 'date'] },
    { clave: 'proveedor', etiqueta: 'Proveedor', detectar: ['proveedor', 'acreedor', 'emisor', 'nombre'] },
    { clave: 'concepto', etiqueta: 'Concepto', obligatorio: true, detectar: ['concepto', 'descripcion', 'detalle'] },
    { clave: 'base', etiqueta: 'Base imponible', obligatorio: true, detectar: ['base', 'imponible', 'neto'] },
    { clave: 'ivaPct', etiqueta: '% IVA', detectar: ['% iva', 'iva %', 'iva'] },
  ],
};

const Importar: React.FC = () => {
  useAppData();
  const [tipo, setTipo] = useState<TipoImport>('facturas');
  const [hojas, setHojas] = useState<HojaExcel[]>([]);
  const [hojaIdx, setHojaIdx] = useState(0);
  const [mapeo, setMapeo] = useState<Record<string, number>>({});
  const [tipoMov, setTipoMov] = useState<TipoMovimiento>('cuenta');
  const [cuenta, setCuenta] = useState('');
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nombreFichero, setNombreFichero] = useState('');

  const hoja = hojas[hojaIdx];
  const campos = CAMPOS[tipo];

  const autoMapear = (h: HojaExcel, t: TipoImport) => {
    const m: Record<string, number> = {};
    for (const campo of CAMPOS[t]) {
      const idx = detectarColumna(h.cabeceras, campo.detectar);
      if (idx !== -1) m[campo.clave] = idx;
    }
    return m;
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResultado(null);
    try {
      const hs = await leerExcel(file);
      if (hs.length === 0 || hs.every((h) => h.filas.length === 0)) {
        setError('El fichero no contiene datos legibles.');
        return;
      }
      setNombreFichero(file.name);
      setHojas(hs);
      const idx = hs.findIndex((h) => h.filas.length > 0);
      setHojaIdx(idx === -1 ? 0 : idx);
      setMapeo(autoMapear(hs[idx === -1 ? 0 : idx], tipo));
    } catch (err) {
      setError('No se pudo leer el fichero. Asegúrate de que es un Excel (.xlsx, .xls) o CSV válido.');
    }
    e.target.value = '';
  };

  const cambiarHoja = (idx: number) => {
    setHojaIdx(idx);
    setMapeo(autoMapear(hojas[idx], tipo));
  };

  const cambiarTipo = (t: TipoImport) => {
    setTipo(t);
    setResultado(null);
    if (hoja) setMapeo(autoMapear(hoja, t));
  };

  const faltanObligatorios = campos.filter((c) => c.obligatorio && mapeo[c.clave] === undefined);

  const celda = (fila: unknown[], clave: string): unknown =>
    mapeo[clave] !== undefined ? fila[mapeo[clave]] : undefined;

  const esCobrada = (v: unknown): boolean => {
    const s = String(v ?? '').toLowerCase();
    return s.includes('cobrad') || s.includes('pagad') || s === 'si' || s === 'sí' || s === 'x' || s === 'ok';
  };

  const importar = () => {
    if (!hoja || faltanObligatorios.length > 0) return;
    let importados = 0;
    let omitidos = 0;

    if (tipo === 'facturas') {
      const existentes = new Set(getState().facturas.map((f) => f.numero.trim().toLowerCase()));
      const nuevas: import('../types').Factura[] = [];
      for (const fila of hoja.filas) {
        const numero = String(celda(fila, 'numero') ?? '').trim();
        const fecha = parseFecha(celda(fila, 'fecha'));
        const clienteNombre = String(celda(fila, 'cliente') ?? '').trim();
        const base = parseImporte(celda(fila, 'base'));
        if (!numero || !fecha || !clienteNombre || !base) {
          omitidos++;
          continue;
        }
        if (existentes.has(numero.toLowerCase())) {
          omitidos++;
          continue;
        }
        existentes.add(numero.toLowerCase());
        const ivaPct = mapeo.ivaPct !== undefined ? normalizaPct(parseImporte(celda(fila, 'ivaPct'))) : 21;
        const irpfPct = mapeo.irpfPct !== undefined ? normalizaPct(parseImporte(celda(fila, 'irpfPct'))) : 0;
        const totalLeido = mapeo.total !== undefined ? parseImporte(celda(fila, 'total')) : 0;
        const total = totalLeido || Math.round((base + (base * ivaPct) / 100 - (base * irpfPct) / 100) * 100) / 100;
        const cobrada = mapeo.estado !== undefined && esCobrada(celda(fila, 'estado'));
        const fechaCobro = parseFecha(celda(fila, 'fechaCobro'));
        nuevas.push({
          id: uid(),
          numero,
          fecha,
          clienteId: ensureContacto(clienteNombre, 'cliente'),
          concepto: String(celda(fila, 'concepto') ?? '').trim(),
          base,
          ivaPct,
          irpfPct,
          total,
          estado: (cobrada || fechaCobro ? 'cobrada' : 'emitida') as 'cobrada' | 'emitida',
          fechaCobro: cobrada || fechaCobro ? fechaCobro || fecha : undefined,
        });
        importados++;
      }
      setState((p) => ({ ...p, facturas: [...p.facturas, ...nuevas] }));
    } else if (tipo === 'banco') {
      const clave = (f: { fecha: string; importe: number; concepto: string }) =>
        `${f.fecha}|${f.importe.toFixed(2)}|${f.concepto.toLowerCase().slice(0, 40)}`;
      const existentes = new Set(getState().movimientos.map((m) => clave(m)));
      const nuevos: import('../types').MovimientoBancario[] = [];
      for (const fila of hoja.filas) {
        const fecha = parseFecha(celda(fila, 'fecha'));
        const concepto = String(celda(fila, 'concepto') ?? '').trim();
        const importe = parseImporte(celda(fila, 'importe'));
        if (!fecha || !concepto || importe === 0) {
          omitidos++;
          continue;
        }
        const mov = { fecha, concepto, importe };
        if (existentes.has(clave(mov))) {
          omitidos++;
          continue;
        }
        existentes.add(clave(mov));
        nuevos.push({ id: uid(), ...mov, tipo: tipoMov, cuenta: cuenta || undefined });
        importados++;
      }
      setState((p) => ({ ...p, movimientos: [...p.movimientos, ...nuevos] }));
    } else {
      const nuevos: import('../types').Gasto[] = [];
      for (const fila of hoja.filas) {
        const fecha = parseFecha(celda(fila, 'fecha'));
        const concepto = String(celda(fila, 'concepto') ?? '').trim();
        const base = parseImporte(celda(fila, 'base'));
        if (!fecha || !concepto || !base) {
          omitidos++;
          continue;
        }
        const ivaPct = mapeo.ivaPct !== undefined ? normalizaPct(parseImporte(celda(fila, 'ivaPct'))) : 21;
        const proveedor = String(celda(fila, 'proveedor') ?? '').trim();
        nuevos.push({
          id: uid(),
          fecha,
          contactoId: proveedor ? ensureContacto(proveedor, 'proveedor') : undefined,
          concepto,
          categoria: 'Otros' as const,
          base,
          ivaPct,
          total: Math.round((base + (base * ivaPct) / 100) * 100) / 100,
          estado: 'pagado' as const,
          fechaPago: fecha,
        });
        importados++;
      }
      setState((p) => ({ ...p, gastos: [...p.gastos, ...nuevos] }));
    }

    setResultado(
      `Importados ${importados} registros de "${nombreFichero}". ${
        omitidos > 0 ? `${omitidos} filas omitidas (vacías, incompletas o duplicadas).` : ''
      }`
    );
    setHojas([]);
  };

  /** Si el IVA viene como 0,21 lo pasa a 21. */
  function normalizaPct(v: number): number {
    return v > 0 && v < 1 ? v * 100 : v;
  }

  const preview = useMemo(() => (hoja ? hoja.filas.slice(0, 5) : []), [hoja]);

  return (
    <div>
      <PageTitle
        title="Importar Excel"
        subtitle="Sube tu hoja de facturas o los extractos del banco; la app detecta las columnas automáticamente"
      />

      {resultado && (
        <Card className="p-4 mb-4 bg-green-50 border-green-200 text-green-800 text-sm">✓ {resultado}</Card>
      )}
      {error && <Card className="p-4 mb-4 bg-red-50 border-red-200 text-red-700 text-sm">{error}</Card>}

      <Card className="p-5 mb-4">
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <Field label="1 · ¿Qué quieres importar?">
            <select className={inputCls} value={tipo} onChange={(e) => cambiarTipo(e.target.value as TipoImport)}>
              <option value="facturas">Facturas emitidas (mi hoja de facturación)</option>
              <option value="banco">Movimientos bancarios (cuenta, tarjeta, transferencias)</option>
              <option value="gastos">Gastos / facturas recibidas</option>
            </select>
          </Field>
          <Field label="2 · Fichero Excel o CSV" className="md:col-span-2">
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.ods"
              onChange={onFile}
              className="block w-full text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-teal-600 file:text-white file:text-sm file:font-medium hover:file:bg-teal-700 file:cursor-pointer"
            />
          </Field>
        </div>

        {tipo === 'banco' && (
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <Field label="Tipo de movimiento de este fichero">
              <select className={inputCls} value={tipoMov} onChange={(e) => setTipoMov(e.target.value as TipoMovimiento)}>
                {Object.entries(TIPOS_MOVIMIENTO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nombre de la cuenta / tarjeta (opcional)">
              <input className={inputCls} value={cuenta} onChange={(e) => setCuenta(e.target.value)} placeholder="p. ej. BBVA ...1234" />
            </Field>
          </div>
        )}
      </Card>

      {hoja && (
        <>
          <Card className="p-5 mb-4">
            <h3 className="font-semibold text-gray-800 mb-3">3 · Comprueba el mapeo de columnas</h3>
            {hojas.length > 1 && (
              <Field label="Hoja del Excel" className="max-w-xs mb-3">
                <select className={inputCls} value={hojaIdx} onChange={(e) => cambiarHoja(parseInt(e.target.value, 10))}>
                  {hojas.map((h, i) => (
                    <option key={i} value={i}>
                      {h.nombre} ({h.filas.length} filas)
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {campos.map((c) => (
                <Field key={c.clave} label={`${c.etiqueta}${c.obligatorio ? ' *' : ''}`}>
                  <select
                    className={inputCls}
                    value={mapeo[c.clave] ?? -1}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      const m = { ...mapeo };
                      if (v === -1) delete m[c.clave];
                      else m[c.clave] = v;
                      setMapeo(m);
                    }}
                  >
                    <option value={-1}>— No importar —</option>
                    {hoja.cabeceras.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `(columna ${i + 1})`}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            {faltanObligatorios.length > 0 && (
              <p className="text-sm text-red-600 mt-3">
                Faltan campos obligatorios: {faltanObligatorios.map((c) => c.etiqueta).join(', ')}
              </p>
            )}
          </Card>

          <Card className="mb-4">
            <div className="px-4 pt-4">
              <h3 className="font-semibold text-gray-800 mb-2">
                Vista previa ({hoja.filas.length} filas en total)
              </h3>
            </div>
            {preview.length === 0 ? (
              <Empty>La hoja está vacía.</Empty>
            ) : (
              <Table headers={campos.filter((c) => mapeo[c.clave] !== undefined).map((c) => c.etiqueta)}>
                {preview.map((fila, i) => (
                  <tr key={i}>
                    {campos
                      .filter((c) => mapeo[c.clave] !== undefined)
                      .map((c) => {
                        const v = fila[mapeo[c.clave]];
                        let texto: string;
                        if (c.clave.startsWith('fecha')) texto = parseFecha(v) || String(v ?? '');
                        else if (['base', 'total', 'importe'].includes(c.clave)) texto = fmtEur(parseImporte(v));
                        else texto = String(v ?? '');
                        return (
                          <td key={c.clave} className="px-3 py-2 text-gray-600 max-w-[200px] truncate">
                            {texto}
                          </td>
                        );
                      })}
                  </tr>
                ))}
              </Table>
            )}
          </Card>

          <div className="flex justify-end">
            <Btn onClick={importar} disabled={faltanObligatorios.length > 0 || hoja.filas.length === 0}>
              Importar {hoja.filas.length} filas
            </Btn>
          </div>
        </>
      )}

      <Card className="p-5 mt-6 bg-blue-50 border-blue-200 text-sm text-blue-900">
        <h4 className="font-semibold mb-1">Consejos</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Los duplicados se omiten automáticamente: puedes re-importar el mismo fichero sin miedo.</li>
          <li>En facturas, si hay columna de estado o fecha de cobro, se marcan como cobradas solas.</li>
          <li>Importa cada extracto (cuenta, tarjeta, transferencias) eligiendo su tipo; luego concílialos en «Banco».</li>
          <li>Acepta importes en formato español (1.234,56 €) y fechas dd/mm/aaaa o de Excel.</li>
        </ul>
      </Card>
    </div>
  );
};

export default Importar;
