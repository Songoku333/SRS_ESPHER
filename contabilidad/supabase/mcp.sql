-- ============================================================
-- SRS Gestión · Claves personales para el servidor MCP
-- Ejecutar en SQL Editor. Es seguro ejecutarlo varias veces.
-- Requiere haber aplicado antes schema-multiusuario.sql.
-- ============================================================

create table if not exists public.mcp_tokens (
  token_hash text primary key,
  email text not null,
  nombre text,
  created_at timestamptz not null default now()
);

alter table public.mcp_tokens enable row level security;

-- Cada usuario gestiona sus propias claves; Dirección las ve todas
drop policy if exists "mcp_tokens_acceso" on public.mcp_tokens;
create policy "mcp_tokens_acceso" on public.mcp_tokens for all
  using (public.es_direccion() or email = public.mi_email())
  with check (public.es_direccion() or email = public.mi_email());
