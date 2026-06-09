-- ============================================================
-- SRS Gestión · Esquema de base de datos para Supabase
-- Ejecuta este script completo en: SQL Editor → New query → Run
-- Es seguro ejecutarlo varias veces.
-- ============================================================

-- Cada tabla guarda los registros de la app como JSON, separados
-- por usuario (user_id). Solo el dueño puede ver y tocar sus filas.

create table if not exists public.contactos (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.ofertas (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.proyectos (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.facturas (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.gastos (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.movimientos (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.liquidaciones (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Seguridad a nivel de fila: cada usuario solo accede a lo suyo
do $$
declare t text;
begin
  foreach t in array array['contactos','ofertas','proyectos','facturas','gastos','movimientos','liquidaciones']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "propietario" on public.%I', t);
    execute format(
      'create policy "propietario" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t
    );
  end loop;
end $$;
