import React, { useState } from 'react';
import { login } from '../lib/sync';
import { setConfig } from '../lib/supabase';
import { Btn, Field, inputCls } from '../components/ui';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const err = await login(email, password);
    if (err) {
      setError(err);
      setCargando(false);
    }
    // Si no hay error, onAuthStateChange conecta y App deja de mostrar esta pantalla
  };

  const quitarNube = () => {
    if (
      confirm(
        'Esto desvincula la nube en este navegador y la app pasará a funcionar solo en local. ¿Continuar?'
      )
    ) {
      setConfig(null);
      location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-gray-900">SRS Gestión</div>
          <div className="text-sm text-gray-500 mt-1">Contabilidad de ingeniería</div>
        </div>
        <form onSubmit={entrar} className="space-y-4">
          <Field label="Email">
            <input
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </Field>
          <Field label="Contraseña">
            <input
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Btn type="submit" className="w-full py-2" disabled={cargando || !email || !password}>
            {cargando ? 'Entrando…' : 'Entrar'}
          </Btn>
        </form>
        <p className="text-xs text-gray-400 mt-6 text-center">
          Los usuarios se crean en Supabase → Authentication → Users.
        </p>
        <button onClick={quitarNube} className="block mx-auto mt-3 text-xs text-gray-400 hover:text-gray-600 underline">
          Usar solo en este equipo (desvincular nube)
        </button>
      </div>
    </div>
  );
};

export default Login;
