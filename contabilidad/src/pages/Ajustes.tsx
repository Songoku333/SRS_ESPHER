import React, { useRef, useState } from 'react';
import { useAppData, replaceState } from '../lib/store';
import { EMPTY_DATA } from '../types';
import { getConfig, setConfig, normalizarUrlProyecto } from '../lib/supabase';
import { useSyncInfo, logout, recargarDesdeNube, subirTodoALaNube } from '../lib/sync';
import { Card, PageTitle, Btn, Field, inputCls } from '../components/ui';
import McpCard from '../components/McpCard';
import ConectoresCard from '../components/ConectoresCard';

const NubeCard: React.FC<{ onMsg: (m: string) => void }> = ({ onMsg }) => {
  const sync = useSyncInfo();
  const configurada = !!getConfig();
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const guardarConfig = () => {
    const u = normalizarUrlProyecto(url);
    if (!u) {
      onMsg(
        'Esa URL no parece la del proyecto. Copia la "Project URL" (https://xxxx.supabase.co) desde Supabase → Project Settings → API.'
      );
      return;
    }
    const clave = anonKey.trim();
    if (!clave.startsWith('eyJ') && !clave.startsWith('sb_publishable_')) {
      onMsg('Esa clave no parece la "anon public". Cópiala desde Project Settings → API (empieza por eyJ… o sb_publishable_…).');
      return;
    }
    setConfig({ url: u, anonKey: clave });
    location.reload();
  };

  const desvincular = () => {
    if (confirm('La app dejará de sincronizar y funcionará solo en este navegador. Los datos de la nube no se borran. ¿Continuar?')) {
      setConfig(null);
      location.reload();
    }
  };

  const estado: Record<string, string> = {
    sincronizado: '🟢 Sincronizado',
    guardando: '🟡 Guardando…',
    conectando: '🟡 Conectando…',
    error: `🔴 Error: ${sync.error || ''}`,
    sin_sesion: '🟡 Sin sesión iniciada',
    local: '⚪ Solo local',
  };

  if (!configurada) {
    return (
      <Card className="p-5 md:col-span-2">
        <h3 className="font-semibold text-gray-800 mb-2">☁️ Nube (Supabase)</h3>
        <p className="text-sm text-gray-500 mb-4">
          Conecta tu proyecto de Supabase para que los datos se guarden en la nube, con acceso desde
          cualquier dispositivo y protegidos con usuario y contraseña. Encontrarás la URL y la clave en
          Supabase → Project Settings → API. Antes, ejecuta el script <code>supabase/schema.sql</code> en el
          SQL Editor (instrucciones en el README).
        </p>
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <Field label="URL del proyecto">
            <input className={inputCls} placeholder="https://xxxx.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>
          <Field label="Clave anónima (anon public key)">
            <input className={inputCls} placeholder="eyJhbGciOi…" value={anonKey} onChange={(e) => setAnonKey(e.target.value)} />
          </Field>
        </div>
        <Btn onClick={guardarConfig} disabled={!url.trim() || !anonKey.trim()}>
          Conectar con la nube
        </Btn>
      </Card>
    );
  }

  return (
    <Card className="p-5 md:col-span-2">
      <h3 className="font-semibold text-gray-800 mb-2">☁️ Nube (Supabase)</h3>
      <p className="text-sm text-gray-600 mb-1">
        Estado: <strong>{estado[sync.status]}</strong>
        {sync.email && <span className="text-gray-400"> · sesión: {sync.email}</span>}
      </p>
      <p className="text-xs text-gray-400 mb-4">{getConfig()?.url}</p>
      <div className="flex gap-2 flex-wrap">
        <Btn
          variant="secondary"
          disabled={ocupado || sync.status !== 'sincronizado'}
          onClick={async () => {
            setOcupado(true);
            await recargarDesdeNube();
            setOcupado(false);
            onMsg('Datos recargados desde la nube.');
          }}
        >
          ⟳ Recargar desde la nube
        </Btn>
        <Btn
          variant="secondary"
          disabled={ocupado || (sync.status !== 'sincronizado' && sync.status !== 'error')}
          onClick={async () => {
            setOcupado(true);
            await subirTodoALaNube();
            setOcupado(false);
            onMsg('Todos los datos locales se han subido a la nube.');
          }}
        >
          ⬆ Forzar subida de todo
        </Btn>
        <Btn variant="secondary" onClick={() => logout()}>
          Cerrar sesión
        </Btn>
        <Btn variant="danger" onClick={desvincular}>
          Desvincular nube
        </Btn>
      </div>
    </Card>
  );
};

const Ajustes: React.FC = () => {
  const data = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const exportar = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `srs-contabilidad-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (!json || typeof json !== 'object' || !Array.isArray(json.facturas)) {
        setMsg('El fichero no parece una copia de seguridad válida.');
        return;
      }
      if (confirm('Esto sustituirá TODOS los datos actuales por los de la copia. ¿Continuar?')) {
        replaceState(json);
        setMsg('Copia restaurada correctamente.');
      }
    } catch {
      setMsg('No se pudo leer el fichero JSON.');
    }
    e.target.value = '';
  };

  const borrarTodo = () => {
    if (
      confirm('¿Seguro que quieres BORRAR TODOS los datos?') &&
      confirm('Esta acción no se puede deshacer. ¿Confirmas el borrado total?')
    ) {
      replaceState(EMPTY_DATA);
      setMsg('Datos borrados.');
    }
  };

  const conteos = [
    ['Contactos', data.contactos.length],
    ['Ofertas', data.ofertas.length],
    ['Proyectos', data.proyectos.length],
    ['Facturas', data.facturas.length],
    ['Gastos', data.gastos.length],
    ['Movimientos bancarios', data.movimientos.length],
    ['Liquidaciones', data.liquidaciones.length],
    ['Tareas de trabajos', data.tareas.length],
  ] as const;

  return (
    <div>
      <PageTitle title="Ajustes" subtitle="Copias de seguridad y datos" />

      {msg && <Card className="p-4 mb-4 bg-blue-50 border-blue-200 text-blue-800 text-sm">{msg}</Card>}

      <div className="grid md:grid-cols-2 gap-4">
        <NubeCard onMsg={setMsg} />
        <McpCard />
        <ConectoresCard />
        <Card className="p-5">
          <h3 className="font-semibold text-gray-800 mb-2">Copia de seguridad</h3>
          <p className="text-sm text-gray-500 mb-4">
            Los datos viven en este navegador. Descarga una copia con regularidad y guárdala en un lugar
            seguro; puedes restaurarla en cualquier momento o llevarla a otro ordenador.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Btn onClick={exportar}>⬇ Descargar copia (JSON)</Btn>
            <Btn variant="secondary" onClick={() => fileRef.current?.click()}>
              ⬆ Restaurar copia
            </Btn>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={importar} />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-gray-800 mb-2">Datos almacenados</h3>
          <ul className="text-sm text-gray-600 space-y-1 mb-4">
            {conteos.map(([n, c]) => (
              <li key={n} className="flex justify-between border-b border-gray-100 pb-1">
                <span>{n}</span>
                <span className="font-medium">{c}</span>
              </li>
            ))}
          </ul>
          <Btn variant="danger" onClick={borrarTodo}>
            Borrar todos los datos
          </Btn>
        </Card>
      </div>
    </div>
  );
};

export default Ajustes;
