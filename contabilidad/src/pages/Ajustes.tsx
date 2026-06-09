import React, { useRef, useState } from 'react';
import { useAppData, replaceState } from '../lib/store';
import { EMPTY_DATA } from '../types';
import { Card, PageTitle, Btn } from '../components/ui';

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
  ] as const;

  return (
    <div>
      <PageTitle title="Ajustes" subtitle="Copias de seguridad y datos" />

      {msg && <Card className="p-4 mb-4 bg-blue-50 border-blue-200 text-blue-800 text-sm">{msg}</Card>}

      <div className="grid md:grid-cols-2 gap-4">
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
