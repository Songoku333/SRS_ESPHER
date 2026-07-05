-- ============================================================
-- SRS Gestión · Registro de la ingesta automática de SharePoint
-- Ejecutar en SQL Editor. Es seguro ejecutarlo varias veces.
-- Requiere haber aplicado antes schema-multiusuario.sql.
-- ============================================================

create table if not exists public.ingesta_ficheros (
  id text primary key,              -- id del fichero en SharePoint (Graph)
  nombre text,
  carpeta text,
  etag text,                        -- versión del fichero (para no reprocesar)
  estado text,                      -- importado | pdf_pendiente | error | ignorado
  filas int not null default 0,
  mensaje text,
  procesado_at timestamptz not null default now()
);

alter table public.ingesta_ficheros enable row level security;

-- Solo Dirección consulta el registro (la función de ingesta escribe con service role)
drop policy if exists "ingesta_lectura" on public.ingesta_ficheros;
create policy "ingesta_lectura" on public.ingesta_ficheros for select
  using (public.es_direccion());
