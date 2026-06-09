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
  recibidas. Conciliación guiada: una entrada propone facturas pendientes de
  cobro; una salida propone gastos y liquidaciones pendientes. Al conciliar, el
  documento se marca cobrado/pagado automáticamente.
- **Liquidaciones**: calcula solo lo devengado por cada colaborador/proveedor
  según lo cobrado de cada proyecto, lo ya liquidado y lo pendiente; registra
  pagos y concíliarlos con el banco.
- **Importar Excel**: sube tu hoja de facturas o los extractos bancarios
  (xlsx, xls, csv). Detecta las columnas automáticamente (puedes corregir el
  mapeo), acepta importes en formato español (1.234,56 €), fechas dd/mm/aaaa o
  de Excel, y omite duplicados (puedes re-importar el mismo fichero sin miedo).
- **Ajustes**: copia de seguridad completa (descarga/restauración en JSON).

## Dónde se guardan los datos

En el navegador (`localStorage`), sin servidor: nada sale de tu equipo.
Descarga copias de seguridad desde **Ajustes** con regularidad.

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
