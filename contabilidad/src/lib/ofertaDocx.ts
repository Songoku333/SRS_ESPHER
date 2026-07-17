import { Contacto, Oferta } from '../types';
import { capitulosPresupuesto, exclusiones, condicionesEconomicas } from './ofertaDoc';
import logoPngUrl from '../assets/logo-smartrem.png';

/**
 * Documento de oferta en Word (.docx), editable por el equipo antes de
 * enviarlo: portada de marca (logo SmartRem grande + logo del cliente si lo
 * tiene) y la misma estructura de capítulos que el documento imprimible.
 * La librería `docx` se carga bajo demanda para no engordar la app.
 */

const AZUL = '225CA7';
const CIAN = '1E99C7';
const GRIS = '757C80';

const eur = (n: number) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const fechaLarga = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

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

export async function generarDocxOferta(oferta: Oferta, cliente: Contacto | undefined): Promise<Blob> {
  const docx = await import('docx');
  const {
    Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
    WidthType, AlignmentType, HeadingLevel, BorderStyle, PageBreak, ShadingType, Footer,
  } = docx;

  const est = oferta.estimacion;
  const capitulos = capitulosPresupuesto(oferta);
  const iva = Math.round(oferta.importe * 21) / 100;
  const total = Math.round((oferta.importe + iva) * 100) / 100;
  const sost = est?.sostenibilidad;
  const esBreeam = oferta.lineaServicio === 'Pre-assessment BREEAM';
  const tipoTrabajos = /consultoría/i.test(oferta.lineaServicio) ? 'CONSULTORÍA' : 'INGENIERÍA';

  // Logo SmartRem (PNG empaquetado con la app)
  const logoBytes = new Uint8Array(await (await fetch(logoPngUrl)).arrayBuffer());
  // Logo del cliente (si lo tiene guardado en Contactos)
  const logoCliente = cliente?.logo ? bytesDeDataUrl(cliente.logo) : null;
  const dimCliente = cliente?.logo ? await medidas(cliente.logo) : null;
  const anchoCliente = dimCliente ? Math.min(180, Math.round((dimCliente.w / dimCliente.h) * 70)) : 0;
  const altoCliente = dimCliente ? Math.round(anchoCliente / (dimCliente.w / dimCliente.h)) : 0;

  const t = (texto: string, opts: Record<string, unknown> = {}) => new TextRun({ text: texto, font: 'Calibri', ...opts });
  const p = (texto: string, opts: Record<string, unknown> = {}) =>
    new Paragraph({ children: [t(texto, (opts.run as Record<string, unknown>) || {})], spacing: { after: 120 }, ...opts });
  const h2 = (n: number, texto: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 280, after: 140 },
      children: [t(`${n}.- `, { bold: true, color: CIAN }), t(texto.toUpperCase(), { bold: true, color: AZUL })],
    });
  const vineta = (texto: string) =>
    new Paragraph({ children: [t(texto)], bullet: { level: 0 }, spacing: { after: 80 } });

  // ---------- Portada ----------
  const portada = [
    new Paragraph({ spacing: { before: 1200 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ data: logoBytes, type: 'png', transformation: { width: 420, height: 193 } })],
    }),
    new Paragraph({ spacing: { before: 500 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.CLEAR, fill: AZUL },
      spacing: { before: 200, after: 200 },
      children: [t('  PROPUESTA DE SERVICIOS PROFESIONALES  ', { bold: true, color: 'FFFFFF', size: 30 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 120 },
      children: [t(oferta.titulo, { bold: true, size: 40, color: AZUL })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [t(`${oferta.lineaServicio} · Oferta ${oferta.codigo}`, { size: 24, color: GRIS })],
    }),
    ...(logoCliente
      ? [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [t('Preparada para', { size: 20, color: GRIS })] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [new ImageRun({ data: logoCliente.data, type: logoCliente.type, transformation: { width: anchoCliente, height: altoCliente } })],
          }),
        ]
      : [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [t('Preparada para', { size: 20, color: GRIS })] })]),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [t(cliente?.nombre || '—', { bold: true, size: 28 })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
      children: [t(`${fechaLarga(oferta.fecha)} · Validez: 2 meses${oferta.superficieM2 ? ` · ${oferta.superficieM2.toLocaleString('es-ES')} m²` : ''}`, { size: 20, color: GRIS })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // ---------- Capítulos ----------
  let n = 0;
  const cap = () => ++n;
  const cuerpo: InstanceType<typeof Paragraph | typeof Table>[] = [];

  cuerpo.push(h2(cap(), `Condiciones de la oferta para trabajos de ${tipoTrabajos}`));
  cuerpo.push(p(`Por medio del presente documento definimos el alcance y objetivos de los trabajos de Ingeniería y Consultoría requeridos por ${cliente?.nombre || 'el cliente'}, así como los honorarios de los mismos, según el presupuesto que detallamos en el capítulo correspondiente y las condiciones generales de la propuesta.`));
  cuerpo.push(p('Las condiciones de la propuesta se desarrollan a lo largo del presente documento sobre la base de un servicio profesional de ingeniería riguroso y metodológico, pero a la vez innovador, flexible y creativo.'));

  cuerpo.push(h2(cap(), 'Alcance y descripción de los servicios'));
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
    cuerpo.push(h2(cap(), 'Módulo de sostenibilidad inteligente'));
    cuerpo.push(p(`${sost.nivel}. Implantación de sensórica ambiental y de consumo conectada al BMS/BACS del edificio para reducir las emisiones de CO₂ y el consumo energético, mejorar la calidad del aire interior y el confort de los ocupantes, y recoger los KPIs necesarios para el reporte de sostenibilidad.`));
    if (sost.estandares.length) cuerpo.push(vineta(`Configuración del reporte en los marcos: ${sost.estandares.join(', ')}.`));
    cuerpo.push(vineta(`Gestión de datos, cuadros de mando e informes a través de la plataforma EasyESG.pro (suscripción anual de ${eur(sost.saasAnual)}, se contrata aparte).`));
  }

  cuerpo.push(h2(cap(), 'Plazo de ejecución'));
  cuerpo.push(p('A confirmar según disponibilidad de información y necesidades del cliente.'));

  cuerpo.push(h2(cap(), 'Medios humanos y materiales'));
  cuerpo.push(p('SmartRem pondrá a disposición del servicio los siguientes medios humanos:'));
  for (const e of (est?.equipo || []).filter((x) => x.horas > 0)) {
    cuerpo.push(vineta(`${e.rol.replace('🌱 ', '')} — dedicación estimada: ${e.horas} h`));
  }
  cuerpo.push(p('Para la realización de los trabajos ofertados, el cliente facilitará a SmartRem toda la documentación y datos necesarios, así como el acceso a sus instalaciones.'));

  cuerpo.push(h2(cap(), 'Prevención de riesgos laborales'));
  cuerpo.push(p('Se cumplirá con la normativa contenida en el Real Decreto 171/2004 en materia de coordinación de actividades empresariales.'));

  cuerpo.push(h2(cap(), 'Protección de la información'));
  cuerpo.push(p('La información no pública del cliente será tratada como confidencial y se utilizará exclusivamente para los fines del contrato.'));

  cuerpo.push(h2(cap(), 'Condiciones generales y técnicas'));
  cuerpo.push(vineta('Una vez realizados los trabajos, la documentación se suministrará únicamente en soporte informático (textos en Word y PDF). No se entregará nada en soporte papel.'));
  cuerpo.push(vineta('La presente oferta es válida durante 2 meses.'));

  cuerpo.push(h2(cap(), 'Condiciones particulares'));
  if (esBreeam) {
    cuerpo.push(vineta('La puntuación y el rating del pre-assessment son orientativos y no vinculantes: el resultado definitivo depende del assessment formal, de las evidencias aportadas y de la verificación del organismo certificador.'));
    cuerpo.push(vineta('Se incluye una (1) iteración de re-puntuación tras el workshop de resultados. Iteraciones adicionales serán objeto de oferta independiente.'));
  } else {
    cuerpo.push(vineta('Se incluye la modificación de aquellas partes del trabajo que deban corregirse por un requerimiento emitido por un organismo (Ayuntamiento e Industria). No así las modificaciones de terceros, que serán objeto de oferta independiente.'));
    cuerpo.push(vineta('Cualquier incumplimiento normativo de la arquitectura proyectada no detectado en la comprobación inicial será responsabilidad del técnico autor del proyecto arquitectónico.'));
  }

  cuerpo.push(h2(cap(), 'Presupuesto y condiciones económicas'));
  cuerpo.push(p('Los honorarios a percibir por SmartRem, correspondientes a los servicios prestados, serán los siguientes:'));
  const celda = (texto: string, opts: Record<string, unknown> = {}, cabecera = false) =>
    new TableCell({
      shading: cabecera ? { type: ShadingType.CLEAR, fill: AZUL } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ children: [t(texto, cabecera ? { bold: true, color: 'FFFFFF', size: 18 } : { size: 20, ...(opts.run as object || {}) })], alignment: (opts.alignment as typeof AlignmentType.RIGHT) || AlignmentType.LEFT })],
    });
  const filas = [
    new TableRow({ children: [celda('Ref.', {}, true), celda('Ítem', {}, true), celda('Dedicación', {}, true), celda('Honorarios (€)', {}, true)] }),
    ...capitulos.map((c, i) =>
      new TableRow({ children: [celda(String(i + 1)), celda(c.concepto), celda(c.detalle, { alignment: AlignmentType.RIGHT }), celda(eur(c.importe), { alignment: AlignmentType.RIGHT })] })
    ),
    new TableRow({ children: [celda(''), celda('Base imponible', { run: { bold: true } }), celda(''), celda(eur(oferta.importe), { alignment: AlignmentType.RIGHT, run: { bold: true } })] }),
    new TableRow({ children: [celda(''), celda('IVA (21 %)'), celda(''), celda(eur(iva), { alignment: AlignmentType.RIGHT })] }),
    new TableRow({ children: [celda(''), celda('TOTAL', { run: { bold: true } }), celda(''), celda(eur(total), { alignment: AlignmentType.RIGHT, run: { bold: true } })] }),
  ];
  cuerpo.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: filas }));
  if (oferta.superficieM2) {
    cuerpo.push(p(`Ratio de referencia: ${(oferta.importe / oferta.superficieM2).toFixed(2)} €/m² sobre ${oferta.superficieM2.toLocaleString('es-ES')} m².`, { run: { color: GRIS, size: 18 } }));
  }

  cuerpo.push(h2(cap(), 'Exclusiones'));
  for (const e of exclusiones(oferta)) cuerpo.push(vineta(e));

  cuerpo.push(h2(cap(), 'Condiciones económicas'));
  for (const c of condicionesEconomicas(oferta)) cuerpo.push(vineta(c));

  cuerpo.push(h2(cap(), 'Aceptación de oferta y presupuesto'));
  cuerpo.push(p('Esperando que nuestra oferta sea de su agrado y cumpla todas sus expectativas, quedamos a su disposición para cualquier aclaración que necesite.'));
  cuerpo.push(p(`Madrid, ${fechaLarga(oferta.fecha)}`));
  cuerpo.push(p('FIRMADO CONFORME:', { run: { bold: true } }));
  cuerpo.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
    rows: [new TableRow({
      children: [
        new TableCell({ children: [p(`En representación de:\n${cliente?.nombre || 'El cliente'}`), p(''), p(''), p('Fecha y firma', { run: { color: GRIS } })] }),
        new TableCell({ children: [p('En representación de:\nSMART REM SOLUTIONS S.L.'), p(''), p(''), p('Fecha y firma', { run: { color: GRIS } })] }),
      ],
    })],
  }));

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
    sections: [{
      properties: {},
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [t(`SmartRem · Ingeniería | Energía | Tecnología · www.smartremsolutions.com${sost ? ' · Sostenibilidad y reporting: www.EasyESG.pro' : ''}`, { size: 14, color: GRIS })],
          })],
        }),
      },
      children: [...portada, ...cuerpo],
    }],
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
