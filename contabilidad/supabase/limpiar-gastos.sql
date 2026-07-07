-- ============================================================
-- SRS Gestión · Limpieza de la primera importación de GASTOS
-- Ejecutar UNA vez en el SQL Editor antes de reimportar los gastos
-- con la función de ingesta mejorada (proveedor real, categoría por
-- "Tipo gasto", enlace a la factura SRS asociada).
--
-- Es idempotente y NO toca facturas ni movimientos bancarios.
-- ============================================================

-- 1) Borra todos los gastos (se reimportarán limpios desde SharePoint).
--    Si ya habías creado gastos a mano que quieras conservar, avísame y
--    hacemos un borrado selectivo en su lugar.
delete from public.gastos;

-- 2) Borra los contactos "basura" creados como proveedor cuyo nombre es en
--    realidad una referencia de factura (p. ej. "FA-009-603", "2025/338",
--    "2026/16"): tipo proveedor, no referenciados por ninguna factura y con
--    pinta de código (sin apenas letras).
delete from public.contactos c
where c.data->>'tipo' = 'proveedor'
  and not exists (
    select 1 from public.facturas f where f.data->>'clienteId' = c.data->>'id'
  )
  -- nombre con 2 o menos letras seguidas → parece un código, no un nombre
  and coalesce(c.data->>'nombre','') !~ '[A-Za-zÀ-ÿ]{3,}';

-- 3) Desregistra los ficheros de la carpeta de gastos para que la próxima
--    ejecución de la ingesta los vuelva a procesar (con la lógica nueva).
delete from public.ingesta_ficheros
where carpeta ilike '%gastos%';
