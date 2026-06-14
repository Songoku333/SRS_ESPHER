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
- **Proyectos**: cada proyecto define su **reparto** (% sobre la base imponible
  cobrada) con colaboradores y proveedores.
- **Facturas**: importadas desde tu Excel de facturación o creadas a mano, con
  IVA/IRPF y total calculado. Se marcan cobradas a mano o al conciliar el banco.
- **Gastos**: facturas recibidas y gastos por categoría, imputables a proyecto.
- **Banco**: movimientos de cuenta, de tarjeta, transferencias emitidas y
  recibidas. **Conciliación automática**: cruza de una vez los movimientos sin
  conciliar con las facturas (entradas), gastos y liquidaciones (salidas) por
  importe y cercanía de fecha, y los marca cobrados/pagados. También conciliación
  guiada uno a uno, y convertir un movimiento de tarjeta o transferencia emitida
  en un gasto imputable a proyecto.
- **Liquidaciones**: calcula lo devengado por cada colaborador/proveedor según lo
  cobrado de cada proyecto, lo ya liquidado y lo pendiente; filtra por periodo de
  cobros y registra en lote las liquidaciones pendientes del periodo.
- **Rentabilidad**: beneficio neto por proyecto y global cruzando facturas,
  gastos imputados y liquidaciones. Por cada proyecto/factura muestra facturado,
  cobrado, costes, reparto, beneficio estimado, margen %, beneficio en caja y lo
  que queda pendiente de cobrar, pagar o liquidar. Filtrable por fechas.
- **Importar Excel**: sube tu hoja de facturas o los extractos bancarios
  (xlsx, xls, csv). Detecta las columnas automáticamente (puedes corregir el
  mapeo), acepta importes en formato español (1.234,56 €), fechas dd/mm/aaaa o
  de Excel, y omite duplicados (puedes re-importar el mismo fichero sin miedo).
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
