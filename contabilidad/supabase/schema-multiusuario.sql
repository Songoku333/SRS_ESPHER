-- ============================================================
-- SRS Gestión · Multiusuario con roles y permisos (Supabase)
--
-- ⚠️  APLICAR CON CUIDADO Y CON COPIA DE SEGURIDAD PREVIA:
--    1) En la app: Ajustes → Descargar copia (JSON).
--    2) Ejecutar este script en SQL Editor → New query → Run.
--    3) Insertar tu propio usuario como Dirección (último bloque).
--
-- Convierte los datos (hasta ahora privados por usuario) en datos COMPARTIDOS
-- de la empresa, y aplica reglas de acceso por rol en el propio servidor:
--   · Dirección: acceso total.
--   · Gestión: solo clientes y proyectos asignados; sin banco ni globales.
--   · Colaborador: solo sus proyectos y sus liquidaciones.
-- Es seguro ejecutarlo varias veces.
-- ============================================================

-- 1) Tabla de miembros del equipo --------------------------------------------
create table if not exists public.miembros (
  email text primary key,
  nombre text,
  rol text not null check (rol in ('direccion','gestion','colaborador')),
  contacto_id text,
  activo boolean not null default true,
  clientes_asignados jsonb not null default '[]'::jsonb,
  proyectos_asignados jsonb not null default '[]'::jsonb,
  secciones jsonb,
  updated_at timestamptz not null default now()
);
alter table public.miembros enable row level security;

-- 2) Funciones de ayuda -------------------------------------------------------
create or replace function public.mi_email() returns text
  language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.mi_rol() returns text
  language sql stable security definer set search_path = public as $$
  select rol from public.miembros where email = public.mi_email() and activo $$;

create or replace function public.mi_contacto() returns text
  language sql stable security definer set search_path = public as $$
  select contacto_id from public.miembros where email = public.mi_email() and activo $$;

-- Dirección, o bootstrap: si aún no hay ningún miembro, el usuario es Dirección.
create or replace function public.es_direccion() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(public.mi_rol() = 'direccion', false)
      or not exists (select 1 from public.miembros) $$;

create or replace function public.cliente_visible(cli text) returns boolean
  language sql stable security definer set search_path = public as $$
  select case
    when public.es_direccion() then true
    when public.mi_rol() = 'gestion' then exists (
      select 1 from public.miembros m where m.email = public.mi_email() and (m.clientes_asignados ? cli))
    else false end $$;

create or replace function public.proyecto_visible(proy text) returns boolean
  language sql stable security definer set search_path = public as $$
  select case
    when proy is null then false
    when public.es_direccion() then true
    when public.mi_rol() = 'gestion' then exists (
      select 1 from public.miembros m where m.email = public.mi_email() and (
        (m.proyectos_asignados ? proy)
        or exists (select 1 from public.proyectos p where p.id = proy and (m.clientes_asignados ? (p.data->>'clienteId')))))
    when public.mi_rol() = 'colaborador' then exists (
      select 1 from public.proyectos p where p.id = proy and (
        (p.data->>'comercialId') = public.mi_contacto()
        or (p.data->'repartos') @> jsonb_build_array(jsonb_build_object('contactoId', public.mi_contacto()))))
    else false end $$;

-- 3) RLS de la tabla de miembros ---------------------------------------------
drop policy if exists "miembros_select" on public.miembros;
create policy "miembros_select" on public.miembros for select
  using (public.es_direccion() or email = public.mi_email());
drop policy if exists "miembros_admin" on public.miembros;
create policy "miembros_admin" on public.miembros for all
  using (public.es_direccion()) with check (public.es_direccion());

-- 4) Datos compartidos: clave primaria por id (eran privados por usuario) -----
-- (Solo hay datos de un usuario, así que el id ya es único.)
do $$
declare t text; pk text;
begin
  foreach t in array array['contactos','ofertas','proyectos','facturas','gastos','movimientos','liquidaciones']
  loop
    -- 4.1) Eliminar la clave primaria compuesta actual (sea cual sea su nombre)
    select conname into pk from pg_constraint
      where conrelid = ('public.' || t)::regclass and contype = 'p';
    if pk is not null then
      execute format('alter table public.%I drop constraint %I', t, pk);
    end if;
    -- 4.2) Ahora ya se puede quitar el NOT NULL de user_id
    execute format('alter table public.%I alter column user_id drop not null', t);
    -- 4.3) Nueva clave primaria por id (ignora si ya existe)
    begin
      execute format('alter table public.%I add primary key (id)', t);
    exception when others then null;
    end;
  end loop;
end $$;

-- 5) Políticas de acceso por rol sobre cada tabla de datos --------------------
drop policy if exists "propietario" on public.contactos;
drop policy if exists "acceso" on public.contactos;
create policy "acceso" on public.contactos for all using (
  public.es_direccion()
  or id = public.mi_contacto()
  or (public.mi_rol() = 'gestion' and (
       exists (select 1 from public.miembros m where m.email = public.mi_email() and (m.clientes_asignados ? id))
       or exists (select 1 from public.proyectos p where public.proyecto_visible(p.id) and (
            (p.data->>'comercialId') = id
            or (p.data->'repartos') @> jsonb_build_array(jsonb_build_object('contactoId', id))))
       or exists (select 1 from public.gastos g where (g.data->>'contactoId') = id and public.proyecto_visible(g.data->>'proyectoId'))))
) with check (public.es_direccion() or public.mi_rol() = 'gestion');

drop policy if exists "propietario" on public.ofertas;
drop policy if exists "acceso" on public.ofertas;
create policy "acceso" on public.ofertas for all
  using (public.es_direccion() or (public.mi_rol() = 'gestion' and public.cliente_visible(data->>'clienteId')))
  with check (public.es_direccion() or (public.mi_rol() = 'gestion' and public.cliente_visible(data->>'clienteId')));

drop policy if exists "propietario" on public.proyectos;
drop policy if exists "acceso" on public.proyectos;
create policy "acceso" on public.proyectos for all
  using (public.es_direccion() or public.proyecto_visible(id))
  with check (public.es_direccion() or (public.mi_rol() = 'gestion' and public.proyecto_visible(id)));

drop policy if exists "propietario" on public.facturas;
drop policy if exists "acceso" on public.facturas;
create policy "acceso" on public.facturas for all
  using (public.es_direccion()
      or public.cliente_visible(data->>'clienteId')
      or public.proyecto_visible(data->>'proyectoId'))
  with check (public.es_direccion()
      or (public.mi_rol() = 'gestion' and (public.cliente_visible(data->>'clienteId') or public.proyecto_visible(data->>'proyectoId'))));

drop policy if exists "propietario" on public.gastos;
drop policy if exists "acceso" on public.gastos;
create policy "acceso" on public.gastos for all
  using (public.es_direccion() or (public.mi_rol() = 'gestion' and public.proyecto_visible(data->>'proyectoId')))
  with check (public.es_direccion() or (public.mi_rol() = 'gestion' and public.proyecto_visible(data->>'proyectoId')));

drop policy if exists "propietario" on public.movimientos;
drop policy if exists "acceso" on public.movimientos;
create policy "acceso" on public.movimientos for all
  using (public.es_direccion()) with check (public.es_direccion());

drop policy if exists "propietario" on public.liquidaciones;
drop policy if exists "acceso" on public.liquidaciones;
create policy "acceso" on public.liquidaciones for all
  using (public.es_direccion()
      or (public.mi_rol() = 'gestion' and public.proyecto_visible(data->>'proyectoId'))
      or (public.mi_rol() = 'colaborador' and (data->>'contactoId') = public.mi_contacto()))
  with check (public.es_direccion()
      or (public.mi_rol() = 'gestion' and public.proyecto_visible(data->>'proyectoId')));

-- 6) Tu alta como Dirección.
-- No hace falta hacer nada manual: al entrar en la app por primera vez con el
-- multiusuario activo, tu usuario queda registrado automáticamente como Dirección.
-- (Opcional) Si prefieres dejarlo hecho desde aquí, descomenta y pon tu email:
-- insert into public.miembros (email, nombre, rol, activo)
-- values ('fgonzalo@smartremsolutions.com', 'Félix Gonzalo Alonso', 'direccion', true)
-- on conflict (email) do update set rol = 'direccion', activo = true;
