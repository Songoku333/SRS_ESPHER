import React, { useState } from 'react';
import { getClient } from '../lib/supabase';
import { recargarDesdeNube } from '../lib/sync';
import { Card, Btn } from './ui';

interface ResultadoIngesta {
  ficherosProcesados?: number;
  pendientes?: number;
  importado?: { facturas?: number; movimientos?: number; gastos?: number; contactos?: number };
  detalle?: { fichero?: string; carpeta?: string; estado?: string; filas?: number; mensaje?: string; error?: string }[];
  error?: string;
}

/** Ajustes → lanzar a demanda la ingesta de SharePoint (libro de facturas,
 *  bancos y gastos) sin esperar a la sincronización automática horaria. */
const IngestaCard: React.FC = () => {
  const [corriendo, setCorriendo] = useState(false);
  const [progreso, setProgreso] = useState('');
  const [res, setRes] = useState<ResultadoIngesta | null>(null);
  const [error, setError] = useState('');

  /** La función procesa pocos ficheros por invocación (límite de recursos del
   *  worker): aquí se encadenan pasadas hasta que no quede nada pendiente. */
  const lanzar = async () => {
    const client = getClient();
    if (!client) {
      setError('Configura la nube (Supabase) en esta pantalla para poder lanzar la ingesta.');
      return;
    }
    setCorriendo(true);
    setError('');
    setRes(null);
    const total: Required<ResultadoIngesta> = {
      ficherosProcesados: 0,
      pendientes: 0,
      importado: { facturas: 0, movimientos: 0, gastos: 0, contactos: 0 },
      detalle: [],
      error: '',
    };
    try {
      for (let pasada = 1; pasada <= 20; pasada++) {
        setProgreso(pasada === 1 ? 'Sincronizando…' : `Pasada ${pasada} (quedan ficheros pendientes)…`);
        const { data, error: err } = await client.functions.invoke('ingesta', { body: {} });
        if (err) {
          const ctx = (err as { context?: Response }).context;
          let detalle = err.message || 'Error llamando a la función';
          if (ctx) {
            if (ctx.status === 404) detalle = 'La función "ingesta" no está desplegada en Supabase.';
            else {
              try {
                const cuerpo = await ctx.text();
                detalle = `HTTP ${ctx.status}: ${JSON.parse(cuerpo).error || cuerpo.slice(0, 300)}`;
              } catch { /* mensaje genérico */ }
            }
          }
          throw new Error(detalle);
        }
        if (data?.error) throw new Error(data.error);
        total.ficherosProcesados += data?.ficherosProcesados || 0;
        total.importado.facturas! += data?.importado?.facturas || 0;
        total.importado.movimientos! += data?.importado?.movimientos || 0;
        total.importado.gastos! += data?.importado?.gastos || 0;
        total.importado.contactos! += data?.importado?.contactos || 0;
        total.detalle.push(...(data?.detalle || []));
        total.pendientes = data?.pendientes || 0;
        setRes({ ...total });
        if (!total.pendientes) break;
      }
      // Trae a este navegador lo que la ingesta acabe de escribir en la nube
      await recargarDesdeNube();
    } catch (e) {
      setError((e as Error).message);
      if (total.ficherosProcesados > 0) setRes({ ...total });
    } finally {
      setCorriendo(false);
      setProgreso('');
    }
  };

  const imp = res?.importado;
  const conProblemas = (res?.detalle || []).filter((d) => d.estado === 'error' || d.error);

  return (
    <Card className="p-5">
      <h3 className="font-semibold text-gray-800 mb-2">📡 Ingesta de SharePoint</h3>
      <p className="text-sm text-gray-500 mb-3">
        Revisa ahora mismo el libro base de facturas, los extractos bancarios y los gastos de SharePoint,
        sin esperar a la sincronización automática de cada hora. Solo procesa los ficheros nuevos o
        modificados. Requiere rol Dirección y la función «ingesta» actualizada.
      </p>
      <Btn onClick={lanzar} disabled={corriendo}>
        {corriendo ? `⏳ ${progreso || 'Sincronizando…'}` : '🔄 Sincronizar ahora'}
      </Btn>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      {res && (
        <div className="text-sm text-gray-700 mt-3 space-y-1">
          <p>
            ✓ {res.ficherosProcesados ?? 0} fichero{(res.ficherosProcesados ?? 0) === 1 ? '' : 's'} nuevos o
            modificados · importadas <b>{imp?.facturas ?? 0}</b> facturas, <b>{imp?.movimientos ?? 0}</b>{' '}
            movimientos, <b>{imp?.gastos ?? 0}</b> gastos, <b>{imp?.contactos ?? 0}</b> contactos.
          </p>
          {(res.ficherosProcesados ?? 0) === 0 && (
            <p className="text-gray-500">No había nada nuevo desde la última pasada: todo al día.</p>
          )}
          {conProblemas.length > 0 && (
            <ul className="text-xs text-amber-700 list-disc pl-4">
              {conProblemas.slice(0, 5).map((d, i) => (
                <li key={i}>
                  {d.fichero || d.carpeta}: {d.mensaje || d.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
};

export default IngestaCard;
