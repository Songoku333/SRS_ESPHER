import { Contacto, Oferta } from '../types';
import { capitulosPresupuesto, exclusiones, condicionesEconomicas } from './ofertaDoc';
import logoLemaUrl from '../assets/logo-smartrem-lema.png';
import portadaUrl from '../assets/portada-oferta.png';
import monogramaUrl from '../assets/logo-sr-icono.png';

/**
 * Documento de oferta en Word (.docx), editable antes de enviarlo. Sigue el
 * diseño de las ofertas reales de SmartRem: portada con la imagen de la curva
 * azul a página completa, logo grande con el lema, índice, capítulos con banda
 * azul y tabla de presupuesto con la paleta corporativa. La librería `docx` se
 * carga bajo demanda para no engordar la app.
 */

// Paleta tomada del modelo de oferta real
const TITULO = '2B529D'; // azul corporativo de títulos
const CIAN = '09A5DF'; // separador de portada
const BANDA = '4472C4'; // banda de los títulos de capítulo
const PALIDO = 'EAF3F8'; // relleno claro de la tabla
const GRIS = '757C80';

const eur = (n: number) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const fechaCorta = (iso: string) => {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
};

/** dataURL → bytes + tipo de imagen para docx. */
function bytesDeDataUrl(dataUrl: string): { data: Uint8Array; type: 'png' | 'jpg' } | null {
  const m = dataUrl.match(/^data:image\/(png|jpe?g);base64,(.+)$/);
  if (!m) return null;
  const bin = atob(m[2]);
  const data = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
  return { data, type: m[1] === 'png' ? 'png' : 'jpg' };
}

/** Dimensiones de un dataURL de imagen (para mantener la proporción). */
async function medidas(dataUrl: string): Promise<{ w: number; h: number }> {
  return await new Promise((res) => {
    const i = new Image();
    i.onload = () => res({ w: i.width, h: i.height });
    i.onerror = () => res({ w: 1, h: 1 });
    i.src = dataUrl;
  });
}

const bytesDe = async (url: string) => new Uint8Array(await (await fetch(url)).arrayBuffer());

export async function generarDocxOferta(oferta: Oferta, cliente: Contacto | undefined): Promise<Blob> {
  const docx = await import('docx');
  const {
    Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
    WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, Header, Footer,
    PageNumber, TableOfContents, PageBreak,
    HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType,
  } = docx;

  const est = oferta.estimacion;
  const capitulos = capitulosPresupuesto(oferta);
  const iva = Math.round(oferta.importe * 21) / 100;
  const total = Math.round((oferta.importe + iva) * 100) / 100;
  const sost = est?.sostenibilidad;
  const esBreeam = oferta.lineaServicio === 'Pre-assessment BREEAM';
  const tipoTrabajos = /consultoría/i.test(oferta.lineaServicio) ? 'CONSULTORÍA' : 'INGENIERÍA';

  // Imágenes de marca (las mismas del modelo real de oferta)
  const [logoBytes, portadaBytes, monogramaBytes] = await Promise.all([
    bytesDe(logoLemaUrl), bytesDe(portadaUrl), bytesDe(monogramaUrl),
  ]);
  // Logo del cliente (si lo tiene guardado en Contactos)
  const logoCliente = cliente?.logo ? bytesDeDataUrl(cliente.logo) : null;
  const dimCliente = cliente?.logo ? await medidas(cliente.logo) : null;
  const anchoCliente = dimCliente ? Math.min(170, Math.round((dimCliente.w / dimCliente.h) * 60)) : 0;
  const altoCliente = dimCliente ? Math.round(anchoCliente / (dimCliente.w / dimCliente.h)) : 0;

  const t = (texto: string, opts: Record<string, unknown> = {}) => new TextRun({ text: texto, font: 'Calibri', ...opts });
  const p = (texto: string, opts: Record<string, unknown> = {}) =>
    new Paragraph({ children: [t(texto, (opts.run as Record<string, unknown>) || {})], spacing: { after: 120 }, ...opts });
  /** Título de capítulo: banda azul con texto blanco, como en el modelo. */
  const h1 = (n: number, texto: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      keepNext: true,
      shading: { type: ShadingType.CLEAR, fill: BANDA },
      // solo top/bottom: la librería emite left/right en un orden que el esquema OOXML no admite
      border: {
        top: { style: BorderStyle.SINGLE, size: 24, color: BANDA },
        bottom: { style: BorderStyle.SINGLE, size: 24, color: BANDA },
      },
      spacing: { before: 280, after: 160 },
      children: [t(`${n}. ${texto}`, { bold: true, color: 'FFFFFF', size: 28 })],
    });
  const vineta = (texto: string) =>
    new Paragraph({ children: [t(texto)], bullet: { level: 0 }, spacing: { after: 80 } });

  // ---------- Portada (diseño del modelo real) ----------
  const portada = [
    // Fondo a página completa: foto de arquitectura con la curva azul
    new Paragraph({
      children: [new ImageRun({
        data: portadaBytes,
        type: 'png',
        transformation: { width: 816, height: 1056 },
        floating: {
          horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
          verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
          behindDocument: true,
          wrap: { type: TextWrappingType.NONE },
        },
      })],
    }),
    // Logo grande con el lema, arriba a la izquierda
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [new ImageRun({ data: logoBytes, type: 'png', transformation: { width: 434, height: 199 } })],
    }),
    new Paragraph({ spacing: { before: 2000 }, children: [] }),
    new Paragraph({ spacing: { after: 0 }, children: [t('OFERTA TÉCNICA', { bold: true, size: 52, color: TITULO })] }),
    new Paragraph({ spacing: { after: 60 }, children: [t('Y ECONÓMICA', { bold: true, size: 52, color: TITULO })] }),
    new Paragraph({ spacing: { after: 240 }, children: [t('______', { bold: true, size: 46, color: CIAN })] }),
    new Paragraph({ spacing: { after: 400 }, children: [t(oferta.titulo, { bold: true, size: 36, color: TITULO })] }),
    new Paragraph({ spacing: { after: 60 }, children: [t('Cliente: ', { bold: true, size: 23 }), t(cliente?.nombre || '—', { bold: true, size: 23 })] }),
    new Paragraph({ spacing: { after: 60 }, children: [t('Nº oferta: ', { bold: true, size: 23 }), t(oferta.codigo, { bold: true, size: 23 })] }),
    new Paragraph({ spacing: { after: 60 }, children: [t('Fecha: ', { bold: true, size: 23 }), t(fechaCorta(oferta.fecha), { bold: true, size: 23 })] }),
    ...(oferta.superficieM2
      ? [new Paragraph({ spacing: { after: 60 }, children: [t('Superficie: ', { bold: true, size: 23 }), t(`${oferta.superficieM2.toLocaleString('es-ES')} m²`, { bold: true, size: 23 })] })]
      : []),
    ...(logoCliente
      ? [new Paragraph({
          spacing: { before: 400 },
          children: [new ImageRun({ data: logoCliente.data, type: logoCliente.type, transformation: { width: anchoCliente, height: altoCliente } })],
        })]
      : []),
  ];

  // ---------- Índice ----------
  const indice = [
    new Paragraph({ spacing: { before: 200, after: 200 }, children: [t('ÍNDICE', { bold: true, size: 52, color: TITULO })] }),
    new TableOfContents('Índice', { hyperlink: true, headingStyleRange: '1-1' }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // ---------- Capítulos ----------
  let n = 0;
  const cap = () => ++n;
  const cuerpo: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];

  cuerpo.push(h1(cap(), `Condiciones de la oferta para trabajos de ${tipoTrabajos}`));
  cuerpo.push(p(`Por medio del presente documento definimos el alcance y objetivos de los trabajos de Ingeniería y Consultoría requeridos por ${cliente?.nombre || 'el cliente'}, así como los honorarios de los mismos, según el presupuesto que detallamos en el capítulo correspondiente y las condiciones generales de la propuesta.`));
  cuerpo.push(p('Las condiciones de la propuesta se desarrollan a lo largo del presente documento sobre la base de un servicio profesional de ingeniería riguroso y metodológico, pero a la vez innovador, flexible y creativo.'));

  cuerpo.push(h1(cap(), 'Alcance y descripción de los servicios'));
  if (esBreeam) {
    cuerpo.push(p('Preevaluación (pre-assessment) BREEAM® del activo: análisis crédito a crédito del esquema aplicable para estimar la puntuación alcanzable y definir la hoja de ruta hacia la certificación:'));
  } else {
    cuerpo.push(p(`Se trata del desarrollo de servicios de ${oferta.lineaServicio} con las siguientes actividades y disciplinas:`));
  }
  for (const d of est?.disciplinas || []) cuerpo.push(vineta(`${d.nombre} — dedicación estimada: ${d.horas} h`));
  if (esBreeam) {
    cuerpo.push(vineta('Puntuación estimada y rating alcanzable (Pass ≥ 30 % · Good ≥ 45 % · Very Good ≥ 55 % · Excellent ≥ 70 % · Outstanding ≥ 85 %), en escenario base y mejorado.'));
    cuerpo.push(vineta('Análisis coste-beneficio de los créditos y workshop de resultados con la propiedad y el equipo de diseño.'));
    cuerpo.push(vineta('Informe de preevaluación con la hoja de ruta recomendada hacia el rating objetivo.'));
  }
  cuerpo.push(p('Entregables: la documentación técnica completa correspondiente al alcance (memorias, cálculos, mediciones y planos) en soporte informático.', { run: { color: GRIS, size: 18 } }));

  if (sost) {
    cuerpo.push(h1(cap(), 'Módulo de sostenibilidad inteligente'));
    cuerpo.push(p(`${sost.nivel}. Implantación de sensórica ambiental y de consumo conectada al BMS/BACS del edificio para reducir las emisiones de CO₂ y el consumo energético, mejorar la calidad del aire interior y el confort de los ocupantes, y recoger los KPIs necesarios para el reporte de sostenibilidad.`));
    if (sost.estandares.length) cuerpo.push(vineta(`Configuración del reporte en los marcos: ${sost.estandares.join(', ')}.`));
    cuerpo.push(vineta(`Gestión de datos, cuadros de mando e informes a través de la plataforma EasyESG.pro (suscripción anual de ${eur(sost.saasAnual)}, se contrata aparte).`));
  }

  cuerpo.push(h1(cap(), 'Plazo de ejecución'));
  cuerpo.push(p('A confirmar según disponibilidad de información y necesidades del cliente.'));

  cuerpo.push(h1(cap(), 'Medios humanos y materiales'));
  cuerpo.push(p('SmartRem pondrá a disposición del servicio los siguientes medios humanos:'));
  for (const e of (est?.equipo || []).filter((x) => x.horas > 0)) {
    cuerpo.push(vineta(`${e.rol.replace('🌱 ', '')} — dedicación estimada: ${e.horas} h`));
  }
  cuerpo.push(p('Para la realización de los trabajos ofertados, el cliente facilitará a SmartRem toda la documentación y datos necesarios, así como el acceso a sus instalaciones.'));

  cuerpo.push(h1(cap(), 'Prevención de riesgos laborales'));
  cuerpo.push(p('Se cumplirá con la normativa contenida en el Real Decreto 171/2004 en materia de coordinación de actividades empresariales.'));

  cuerpo.push(h1(cap(), 'Protección de la información'));
  cuerpo.push(p('La información no pública del cliente será tratada como confidencial y se utilizará exclusivamente para los fines del contrato.'));

  cuerpo.push(h1(cap(), 'Condiciones generales y técnicas'));
  cuerpo.push(vineta('Una vez realizados los trabajos, la documentación se suministrará únicamente en soporte informático (textos en Word y PDF). No se entregará nada en soporte papel.'));
  cuerpo.push(vineta('La presente oferta es válida durante 2 meses.'));

  cuerpo.push(h1(cap(), 'Condiciones particulares'));
  if (esBreeam) {
    cuerpo.push(vineta('La puntuación y el rating del pre-assessment son orientativos y no vinculantes: el resultado definitivo depende del assessment formal, de las evidencias aportadas y de la verificación del organismo certificador.'));
    cuerpo.push(vineta('Se incluye una (1) iteración de re-puntuación tras el workshop de resultados. Iteraciones adicionales serán objeto de oferta independiente.'));
  } else {
    cuerpo.push(vineta('Se incluye la modificación de aquellas partes del trabajo que deban corregirse por un requerimiento emitido por un organismo (Ayuntamiento e Industria). No así las modificaciones de terceros, que serán objeto de oferta independiente.'));
    cuerpo.push(vineta('Cualquier incumplimiento normativo de la arquitectura proyectada no detectado en la comprobación inicial será responsabilidad del técnico autor del proyecto arquitectónico.'));
  }

  cuerpo.push(h1(cap(), 'Presupuesto y condiciones económicas'));
  cuerpo.push(p('Los honorarios a percibir por SmartRem, correspondientes a los servicios prestados, serán los siguientes:'));
  // Tabla con la paleta del modelo: cabecera azul oscuro, columna Ref. en azul pálido
  const ANCHOS = [900, 4560, 1900, 2000]; // DXA; suman 9360 (carta con márgenes de 1")
  const celda = (texto: string, col: number, opts: Record<string, unknown> = {}, tipo: 'cabecera' | 'ref' | 'dato' = 'dato') =>
    new TableCell({
      width: { size: ANCHOS[col], type: WidthType.DXA },
      shading: tipo === 'cabecera'
        ? { type: ShadingType.CLEAR, fill: TITULO }
        : tipo === 'ref'
          ? { type: ShadingType.CLEAR, fill: PALIDO }
          : undefined,
      verticalAlign: 'center',
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({
        children: [t(texto, tipo === 'cabecera' ? { bold: true, color: PALIDO, size: 20 } : { size: 20, ...(opts.run as object || {}) })],
        alignment: (opts.alignment as typeof AlignmentType.RIGHT) || AlignmentType.LEFT,
      })],
    });
  const filas = [
    new TableRow({ children: [celda('Ref.', 0, {}, 'cabecera'), celda('Ítem', 1, {}, 'cabecera'), celda('Dedicación', 2, {}, 'cabecera'), celda('Honorarios (€)', 3, {}, 'cabecera')] }),
    ...capitulos.map((c, i) =>
      new TableRow({ children: [celda(String(i + 1), 0, {}, 'ref'), celda(c.concepto, 1), celda(c.detalle, 2, { alignment: AlignmentType.RIGHT }), celda(eur(c.importe), 3, { alignment: AlignmentType.RIGHT })] })
    ),
    new TableRow({ children: [celda('', 0, {}, 'ref'), celda('Base imponible', 1, { run: { bold: true } }), celda('', 2), celda(eur(oferta.importe), 3, { alignment: AlignmentType.RIGHT, run: { bold: true } })] }),
    new TableRow({ children: [celda('', 0, {}, 'ref'), celda('IVA (21 %)', 1), celda('', 2), celda(eur(iva), 3, { alignment: AlignmentType.RIGHT })] }),
    new TableRow({ children: [celda('', 0, {}, 'ref'), celda('TOTAL', 1, { run: { bold: true } }), celda('', 2), celda(eur(total), 3, { alignment: AlignmentType.RIGHT, run: { bold: true } })] }),
  ];
  cuerpo.push(new Table({ columnWidths: ANCHOS, width: { size: 9360, type: WidthType.DXA }, rows: filas }));
  if (oferta.superficieM2) {
    cuerpo.push(p(`Ratio de referencia: ${(oferta.importe / oferta.superficieM2).toFixed(2)} €/m² sobre ${oferta.superficieM2.toLocaleString('es-ES')} m².`, { run: { color: GRIS, size: 18 } }));
  }

  cuerpo.push(h1(cap(), 'Exclusiones'));
  for (const e of exclusiones(oferta)) cuerpo.push(vineta(e));

  cuerpo.push(h1(cap(), 'Condiciones económicas'));
  for (const c of condicionesEconomicas(oferta)) cuerpo.push(vineta(c));

  cuerpo.push(h1(cap(), 'Aceptación de oferta y presupuesto'));
  cuerpo.push(p('Esperando que nuestra oferta sea de su agrado y cumpla todas sus expectativas, quedamos a su disposición para cualquier aclaración que necesite.'));
  cuerpo.push(p(`Madrid, a ${fechaCorta(oferta.fecha)}`));
  cuerpo.push(p('FIRMADO CONFORME:', { run: { bold: true } }));
  const celdaFirma = (nombre: string) =>
    new TableCell({
      width: { size: 4680, type: WidthType.DXA },
      children: [p('En representación de:'), p(nombre, { run: { bold: true } }), p(''), p(''), p('Fecha y firma', { run: { color: GRIS } })],
    });
  cuerpo.push(new Table({
    columnWidths: [4680, 4680],
    width: { size: 9360, type: WidthType.DXA },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [celdaFirma(cliente?.nombre || 'El cliente'), celdaFirma('SMART REM SOLUTIONS S.L.')] })],
  }));

  // Página tamaño carta, como el modelo
  const CARTA = { size: { width: 12240, height: 15840 } };

  // Cabecera de las páginas interiores: monograma + nº de oferta (como el modelo)
  const cabecera = new Header({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new ImageRun({ data: monogramaBytes, type: 'png', transformation: { width: 48, height: 21 } }),
        t(`   Nº oferta: ${oferta.codigo}`, { size: 18, color: GRIS }),
      ],
    })],
  });
  const pie = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ children: [PageNumber.CURRENT], font: 'Calibri', size: 18, color: GRIS })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [t(`SmartRem · Ingeniería | Energía | Tecnología · www.smartremsolutions.com${sost ? ' · Sostenibilidad y reporting: www.EasyESG.pro' : ''}`, { size: 14, color: GRIS })],
      }),
    ],
  });

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    features: { updateFields: true }, // el índice se actualiza solo al abrir en Word
    sections: [
      { properties: { page: CARTA }, children: portada },
      { properties: { page: CARTA }, headers: { default: cabecera }, footers: { default: pie }, children: [...indice, ...cuerpo] },
    ],
  });

  return await Packer.toBlob(doc);
}

/** Genera y descarga el .docx de la oferta. */
export async function descargarDocxOferta(oferta: Oferta, cliente: Contacto | undefined): Promise<void> {
  const blob = await generarDocxOferta(oferta, cliente);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${oferta.codigo} - ${oferta.titulo.slice(0, 60)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
