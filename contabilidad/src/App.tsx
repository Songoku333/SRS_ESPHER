import React, { useEffect, useState } from 'react';
import { Page } from './types';
import { initSync, useSyncInfo, SyncStatus } from './lib/sync';
import { useAcceso } from './lib/acceso';
import { ROLES } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Ofertas from './pages/Ofertas';
import Trabajos from './pages/Trabajos';
import Proyectos from './pages/Proyectos';
import Facturas from './pages/Facturas';
import Gastos from './pages/Gastos';
import Banco from './pages/Banco';
import Liquidaciones from './pages/Liquidaciones';
import Rentabilidad from './pages/Rentabilidad';
import Contactos from './pages/Contactos';
import Importar from './pages/Importar';
import Usuarios from './pages/Usuarios';
import Ajustes from './pages/Ajustes';

const NAV: { page: Page; label: string; icon: string }[] = [
  { page: 'dashboard', label: 'Panel', icon: '📊' },
  { page: 'ofertas', label: 'Ofertas', icon: '📝' },
  { page: 'proyectos', label: 'Proyectos', icon: '🏗️' },
  { page: 'trabajos', label: 'Trabajos', icon: '🛠️' },
  { page: 'facturas', label: 'Facturas', icon: '🧾' },
  { page: 'gastos', label: 'Gastos', icon: '💳' },
  { page: 'banco', label: 'Banco', icon: '🏦' },
  { page: 'liquidaciones', label: 'Liquidaciones', icon: '🤝' },
  { page: 'rentabilidad', label: 'Rentabilidad', icon: '📈' },
  { page: 'contactos', label: 'Contactos', icon: '👥' },
  { page: 'importar', label: 'Importar Excel', icon: '⬆️' },
  { page: 'usuarios', label: 'Usuarios', icon: '🔑' },
  { page: 'ajustes', label: 'Ajustes', icon: '⚙️' },
];

const SYNC_LABEL: Record<SyncStatus, { texto: string; color: string }> = {
  local: { texto: '● Solo en este navegador', color: 'text-slate-400' },
  sin_sesion: { texto: '● Sin sesión', color: 'text-amber-400' },
  conectando: { texto: '● Conectando…', color: 'text-amber-400' },
  sincronizado: { texto: '● Sincronizado en la nube', color: 'text-green-400' },
  guardando: { texto: '● Guardando…', color: 'text-amber-400' },
  error: { texto: '● Error de sincronización', color: 'text-red-400' },
};

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const sync = useSyncInfo();
  const acceso = useAcceso();

  useEffect(() => {
    initSync();
  }, []);

  const navVisible = NAV.filter((item) => acceso.secciones.includes(item.page));

  // Si la sección actual no es visible para el usuario, ir a la primera permitida
  useEffect(() => {
    if (acceso.cargado && !acceso.secciones.includes(page) && acceso.secciones.length > 0) {
      setPage(acceso.secciones[0]);
    }
  }, [acceso, page]);

  const render = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard />;
      case 'ofertas':
        return <Ofertas />;
      case 'trabajos':
        return <Trabajos />;
      case 'proyectos':
        return <Proyectos />;
      case 'facturas':
        return <Facturas />;
      case 'gastos':
        return <Gastos />;
      case 'banco':
        return <Banco />;
      case 'liquidaciones':
        return <Liquidaciones />;
      case 'rentabilidad':
        return <Rentabilidad />;
      case 'contactos':
        return <Contactos />;
      case 'importar':
        return <Importar />;
      case 'usuarios':
        return <Usuarios />;
      case 'ajustes':
        return <Ajustes />;
    }
  };

  // Bloqueo de seguridad: no renderizar una sección no permitida
  if (acceso.cargado && !acceso.secciones.includes(page) && acceso.secciones.length > 0) {
    return null;
  }

  if (sync.status === 'sin_sesion') {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-60 bg-slate-900 text-white flex flex-col transform transition-transform md:transform-none ${
          menuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="px-5 py-5 border-b border-slate-700">
          <div className="text-lg font-bold tracking-tight">SRS Gestión</div>
          <div className="text-xs text-slate-400 mt-0.5">Contabilidad de ingeniería</div>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {navVisible.map((item) => (
            <button
              key={item.page}
              onClick={() => {
                setPage(item.page);
                setMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                page === item.page
                  ? 'bg-teal-600 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-5 py-3 text-[11px] border-t border-slate-700">
          <span className={SYNC_LABEL[sync.status].color} title={sync.error || ''}>
            {SYNC_LABEL[sync.status].texto}
          </span>
          {sync.email && (
            <div className="text-slate-500 mt-0.5">
              {sync.email}
              {acceso.cargado && acceso.multiusuarioActivo && (
                <span className="text-slate-400"> · {ROLES.find((r) => r.valor === acceso.rol)?.etiqueta}</span>
              )}
            </div>
          )}
          {sync.status === 'local' && (
            <div className="text-slate-500 mt-0.5">Activa la nube desde Ajustes.</div>
          )}
          {sync.error && <div className="text-red-400/80 mt-0.5">{sync.error}</div>}
        </div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setMenuOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="md:hidden sticky top-0 z-20 bg-slate-900 text-white px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMenuOpen(true)} className="text-xl">
            ☰
          </button>
          <span className="font-bold">SRS Gestión</span>
        </header>
        <main className="p-4 md:p-8 max-w-7xl mx-auto">{render()}</main>
      </div>
    </div>
  );
};

export default App;
