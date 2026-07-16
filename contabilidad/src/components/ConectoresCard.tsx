import React, { useState } from 'react';
import { getEasyEsgConfig, setEasyEsgConfig, probarConexion } from '../lib/easyesg';
import { Card, Btn, Field, inputCls } from './ui';

/** Ajustes → Conectores: integraciones con plataformas externas.
 *  El primero es EasyESG.pro (activos y KPIs de sostenibilidad); el patrón
 *  queda listo para los siguientes (Autodesk/Revit vía APS, etc.). */
const ConectoresCard: React.FC = () => {
  const guardada = getEasyEsgConfig();
  const [url, setUrl] = useState(guardada?.url || 'https://www.easyesg.pro');
  const [apiKey, setApiKey] = useState(guardada?.apiKey || '');
  const [msg, setMsg] = useState('');
  const [probando, setProbando] = useState(false);

  const guardar = () => {
    if (!url.trim() || !apiKey.trim()) {
      setEasyEsgConfig(null);
      setMsg('Conector desactivado.');
      return;
    }
    setEasyEsgConfig({ url: url.trim(), apiKey: apiKey.trim() });
    setMsg('Guardado. Prueba la conexión para verificarlo.');
  };

  const probar = async () => {
    guardar();
    setProbando(true);
    try {
      const n = await probarConexion();
      setMsg(`✅ Conectado: ${n} activo${n === 1 ? '' : 's'} disponibles en EasyESG.pro.`);
    } catch (e) {
      setMsg(`❌ ${(e as Error).message}`);
    } finally {
      setProbando(false);
    }
  };

  return (
    <Card className="p-5">
      <h3 className="font-semibold text-gray-800 mb-2">🔌 Conectores</h3>
      <p className="text-sm text-gray-500 mb-3">
        Integraciones con las plataformas de trabajo. <b>EasyESG.pro</b> vincula cada proyecto con su
        activo para ver consumos, CO₂ y calidad de aire en Trabajos (la especificación de la API está
        en <code className="text-xs">docs/CONECTORES.md</code> del repositorio).
      </p>
      <div className="space-y-3">
        <Field label="EasyESG.pro · URL de la plataforma">
          <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.easyesg.pro" />
        </Field>
        <Field label="EasyESG.pro · Clave de API">
          <input className={inputCls} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Pega aquí la API key" />
        </Field>
        <div className="flex gap-2">
          <Btn onClick={guardar}>Guardar</Btn>
          <Btn variant="secondary" onClick={probar} disabled={probando}>
            {probando ? 'Probando…' : 'Probar conexión'}
          </Btn>
        </div>
        {msg && <p className="text-sm text-gray-600">{msg}</p>}
        <p className="text-xs text-gray-400">
          Próximos conectores: Autodesk (Revit/BIM 360 vía Autodesk Platform Services) para publicar
          entregables y leer modelos desde los proyectos de ingeniería.
        </p>
      </div>
    </Card>
  );
};

export default ConectoresCard;
