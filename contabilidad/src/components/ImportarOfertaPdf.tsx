import React, { useState } from 'react';
import { AppData, LineaServicio, LINEAS_SERVICIO, Oferta, Tarea } from '../types';
import { setState, uid, ensureContacto } from '../lib/store';
import { extraerTextoPdf, parsearOferta, OfertaDetectada } from '../lib/ofertaPdf';
import { sugerirParametros, calcularPresupuesto, construirEstimacion, desglosarDisciplinas } from '../lib/estimador';
import { PLANTILLAS } from '../lib/plantillas';
import { generarPlanTrabajos } from '../lib/trabajos';
import { fmtEur, hoy } from '../lib/format';
import { Btn, Modal, Field, inputCls } from './ui';

type DestinoImportacion = 'pipeline' | 'encurso' | 'terminado';

interface HorasMiembro {
  contactoId: string;
  horas: number;
}

const num = (s: string) => parseFloat(s) || 0;

/** Importa una oferta existente en PDF: detecta los campos, se revisan, y
 *  según el estado del trabajo crea solo la oferta (pipeline), el proyecto con
 *  su plan de tareas (en curso) o el proyecto cerrado con las horas dedicadas
 *  por cada miembro (terminado) para medir la rentabilidad real. */
const ImportarOfertaPdf: React.FC<{ data: AppData; onClose: () => void }> = ({ data, onClose }) => {
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState('');
  const [fichero, setFichero] = useState('');
  const [det, setDet] = useState<OfertaDetectada | null>(null);

  // Campos editables tras la detección
  const [titulo, setTitulo] = useState('');
  const [cliente, setCliente] = useState('');
  const [fecha, setFecha] = useState(hoy());
  const [importe, setImporte] = useState('');
  const [superficie, setSuperficie] = useState('');
  const [linea, setLinea] = useState<LineaServicio>('Otros');
  const [codigo, setCodigo] = useState('');
  const [destino, setDestino] = useState<DestinoImportacion>('encurso');
  const [horas, setHoras] = useState<HorasMiembro[]>([]);

  const colaboradores = data.contactos.filter((c) => c.tipo === 'colaborador');

  const abrirFichero = async (f: File) => {
    setLeyendo(true);
    setError('');
    setFichero(f.name);
    try {
      const texto = await extraerTextoPdf(f);
      const d = parsearOferta(texto);
      setDet(d);
      setTitulo(d.titulo || f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '));
      setCliente(d.cliente);
      if (d.fecha) setFecha(d.fecha);
      setImporte(d.importe ? String(d.importe) : '');
      setSuperficie(d.superficieM2 ? String(d.superficieM2) : '');
      setLinea(d.linea);
      // Código: dígitos del nombre del fichero (p. ej. 2026006) o correlativo
      const mNum = f.name.match(/(\d{4})[_\s-]?(\d{2,4})/);
      setCodigo(mNum ? `OF-${mNum[1]}-${mNum[2].padStart(3, '0')}` : `OF-${new Date().getFullYear()}-${String(data.ofertas.length + 1).padStart(3, '0')}`);
    } catch (e) {
      setError(`No se pudo leer el PDF: ${(e as Error).message}`);
      setDet(null);
    } finally {
      setLeyendo(false);
    }
  };

  const totalHorasDedicadas = horas.reduce((s, h) => s + h.horas, 0);

  const crear = () => {
    const imp = num(importe);
    if (!titulo.trim() || !cliente.trim() || imp <= 0) return;
    const m2 = num(superficie);
    const clienteId = ensureContacto(cliente.trim(), 'cliente');

    // Estimación teórica reconstruida (senda teórica): mismos motores que el asistente
    const s = sugerirParametros(data, linea, imp, 'medio', undefined, m2 > 0 ? m2 : undefined);
    const base = calcularPresupuesto(s.params);
    const pesos =
      det && det.partidas.length >= 2
        ? det.partidas.map((p) => ({ nombre: p.concepto.slice(0, 60), peso: p.importe }))
        : (PLANTILLAS[linea] ?? PLANTILLAS['Otros']).disciplinas?.map((d) => ({ nombre: d.nombre, peso: d.peso })) || [];
    const disciplinas = pesos.length ? desglosarDisciplinas(pesos, base.totalHoras, base.costeEquipo) : [];
    const { estimacion, resumen } = construirEstimacion(s.params, imp, {
      superficieM2: m2 > 0 ? m2 : undefined,
      disciplinas,
    });

    const ofertaId = uid();
    const proyectoId = destino === 'pipeline' ? undefined : uid();
    const oferta: Oferta = {
      id: ofertaId,
      codigo: codigo.trim() || `OF-${new Date().getFullYear()}-${String(data.ofertas.length + 1).padStart(3, '0')}`,
      clienteId,
      titulo: titulo.trim(),
      lineaServicio: linea,
      importe: imp,
      fecha,
      estado: destino === 'pipeline' ? 'enviada' : 'aceptada',
      proyectoId,
      superficieM2: m2 > 0 ? m2 : undefined,
      notas: `Importada del PDF «${fichero}».\n${resumen}`,
      estimacion,
    };

    const nuevosProyectos: AppData['proyectos'] = [];
    const nuevasTareas: Tarea[] = [];
    if (proyectoId) {
      const proyecto = {
        id: proyectoId,
        codigo: oferta.codigo.replace('OF', 'PR'),
        nombre: oferta.titulo,
        clienteId,
        lineaServicio: linea,
        presupuesto: imp,
        fechaInicio: fecha,
        estado: 'activo' as const,
        repartos: [],
        comercialPct: estimacion.comercialPct,
        gastosGeneralesPct: estimacion.generalesPct,
        modoReparto: 'horas' as const,
        notas: `Importado del PDF «${fichero}».`,
      };
      nuevosProyectos.push(proyecto);
      // Senda teórica: el plan de tareas con las horas presupuestadas
      const plan = generarPlanTrabajos(proyecto, oferta);
      if (destino === 'terminado') {
        for (const t of plan) t.estado = 'hecha';
      }
      nuevasTareas.push(...plan);
      // Horas realmente dedicadas por cada miembro del equipo
      for (const h of horas) {
        if (!h.contactoId || h.horas <= 0) continue;
        const nombre = data.contactos.find((c) => c.id === h.contactoId)?.nombre || '—';
        nuevasTareas.push({
          id: uid(),
          proyectoId,
          titulo: `Horas dedicadas — ${nombre}`,
          horasPrevistas: 0,
          horasReales: h.horas,
          estado: 'hecha',
          contactoId: h.contactoId,
        });
      }
    }

    setState((p) => ({
      ...p,
      ofertas: [...p.ofertas, oferta],
      proyectos: [...p.proyectos, ...nuevosProyectos],
      tareas: [...p.tareas, ...nuevasTareas],
    }));
    onClose();
  };

  return (
    <Modal title="📥 Importar oferta desde PDF" onClose={onClose} wide>
      <div className="space-y-4">
        {!det && (
          <div className="text-center py-6">
            <label className="inline-block px-4 py-3 bg-teal-600 text-white rounded-lg cursor-pointer hover:bg-teal-700">
              {leyendo ? 'Leyendo el PDF…' : 'Elegir PDF de la oferta'}
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                disabled={leyendo}
                onChange={(e) => e.target.files?.[0] && abrirFichero(e.target.files[0])}
              />
            </label>
            <p className="text-xs text-gray-500 mt-3">
              Reconoce las ofertas con el formato de la casa (título, cliente, partidas del presupuesto y base
              imponible). Todo lo detectado se puede corregir antes de crear nada.
            </p>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </div>
        )}

        {det && (
          <>
            <p className="text-xs text-gray-500">
              📄 {fichero} · detectadas {det.partidas.length} partidas
              {det.partidas.length > 0 && `: ${det.partidas.map((p) => `${p.concepto.slice(0, 30)} (${fmtEur(p.importe)})`).slice(0, 3).join(' · ')}${det.partidas.length > 3 ? '…' : ''}`}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Código">
                <input className={inputCls} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
              </Field>
              <Field label="Fecha de la oferta">
                <input type="date" className={inputCls} value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </Field>
              <Field label="Cliente *">
                <input className={inputCls} list="imp-clientes" value={cliente} onChange={(e) => setCliente(e.target.value)} />
                <datalist id="imp-clientes">
                  {data.contactos.filter((c) => c.tipo === 'cliente').map((c) => (
                    <option key={c.id} value={c.nombre} />
                  ))}
                </datalist>
              </Field>
              <Field label="Título / objeto *">
                <input className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              </Field>
              <Field label="Línea de servicio">
                <select className={inputCls} value={linea} onChange={(e) => setLinea(e.target.value as LineaServicio)}>
                  {LINEAS_SERVICIO.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Base imponible (€) *">
                  <input type="number" step="0.01" className={inputCls} value={importe} onChange={(e) => setImporte(e.target.value)} />
                </Field>
                <Field label="Superficie (m²)">
                  <input type="number" step="10" className={inputCls} value={superficie} onChange={(e) => setSuperficie(e.target.value)} />
                </Field>
              </div>
            </div>

            <Field label="Estado del trabajo">
              <div className="space-y-1 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={destino === 'pipeline'} onChange={() => setDestino('pipeline')} />
                  Solo registrar la oferta (pipeline, aún sin aceptar)
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={destino === 'encurso'} onChange={() => setDestino('encurso')} />
                  Trabajo en curso → crea el proyecto y el plan de tareas para seguir la senda teórica
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={destino === 'terminado'} onChange={() => setDestino('terminado')} />
                  Trabajo terminado → crea el proyecto con las horas dedicadas para medir la rentabilidad real
                </label>
              </div>
            </Field>

            {destino !== 'pipeline' && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium">
                    ⏱ Horas dedicadas por el equipo {destino === 'encurso' ? '(hasta hoy, opcional)' : ''}
                  </h4>
                  <Btn variant="ghost" onClick={() => setHoras([...horas, { contactoId: colaboradores[0]?.id || '', horas: 0 }])}>
                    + Añadir miembro
                  </Btn>
                </div>
                {horas.length === 0 && (
                  <p className="text-xs text-gray-500">
                    {destino === 'terminado'
                      ? 'Añade a cada miembro con sus horas estimadas: la comparación con la senda teórica da la rentabilidad real.'
                      : 'Si el equipo ya ha dedicado horas, regístralas aquí; el resto se irá apuntando en Trabajos.'}
                  </p>
                )}
                {horas.map((h, i) => (
                  <div key={i} className="flex gap-2 items-center mb-1">
                    <select
                      className={`${inputCls} py-1`}
                      value={h.contactoId}
                      onChange={(e) => setHoras(horas.map((x, j) => (j === i ? { ...x, contactoId: e.target.value } : x)))}
                    >
                      <option value="">— elige colaborador —</option>
                      {colaboradores.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                    <input
                      type="number" step="0.5" min="0" placeholder="horas"
                      className={`${inputCls} py-1 w-28`}
                      value={h.horas || ''}
                      onChange={(e) => setHoras(horas.map((x, j) => (j === i ? { ...x, horas: num(e.target.value) } : x)))}
                    />
                    <Btn variant="ghost" className="text-red-600" onClick={() => setHoras(horas.filter((_, j) => j !== i))}>✕</Btn>
                  </div>
                ))}
                {totalHorasDedicadas > 0 && num(importe) > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    Total: {totalHorasDedicadas} h → tarifa efectiva real {(num(importe) / totalHorasDedicadas).toFixed(0)} €/h
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Btn variant="secondary" onClick={() => { setDet(null); setHoras([]); }}>← Otro PDF</Btn>
              <div className="flex gap-2">
                <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
                <Btn onClick={crear} disabled={!titulo.trim() || !cliente.trim() || num(importe) <= 0}>
                  {destino === 'pipeline' ? 'Registrar oferta' : destino === 'encurso' ? 'Crear oferta + proyecto en curso' : 'Crear oferta + proyecto terminado'}
                </Btn>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ImportarOfertaPdf;
