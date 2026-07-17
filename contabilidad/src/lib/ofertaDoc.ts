import { Contacto, Oferta } from '../types';
import logoSvg from '../assets/logo-smartrem.svg?raw';

/**
 * Documento de oferta imprimible (A4) para enviar al cliente, con la marca
 * SmartRem y la estructura estándar de las ofertas de la casa (12 capítulos:
 * condiciones, alcance, plazo, medios, PRL, protección de la información,
 * condiciones generales/particulares, presupuesto, exclusiones, condiciones
 * económicas y aceptación). Se genera como HTML autocontenido: se imprime a
 * PDF desde el navegador y se puede archivar tal cual en SharePoint.
 *
 * El desglose interno (costes, márgenes) NO aparece: el cliente ve capítulos,
 * dedicación en horas y honorarios.
 */

const AZUL = '#225ca7';
const CIAN = '#1e99c7';
const GRIS = '#757c80';

const eur = (n: number) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const fechaLarga = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface CapituloPresupuesto {
  concepto: string;
  detalle: string; // p. ej. "58,5 h"
  importe: number;
}

/** Capítulos de presupuesto de cara al cliente: prorratea el importe ofertado
 *  entre disciplinas (por su peso de coste) y el módulo de sostenibilidad. */
export function capitulosPresupuesto(oferta: Oferta): CapituloPresupuesto[] {
  const est = oferta.estimacion;
  if (!est) return [{ concepto: 'Honorarios profesionales', detalle: '', importe: oferta.importe }];

  // Coste interno del módulo = sus horas (roles 🌱) + su hardware
  const equipoModulo = est.equipo.filter((e) => e.rol.startsWith('🌱'));
  const costeEquipoModulo = equipoModulo.reduce((s, e) => s + e.horas * e.costeHora, 0);
  const costeModulo = costeEquipoModulo + (est.sostenibilidad?.hardware || 0);
  const contingencia = 1 + est.contingenciaPct / 100;
  const costeTotal = est.costeEquipo * contingencia + est.gastosDirectos;

  const importeModulo =
    est.sostenibilidad && costeTotal > 0
      ? Math.round(((costeModulo * contingencia) / costeTotal) * oferta.importe * 100) / 100
      : 0;
  const importeIngenieria = Math.round((oferta.importe - importeModulo) * 100) / 100;

  const capitulos: CapituloPresupuesto[] = [];
  if (est.disciplinas?.length) {
    const sumaCoste = est.disciplinas.reduce((s, d) => s + d.coste, 0) || 1;
    let acumulado = 0;
    est.disciplinas.forEach((d, i) => {
      const ultimo = i === est.disciplinas!.length - 1;
      const importe = ultimo
        ? Math.round((importeIngenieria - acumulado) * 100) / 100
        : Math.round((d.coste / sumaCoste) * importeIngenieria * 100) / 100;
      acumulado += importe;
      capitulos.push({ concepto: d.nombre, detalle: `${d.horas} h`, importe });
    });
  } else {
    const horasBase = est.totalHoras - (est.sostenibilidad?.horas || 0);
    capitulos.push({
      concepto: 'Honorarios profesionales',
      detalle: horasBase > 0 ? `${horasBase} h` : '',
      importe: importeIngenieria,
    });
  }
  if (est.sostenibilidad && importeModulo > 0) {
    capitulos.push({
      concepto: `Módulo de sostenibilidad inteligente (${est.sostenibilidad.nivel.split(' — ')[0]})`,
      detalle: `${est.sostenibilidad.horas} h + equipamiento`,
      importe: importeModulo,
    });
  }
  return capitulos;
}

/** Exclusiones estándar de la casa (de los modelos de oferta SmartRem). */
export function exclusiones(oferta: Oferta): string[] {
  const conModulo = !!oferta.estimacion?.sostenibilidad;
  if (oferta.lineaServicio === 'Pre-assessment BREEAM') {
    return [
      'No está incluido el I.V.A. (21 %).',
      'Registro del proyecto y tasas de certificación de BREEAM ES / BRE (orientativamente entre 2.200 € y 13.800 € según superficie), que se abonan directamente a la entidad certificadora.',
      'El assessment formal de certificación (fase de diseño y post-construcción) y la recopilación y presentación de evidencias, que serían objeto de oferta independiente.',
      'Modelización energética completa (SBEM/HULC/simulación dinámica), estudios de iluminación natural, acústicos, de viabilidad LZC y ecológicos de detalle (se valorarían aparte si el objetivo de rating los requiere).',
      'Modificaciones del proyecto o del diseño derivadas de las recomendaciones del informe.',
      'La modificación, por causas ajenas a SmartRem, de la documentación de proyecto facilitada.',
      'No se facilitará documentación ni planos en formato impreso.',
      'Todo lo no incluido expresamente en la propuesta.',
    ];
  }
  return [
    'No está incluido el I.V.A. (21 %).',
    // Con el módulo de sostenibilidad, la monitorización IAQ/BMS SÍ está incluida
    conModulo
      ? 'Instalaciones no descritas en el alcance: ACS, diseño de iluminación, fotovoltaica, cargador de vehículo eléctrico, pluviales, rociadores, pararrayos, seguridad, CCTV, accesos, puertas automáticas, ascensores, etc. (se valorarían aparte).'
      : 'Instalaciones no descritas en el alcance: ACS, diseño de iluminación, fotovoltaica, cargador de vehículo eléctrico, pluviales, rociadores, pararrayos, seguridad, CCTV, accesos, puertas automáticas, monitorización de calidad de aire interior, BMS, ascensores, etc. (se valorarían aparte).',
    'Acometidas y gestiones con compañías suministradoras (agua, electricidad, fibra/conectividad, gas, etc.).',
    'Legalizaciones ante Industria no descritas en el alcance (se valorarían aparte).',
    'Licencias de Obra o Actividad y gestiones con el Ayuntamiento.',
    'Cálculos de estructuras o similares.',
    'Estudios acústicos y Certificado de Eficiencia Energética (se valorarían aparte).',
    'Pagos de tasas y suplidos ante organismos, salvo las partidas expresamente incluidas en el presupuesto.',
    'La modificación, por causas ajenas a SmartRem, de los planos de ejecución de la obra.',
    'No se facilitará documentación ni planos en formato impreso.',
    'Todo lo no incluido expresamente en la propuesta.',
  ];
}

/** Condiciones económicas estándar de la casa. */
export function condicionesEconomicas(oferta: Oferta): string[] {
  const sost = oferta.estimacion?.sostenibilidad;
  const lineas = [
    'En la propuesta de honorarios no está incluido el IVA.',
    'Forma de pago: 30 % a la aceptación de la oferta y 70 % a la entrega de los trabajos.',
    'Los honorarios cuya fecha de facturación sea posterior a los 12 meses de la aceptación de esta propuesta se actualizarán aplicando la variación del IPC desde la fecha de aceptación.',
    'Los trabajos no incluidos en la oferta que se realicen por administración se facturarán a 60 €/hora.',
    'Cualquier modificación sustancial a introducir en el trabajo terminado, por causas ajenas al proyectista, se valorará previamente a su ejecución y no se iniciará hasta tener la aprobación expresa del cliente.',
    'En caso de que el cliente dejara sin efecto el encargo antes de su finalización, se liquidarán los honorarios correspondientes a la parte de los trabajos ya realizados más un 10 % de los trabajos pendientes.',
  ];
  if (sost) {
    lineas.push(
      `La suscripción a la plataforma EasyESG.pro (${eur(sost.saasAnual)}/año) se contrata y factura aparte, con renovación anual, e incluye el alojamiento de los datos, los cuadros de mando y la generación de informes${sost.estandares.length ? ` en los marcos ${sost.estandares.join(', ')}` : ''}.`
    );
  }
  return lineas;
}

/** Genera el HTML autocontenido del documento de oferta. */
export function generarDocumentoOferta(oferta: Oferta, cliente: Contacto | undefined): string {
  const est = oferta.estimacion;
  const capitulos = capitulosPresupuesto(oferta);
  const iva = Math.round(oferta.importe * 21) / 100;
  const total = Math.round((oferta.importe + iva) * 100) / 100;
  const sost = est?.sostenibilidad;
  const tipoTrabajos = /consultoría/i.test(oferta.lineaServicio) ? 'CONSULTORÍA' : 'INGENIERÍA';

  const medios = (est?.equipo || [])
    .filter((e) => !e.rol.startsWith('🌱'))
    .map((e) => `<li>${esc(e.rol)} <span class="nota">(dedicación estimada: ${e.horas} h)</span></li>`)
    .join('');
  const mediosModulo = (est?.equipo || [])
    .filter((e) => e.rol.startsWith('🌱'))
    .map((e) => `<li>${esc(e.rol.replace('🌱 ', ''))} <span class="nota">(dedicación estimada: ${e.horas} h)</span></li>`)
    .join('');

  const esBreeam = oferta.lineaServicio === 'Pre-assessment BREEAM';
  const alcance = esBreeam
    ? `<p>Preevaluación (<i>pre-assessment</i>) <b>BREEAM®</b> del activo: análisis crédito a crédito del esquema aplicable para estimar la puntuación alcanzable y definir la hoja de ruta hacia la certificación, con el siguiente alcance:</p>
  <ul>
    <li>Revisión de la documentación de proyecto/activo y visita al inmueble.</li>
    <li>Evaluación preliminar de los créditos por categoría, con la dedicación estimada siguiente:</li>
  </ul>
  ${est?.disciplinas?.length ? `<table><tr><th>Categoría BREEAM</th><th class="num">Dedicación</th></tr>${est.disciplinas.map((d) => `<tr><td>${esc(d.nombre)}</td><td class="num">${d.horas} h</td></tr>`).join('')}</table>` : ''}
  <ul>
    <li>Puntuación estimada y <b>rating alcanzable</b> (Pass ≥ 30 % · Good ≥ 45 % · Very Good ≥ 55 % · Excellent ≥ 70 % · Outstanding ≥ 85 %), en escenario base y escenario mejorado.</li>
    <li>Análisis coste-beneficio de los créditos: qué medidas aportan más puntos por euro invertido.</li>
    <li><i>Workshop</i> de presentación de resultados con la propiedad y el equipo de diseño.</li>
    <li>Informe de preevaluación con la hoja de ruta recomendada hacia el rating objetivo.</li>
  </ul>`
    : est?.disciplinas?.length
      ? `<p>Se trata del desarrollo de servicios de ${tipoTrabajos.toLowerCase()} de <b>${esc(oferta.lineaServicio)}</b> con las siguientes actividades y disciplinas:</p>
       <ul>${est.disciplinas.map((d) => `<li>${esc(d.nombre)} <span class="nota">(dedicación estimada: ${d.horas} h)</span></li>`).join('')}</ul>`
      : `<p>Se trata del desarrollo de servicios de <b>${esc(oferta.lineaServicio)}</b>: ${esc(oferta.titulo)}.</p>`;

  let n = 0;
  const cap = () => ++n;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${esc(oferta.codigo)} · ${esc(oferta.titulo)}</title>
<style>
  :root { --azul: ${AZUL}; --cian: ${CIAN}; --gris: ${GRIS}; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #22282e; font-size: 10.5pt; line-height: 1.45; }
  .pagina { max-width: 186mm; margin: 0 auto; padding: 10mm 0 16mm; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid var(--azul); padding-bottom: 6mm; margin-bottom: 6mm; }
  header .logo svg { height: 20mm; width: auto; }
  .cajaOferta { text-align: right; }
  .cajaOferta .num { font-size: 14pt; font-weight: 700; color: var(--azul); }
  .cajaOferta .fecha { color: var(--gris); font-size: 9.5pt; }
  .titulo { font-size: 13.5pt; font-weight: 700; color: var(--azul); margin: 4mm 0 4mm; }
  h2 { font-size: 11pt; color: var(--azul); text-transform: uppercase; border-bottom: 1px solid #d7dde3; padding-bottom: 1mm; margin: 6mm 0 2.5mm; }
  h2 .n { color: var(--cian); margin-right: 2mm; }
  .cliente { background: #f2f6fa; border-left: 3px solid var(--cian); padding: 3mm 4mm; margin-bottom: 2mm; display: flex; justify-content: space-between; gap: 6mm; flex-wrap: wrap; }
  .cliente b { color: var(--azul); }
  table { width: 100%; border-collapse: collapse; margin: 2mm 0; }
  th { text-align: left; font-size: 9pt; text-transform: uppercase; letter-spacing: .03em; color: #fff; background: var(--azul); padding: 2mm 3mm; }
  td { padding: 1.8mm 3mm; border-bottom: 1px solid #e4e9ee; vertical-align: top; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  td.ref { color: var(--gris); }
  tr.total td { border-top: 2px solid var(--azul); border-bottom: none; font-weight: 700; }
  tr.iva td { border-bottom: none; color: var(--gris); }
  ul { padding-left: 5mm; margin: 1mm 0 2mm; }
  li { margin-bottom: 1.2mm; }
  p { margin-bottom: 1.5mm; }
  .sost { border: 1px solid #bfe3d2; background: #f2faf6; border-radius: 2mm; padding: 3mm 4mm; margin: 1mm 0; }
  .sost h3 { color: #1e7a4f; font-size: 10.5pt; margin-bottom: 1.5mm; }
  .firmas { display: flex; gap: 10mm; margin-top: 12mm; }
  .firmas > div { flex: 1; border-top: 1px solid var(--gris); padding-top: 2mm; font-size: 9.5pt; color: var(--gris); }
  footer { text-align: center; font-size: 8pt; color: var(--gris); border-top: 1px solid #e4e9ee; padding-top: 2mm; margin-top: 8mm; }
  .nota { font-size: 9pt; color: var(--gris); }
  @page { size: A4; margin: 12mm 12mm 20mm; }
  @media print {
    .pagina { padding: 0; }
    .no-print { display: none; }
  }
  .no-print { position: fixed; top: 8px; right: 8px; }
  .no-print button { background: var(--azul); color: #fff; border: 0; border-radius: 6px; padding: 8px 14px; font-size: 14px; cursor: pointer; }
</style>
</head>
<body>
<div class="no-print"><button onclick="window.print()">🖨 Imprimir / guardar PDF</button></div>
<div class="pagina">
  <header>
    <div class="logo">${logoSvg}</div>
    <div class="cajaOferta">
      <div class="num">OFERTA ${esc(oferta.codigo)}</div>
      <div class="fecha">${fechaLarga(oferta.fecha)}</div>
      <div class="fecha">Validez: 2 meses</div>
    </div>
  </header>

  <div class="titulo">Propuesta para ${esc(oferta.titulo)}</div>
  <div class="cliente">
    <div>
      <b>Empresa/cliente:</b> ${esc(cliente?.nombre || '—')}${cliente?.nif ? `<br><b>NIF:</b> ${esc(cliente.nif)}` : ''}${cliente?.email ? `<br><b>Att.:</b> ${esc(cliente.email)}` : ''}
    </div>
    <div>
      <b>SMART!REM SOLUTIONS</b><br>
      ${oferta.superficieM2 ? `Superficie del activo: ${oferta.superficieM2.toLocaleString('es-ES')} m²<br>` : ''}
      Línea de servicio: ${esc(oferta.lineaServicio)}
    </div>
  </div>

  <h2><span class="n">${cap()}.</span>Condiciones de la oferta para trabajos de ${tipoTrabajos}</h2>
  <p>Por medio del presente documento definimos el alcance y objetivos de los trabajos de Ingeniería y Consultoría requeridos por <b>${esc(cliente?.nombre || 'el cliente')}</b>, así como los honorarios de los mismos, según el presupuesto que detallamos en el capítulo correspondiente y las condiciones generales de la propuesta.</p>
  <p>Las condiciones de la propuesta se desarrollan a lo largo del presente documento sobre la base de un servicio profesional de ingeniería riguroso y metodológico, pero a la vez innovador, flexible y creativo.</p>

  <h2><span class="n">${cap()}.</span>Alcance y descripción de los servicios</h2>
  ${alcance}
  <p class="nota">Entregables: la documentación técnica completa correspondiente al alcance (memorias, cálculos, mediciones y planos) en soporte informático.</p>

  ${
    sost
      ? `<h2><span class="n">${cap()}.</span>Módulo de sostenibilidad inteligente</h2>
  <div class="sost">
    <h3>🌱 ${esc(sost.nivel)}</h3>
    <p>Implantación de sensórica ambiental y de consumo conectada al BMS/BACS del edificio para reducir las emisiones de CO₂ y el consumo energético, mejorar la calidad del aire interior y el confort de los ocupantes, y recoger los KPIs necesarios para el reporte de sostenibilidad.</p>
    <ul>
      <li>Auditoría inicial, diseño de la red de medición e integración con los sistemas existentes.</li>
      <li>Suministro e instalación del equipamiento de medición (incluido en el presupuesto).</li>
      ${sost.estandares.length ? `<li>Configuración del reporte en los marcos: <b>${sost.estandares.map(esc).join(', ')}</b>.</li>` : ''}
      <li>Gestión de datos, cuadros de mando e informes a través de la plataforma <b>EasyESG.pro</b> (suscripción anual de ${eur(sost.saasAnual)}, se contrata aparte).</li>
    </ul>
    <p class="nota">La nueva EPBD (2024/1275) exige sistemas de automatización y control en edificios terciarios y la monitorización de la calidad del aire interior en renovaciones importantes: este módulo deja el edificio preparado.</p>
  </div>`
      : ''
  }

  <h2><span class="n">${cap()}.</span>Plazo de ejecución</h2>
  <p>A confirmar según disponibilidad de información y necesidades del cliente.</p>

  <h2><span class="n">${cap()}.</span>Medios humanos y materiales</h2>
  <p>SmartRem pondrá a disposición del servicio los siguientes medios humanos:</p>
  <ul>${medios || '<li>Equipo técnico de ingeniería y consultoría adecuado al alcance.</li>'}${mediosModulo}</ul>
  <p>Para la realización de los trabajos ofertados, el cliente facilitará a SmartRem toda la documentación y datos necesarios, así como el acceso a sus instalaciones.</p>

  <h2><span class="n">${cap()}.</span>Prevención de riesgos laborales</h2>
  <p>Se cumplirá con la normativa contenida en el Real Decreto 171/2004 en materia de coordinación de actividades empresariales.</p>

  <h2><span class="n">${cap()}.</span>Protección de la información</h2>
  <p>La información no pública del cliente será tratada como confidencial y se utilizará exclusivamente para los fines del contrato.</p>

  <h2><span class="n">${cap()}.</span>Condiciones generales y técnicas</h2>
  <ul>
    <li>Una vez realizados los trabajos, la documentación se suministrará únicamente en soporte informático (textos en Word y PDF). No se entregará nada en soporte papel.</li>
    <li>La presente oferta es válida durante 2 meses.</li>
    <li>SmartRem pone a disposición del cliente la información necesaria y requerida en relación con la plantilla disponible para la prestación del servicio profesional objeto del presente documento.</li>
  </ul>

  <h2><span class="n">${cap()}.</span>Condiciones particulares</h2>
  ${
    esBreeam
      ? `<ul>
    <li>La puntuación y el rating del pre-assessment son <b>orientativos y no vinculantes</b>: el resultado definitivo depende del assessment formal, de las evidencias aportadas y de la verificación del organismo certificador (BREEAM ES / BRE).</li>
    <li>Se incluye una (1) iteración de re-puntuación tras el workshop de resultados, para reflejar las decisiones adoptadas por el equipo de diseño. Iteraciones adicionales serán objeto de oferta independiente.</li>
    <li>La fiabilidad de la preevaluación depende de la calidad y completitud de la documentación facilitada por la propiedad y el equipo de proyecto.</li>
  </ul>`
      : `<ul>
    <li>Se incluye la modificación de aquellas partes del trabajo (correspondientes al ámbito de esta oferta) que deban corregirse por un requerimiento emitido por un organismo (Ayuntamiento e Industria). No así las modificaciones de terceros, que serán objeto de oferta independiente.</li>
    <li>Cualquier incumplimiento normativo de la arquitectura proyectada no detectado en la comprobación inicial será responsabilidad del técnico autor del proyecto arquitectónico. SmartRem no acometerá la rectificación de planos arquitectónicos.</li>
  </ul>`
  }

  <h2><span class="n">${cap()}.</span>Presupuesto y condiciones económicas</h2>
  <p>Los honorarios a percibir por SmartRem, correspondientes a los servicios prestados, serán los siguientes:</p>
  <table>
    <tr><th>Ref.</th><th>Ítem</th><th class="num">Dedicación</th><th class="num">Honorarios (€)</th></tr>
    ${capitulos.map((c, i) => `<tr><td class="ref">${i + 1}</td><td>${esc(c.concepto)}</td><td class="num">${esc(c.detalle)}</td><td class="num">${eur(c.importe)}</td></tr>`).join('')}
    <tr class="total"><td></td><td>Base imponible</td><td></td><td class="num">${eur(oferta.importe)}</td></tr>
    <tr class="iva"><td></td><td>IVA (21 %)</td><td></td><td class="num">${eur(iva)}</td></tr>
    <tr class="total"><td></td><td>TOTAL</td><td></td><td class="num">${eur(total)}</td></tr>
  </table>
  ${oferta.superficieM2 ? `<p class="nota">Ratio de referencia: ${(oferta.importe / oferta.superficieM2).toFixed(2)} €/m² sobre ${oferta.superficieM2.toLocaleString('es-ES')} m².</p>` : ''}

  <h2><span class="n">${cap()}.</span>Exclusiones</h2>
  <ul>${exclusiones(oferta).map((e) => `<li>${esc(e)}</li>`).join('')}</ul>

  <h2><span class="n">${cap()}.</span>Condiciones económicas</h2>
  <ul>${condicionesEconomicas(oferta).map((c) => `<li>${esc(c)}</li>`).join('')}</ul>

  <h2><span class="n">${cap()}.</span>Aceptación de oferta y presupuesto</h2>
  <p>Esperando que nuestra oferta sea de su agrado y cumpla todas sus expectativas, quedamos a su disposición para cualquier aclaración que necesite.</p>
  <p style="margin-top:4mm">Madrid, ${fechaLarga(oferta.fecha)}</p>
  <p><b>FIRMADO CONFORME:</b></p>
  <div class="firmas">
    <div>En representación de:<br><b>${esc(cliente?.nombre || 'El cliente')}</b><br><br><br>Fecha y firma</div>
    <div>En representación de:<br><b>SMART REM SOLUTIONS S.L.</b><br><br><br>Fecha y firma</div>
  </div>
  <footer>SmartRem · Ingeniería | Energía | Tecnología · www.smartremsolutions.com${sost ? ' · Sostenibilidad y reporting: www.EasyESG.pro' : ''}</footer>
</div>
</body>
</html>`;
}

/** Abre el documento en una pestaña nueva listo para imprimir/guardar en PDF. */
export function abrirDocumentoOferta(oferta: Oferta, cliente: Contacto | undefined): void {
  const html = generarDocumentoOferta(oferta, cliente);
  const win = window.open('', '_blank');
  if (!win) {
    alert('El navegador ha bloqueado la ventana emergente. Permite pop-ups para ver la oferta.');
    return;
  }
  win.document.write(html);
  win.document.close();
}
