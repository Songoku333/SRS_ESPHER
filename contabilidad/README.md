# SRS Gestión · Contabilidad de ingeniería

Aplicación sencilla para gestionar toda la actividad financiera de la ingeniería:
desde la emisión de ofertas hasta la facturación, la conciliación bancaria y la
liquidación del reparto con proveedores y colaboradores.

## Qué hace

- **Panel de control**: facturado, pendiente de cobro, gastos, resultado, IVA
  repercutido/soportado, ingresos por línea de servicio (MEP, legalizaciones,
  auditorías energéticas, modelado y simulación, consultoría para fondos, clima
  y sostenibilidad) y gráfico mensual de ingresos vs gastos.
- **Ofertas**: pipeline comercial (borrador → enviada → aceptada/rechazada) con
  conversión a proyecto en un clic.
- **Proyectos**: cada proyecto define sus reglas de liquidación (comercial y su %
  de comisión, % de gastos generales de empresa) y el **reparto del equipo**
  (hasta 6 colaboradores, por % o por horas).
- **Facturas**: importadas desde tu Excel de facturación o creadas a mano, con
  IVA/IRPF y total calculado. Se marcan cobradas a mano o al conciliar el banco.
  Desde cada factura sin proyecto puedes **generar un proyecto con estimación**:
  según el tipo de proyecto (línea de servicio) y el importe, propone el equipo y
  las horas de cada rol y los gastos típicos (visado, OCA, desplazamientos,
  licencias…), todo como borrador editable. Las cifras son orientativas (en España
  los honorarios están liberalizados desde la Ley Ómnibus 2009) y se ajustan luego.
- **Gastos**: facturas recibidas y gastos por categoría, imputables a proyecto.
- **Banco**: movimientos de cuenta, de tarjeta, transferencias emitidas y
  recibidas. **Conciliación automática**: cruza de una vez los movimientos sin
  conciliar con las facturas (entradas), gastos y liquidaciones (salidas) por
  importe y cercanía de fecha, y los marca cobrados/pagados. También conciliación
  guiada uno a uno, y convertir un movimiento de tarjeta o transferencia emitida
  en un gasto imputable a proyecto.
- **Liquidaciones**: muestra las facturas cobradas aún no liquidadas y, por cada
  una, la cascada completa: base imponible − gastos propios imputados (OCAs,
  visados, desplazamientos, subcontratación…) → − % comisión comercial − % gastos
  generales = base de reparto, repartida entre los colaboradores (por % o por
  horas, hasta 6). Cada beneficiario tiene su casilla de pagado, y la factura se
  marca como liquidada cuando todo está pagado y dado por bueno.
- **Rentabilidad**: beneficio neto por proyecto y global cruzando facturas,
  gastos imputados y liquidaciones. Por cada proyecto/factura muestra facturado,
  cobrado, costes, reparto, beneficio estimado, margen %, beneficio en caja y lo
  que queda pendiente de cobrar, pagar o liquidar. Filtrable por fechas.
- **Importar Excel**: sube tu hoja de facturas o los extractos bancarios
  (xlsx, xls, csv). Detecta las columnas automáticamente (puedes corregir el
  mapeo), acepta importes en formato español (1.234,56 €), fechas dd/mm/aaaa o
  de Excel, y omite duplicados (puedes re-importar el mismo fichero sin miedo).
- **Usuarios y accesos** (solo Dirección): equipo con tres niveles de acceso —
  Dirección general (todo), Gestión (solo clientes/proyectos asignados, sin
  resultados globales ni banco) y Colaborador (solo sus proyectos y sus
  liquidaciones). Permisos por sección editables por persona. La seguridad se
  aplica en el servidor (reglas RLS de Supabase, ver `supabase/schema-multiusuario.sql`),
  no solo en la interfaz.
- **Ajustes**: copia de seguridad completa (descarga/restauración en JSON).

## Dónde se guardan los datos

La app funciona en dos modos:

- **Solo local** (por defecto): los datos viven en el navegador (`localStorage`),
  nada sale de tu equipo.
- **Nube (Supabase)**: los datos se guardan en tu proyecto de Supabase,
  protegidos con usuario y contraseña, y se sincronizan automáticamente entre
  dispositivos. El navegador sigue guardando una copia local como caché.

En ambos modos puedes descargar copias de seguridad desde **Ajustes**.

## Activar la nube (Supabase) — unos 5 minutos

1. Crea una cuenta gratuita en [supabase.com](https://supabase.com) y un
   proyecto nuevo (elige región `eu-west` y guarda bien la contraseña de la
   base de datos, aunque la app no la necesita).
2. En el proyecto, abre **SQL Editor → New query**, pega el contenido completo
   de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**. Esto crea
   las tablas y la seguridad por usuario. Es seguro ejecutarlo varias veces.
3. En **Authentication → Users → Add user → Create new user**, crea tu usuario
   con email y contraseña (marca *Auto Confirm User*). Crea uno por cada
   persona que deba entrar; cada usuario ve solo sus propios datos, así que
   para compartir la contabilidad usad el mismo usuario.
4. En **Project Settings → API** copia la **Project URL** y la clave
   **anon public**.
5. Abre la app → **Ajustes → Nube (Supabase)**, pega URL y clave y pulsa
   **Conectar con la nube**. Inicia sesión con el usuario del paso 3.

La primera vez, los datos que ya tuvieras en el navegador **se suben y se
fusionan** con lo que haya en la nube (no se pierde nada). A partir de ahí,
cada cambio se guarda solo (verás el indicador «Sincronizado en la nube» abajo
a la izquierda) y al abrir la app en otro dispositivo aparece todo.

> Alternativa para no configurar nada en pantalla: define
> `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` al hacer `npm run build` y la
> app saldrá ya conectada de fábrica.

## Desarrollo

```bash
cd contabilidad
npm install
npm run dev       # desarrollo en http://localhost:5173
npm run build     # genera dist/ (estático, desplegable en cualquier hosting)
```

La app es 100 % estática (React + Vite + Tailwind empaquetado): el contenido de
`dist/` puede servirse desde GitHub Pages o cualquier hosting, también sin
conexión a internet.

## Conectar tu IA (servidor MCP)

La app incluye un servidor MCP para consultar la contabilidad desde Claude u
otro asistente compatible, **respetando los mismos roles** (cada persona solo
consulta lo que ve en la app). Herramientas: resumen financiero, facturas,
proyectos, gastos, liquidaciones pendientes con su desglose, búsqueda y
creación de gastos (solo Dirección/Gestión).

Activación (una vez):

1. Ejecuta [`supabase/mcp.sql`](supabase/mcp.sql) en el SQL Editor.
2. En Supabase → **Edge Functions** → *Deploy new function*: nombre `mcp`,
   pega el contenido de [`supabase/functions/mcp/index.ts`](supabase/functions/mcp/index.ts)
   y despliega. Importante: **desactiva "Verify JWT"** en la configuración de
   la función (la autenticación la hacen las claves personales).
3. En la app → **Ajustes → Conectar tu IA (MCP)** → *Generar clave*. Se muestra
   una sola vez, junto con la URL del servidor y la configuración lista para
   Claude Desktop (vía `mcp-remote` con cabecera `Authorization: Bearer …`).

Cada usuario genera su propia clave y puede revocarla cuando quiera.

## Ingesta automática desde SharePoint

La función `ingesta` revisa periódicamente tus carpetas de SharePoint e importa
sola los **Excel/CSV** nuevos o modificados (facturas, extractos bancarios y
gastos), con la misma detección de columnas y deduplicación que el importador
manual. Los **PDF** se registran como pendientes para procesarlos con Claude +
MCP (herramientas `crear_factura` / `crear_gasto`).

Activación:

1. Registra una app en Microsoft Entra ID con permiso de aplicación
   `Sites.Read.All` (con consentimiento de administrador) y un client secret.
2. Ejecuta [`supabase/ingesta.sql`](supabase/ingesta.sql) en el SQL Editor.
3. Despliega la Edge Function `ingesta` con
   [`supabase/functions/ingesta/index.ts`](supabase/functions/ingesta/index.ts)
   (desactiva "Verify JWT") y define los secrets: `MS_TENANT_ID`,
   `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `SP_SITE`
   (p. ej. `miempresa.sharepoint.com:/sites/CEO`), `SP_BIBLIOTECA` (opcional,
   nombre de la biblioteca de documentos si no es la estándar, p. ej.
   `EasyREM CORE`), `SP_CARPETA_FACTURAS`, `SP_CARPETA_BANCO` y opcionalmente
   `SP_CARPETA_GASTOS`.
4. Prográmala cada hora: Dashboard → Integrations → Cron → HTTP request a la
   función con cabecera `Authorization: Bearer <service_role key>`.

Cada `SP_CARPETA_*` puede ser una carpeta (se recorre con todas sus
subcarpetas, ignorando las llamadas `old`, `Antiguo`, `backup` o `copia`), un
fichero concreto (útil para apuntar solo a tu Excel maestro de facturas) o
varias rutas separadas por `;`. El tipo de movimiento bancario se deduce de la
ruta completa — carpeta o fichero que contenga "tarjeta", "emitidas" o
"recibidas"; si solo dice "transferencias", decide el signo del importe; si
no, cuenta. La categoría de gasto se sugiere por la carpeta donde vive el
fichero (p. ej. `Oca` → OCA / Inspecciones, `colaboradores` → Colaboradores,
`visitas` → Desplazamientos y dietas). Cada fichero queda anotado en la tabla
`ingesta_ficheros` con su resultado.
