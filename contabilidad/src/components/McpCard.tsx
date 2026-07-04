import React, { useEffect, useState } from 'react';
import { getClient, getConfig } from '../lib/supabase';
import { useAcceso } from '../lib/acceso';
import { Card, Btn, Empty } from './ui';

interface FilaToken {
  token_hash: string;
  email: string;
  nombre: string | null;
  created_at: string;
}

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generarToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return 'srs_' + [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const McpCard: React.FC = () => {
  const acceso = useAcceso();
  const [tokens, setTokens] = useState<FilaToken[] | null>(null);
  const [nuevo, setNuevo] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const cfg = getConfig();
  const urlMcp = cfg ? `${cfg.url}/functions/v1/mcp` : '';

  const cargar = async () => {
    const client = getClient();
    if (!client) return;
    const { data, error } = await client.from('mcp_tokens').select('*').order('created_at', { ascending: false });
    if (!error) setTokens(data as FilaToken[]);
    else setTokens(null);
  };

  useEffect(() => {
    if (acceso.multiusuarioActivo) void cargar();
  }, [acceso.multiusuarioActivo]);

  if (!acceso.multiusuarioActivo || !cfg) return null;

  const generar = async () => {
    const client = getClient();
    if (!client) return;
    const token = generarToken();
    const token_hash = await sha256hex(token);
    const { error } = await client.from('mcp_tokens').insert({
      token_hash,
      email: acceso.email,
      nombre: `Clave de ${acceso.miembro?.nombre || acceso.email}`,
    });
    if (error) {
      setMsg(
        error.message.includes('does not exist')
          ? 'Falta activar el MCP: ejecuta supabase/mcp.sql en el SQL Editor y despliega la función "mcp".'
          : 'No se pudo crear la clave: ' + error.message
      );
      return;
    }
    setNuevo(token);
    setMsg(null);
    void cargar();
  };

  const revocar = async (t: FilaToken) => {
    if (!confirm('¿Revocar esta clave? Los asistentes que la usen dejarán de tener acceso.')) return;
    const client = getClient();
    if (!client) return;
    await client.from('mcp_tokens').delete().eq('token_hash', t.token_hash);
    void cargar();
  };

  const configClaude = nuevo
    ? JSON.stringify(
        {
          mcpServers: {
            'srs-gestion': {
              command: 'npx',
              args: ['-y', 'mcp-remote', urlMcp, '--header', `Authorization: Bearer ${nuevo}`],
            },
          },
        },
        null,
        2
      )
    : '';

  return (
    <Card className="p-5 md:col-span-2">
      <h3 className="font-semibold text-gray-800 mb-1">🤖 Conectar tu IA (MCP)</h3>
      <p className="text-sm text-gray-500 mb-3">
        Genera una clave personal para consultar tu contabilidad desde Claude u otro asistente compatible con
        MCP. La clave respeta tu rol: cada persona solo puede consultar lo que ve en la app.
      </p>

      {msg && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{msg}</div>}

      {nuevo && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-3 text-sm">
          <p className="font-semibold text-teal-900 mb-1">Tu clave (cópiala ahora: no volverá a mostrarse)</p>
          <code className="block bg-white border border-teal-200 rounded px-2 py-1 text-xs break-all select-all">{nuevo}</code>
          <p className="text-teal-900 mt-2 mb-1">Dirección del servidor:</p>
          <code className="block bg-white border border-teal-200 rounded px-2 py-1 text-xs break-all select-all">{urlMcp}</code>
          <p className="text-teal-900 mt-2 mb-1">Configuración para Claude Desktop (Ajustes → Desarrollador → Editar configuración):</p>
          <pre className="bg-white border border-teal-200 rounded px-2 py-1 text-xs overflow-x-auto select-all">{configClaude}</pre>
        </div>
      )}

      <div className="flex gap-2 flex-wrap mb-3">
        <Btn onClick={generar}>+ Generar clave</Btn>
      </div>

      {tokens === null ? null : tokens.length === 0 ? (
        <Empty>Sin claves activas.</Empty>
      ) : (
        <ul className="text-sm divide-y divide-gray-100">
          {tokens.map((t) => (
            <li key={t.token_hash} className="flex items-center justify-between py-2">
              <span className="text-gray-700">
                {t.nombre || 'Clave'} <span className="text-gray-400 text-xs">· {t.email} · {t.created_at.slice(0, 10)}</span>
              </span>
              <Btn variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => revocar(t)}>
                Revocar
              </Btn>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default McpCard;
