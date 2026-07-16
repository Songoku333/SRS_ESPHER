# Conectores de SRS Gestión

La app se integra con las plataformas de trabajo de SmartRem para cerrar el ciclo
**oferta → proyecto → ejecución → datos reales**. Este documento define los
contratos de API de cada conector.

## 1. EasyESG.pro (activos y KPIs de sostenibilidad) — ACTIVO

La app consume la API de EasyESG.pro para vincular cada proyecto con su activo
y mostrar sus KPIs junto al seguimiento de los trabajos. La configuración
(URL + API key) se guarda en **Ajustes → Conectores** de cada navegador.

### Contrato a implementar en EasyESG.pro

Autenticación: cabecera `Authorization: Bearer {apiKey}` en todas las llamadas.
Las claves se emiten por organización desde EasyESG.pro. CORS: permitir el
origen de la app (`https://songoku333.github.io`).

#### `GET /api/v1/activos`

Lista los activos visibles para la clave.

```json
{
  "activos": [
    {
      "id": "act_123",
      "nombre": "Edificio Delta Plaza",
      "superficieM2": 5200,
      "ubicacion": "Madrid"
    }
  ]
}
```

#### `GET /api/v1/activos/{id}/kpis`

KPIs agregados del activo (último periodo disponible). Todos los campos son
opcionales: la app muestra «—» en los que falten.

```json
{
  "periodo": "2026-06",
  "consumoKwh": 48210,
  "co2Kg": 10250,
  "aguaM3": 320,
  "iaqScore": 87,
  "renovablePct": 34
}
```

### Extensiones previstas (fase 2)

- `GET /api/v1/activos/{id}/series?metrica=consumoKwh&desde=...` — series
  temporales para gráficas en la app.
- `POST /api/v1/activos/{id}/documentos` — publicar entregables del proyecto
  (informes de preevaluación BREEAM, certificados) directamente en la ficha
  del activo.
- Webhook `activo.alerta` → aviso en Trabajos cuando un KPI se sale de rango
  (p. ej. CO₂ interior alto tras la instalación de sensórica).

## 2. Autodesk / Revit vía Autodesk Platform Services — ROADMAP

Revit no expone API web propia: la vía estándar es **Autodesk Platform
Services** (APS, antes Forge) con los modelos alojados en BIM 360 / Autodesk
Construction Cloud.

Plan por fases:

1. **Lectura** (Data Management + Model Derivative API): listar los modelos
   del hub, vincular un modelo a cada proyecto de ingeniería y mostrar su
   visor 3D embebido (APS Viewer) en Trabajos, junto a metadatos útiles para
   las ofertas (superficies por nivel → alimenta el dimensionado por m²).
2. **Extracción de cantidades**: leer las scheduled quantities del modelo
   (luminarias, equipos, ml de conducto) para pasar de estimaciones por m² a
   mediciones reales en las ofertas MEP.
3. **Escritura** (Design Automation for Revit): generar planos/exportaciones
   sin abrir Revit, lanzadas desde una tarea de Trabajos.

Requisitos: cuenta de APS (app OAuth 2-legged para lectura), los modelos en
ACC/BIM 360, y una Edge Function que haga de proxy de credenciales (mismo
patrón que `subir-oferta`).

## 3. SharePoint / Microsoft Graph — ACTIVO

Ya operativos: ingesta automática de facturas/banco/gastos (función `ingesta`)
y archivo de ofertas (función `subir-oferta`). Secrets compartidos
`MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `SP_SITE`.
