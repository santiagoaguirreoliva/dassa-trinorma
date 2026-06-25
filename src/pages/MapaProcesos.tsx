import { Link } from 'react-router-dom';
import { ArrowRight, ArrowDown, FileText } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageContent } from '@/components/ui';

// Mapa de Procesos oficial F-TRI-03 Rev. 02 — versión nativa de la app.
// Entrada comercial → 4 circuitos operativos → procesos de soporte.
// Cada circuito y cada soporte enlaza a su procedimiento nativo (/procedimientos?code=).

const COMERCIAL = ['Definir el mercado potencial', 'Contactar', 'Despertar interés', 'Definición del producto / servicio', 'Oferta', 'Fidelizar · firma de propuesta'];

const CIRCUITOS: { code: string; nombre: string; pasos: string[] }[] = [
  { code: 'P-TRI-14.1', nombre: 'Importación Marítima', pasos: ['Recepción documental', 'Coordinación de cargas', 'Traslado e ingreso', 'Confección doc. desconsolidación', 'Orden del día', 'Informar al cliente', 'Almacenaje', 'Despacho verificar / retirar', 'Retiro, control y entrega'] },
  { code: 'P-TRI-13.1', nombre: 'Exportación Marítima', pasos: ['Recepción documental e INV', 'Coordinación e ingreso', 'Estado de mercadería', 'Almacenaje', 'Retiro de vacío de puerto', 'Verificación / consolidado', 'Precinto y pre-cumplido', 'Entrega puerto / doc. / control', 'Ingreso a puerto'] },
  { code: 'P-TRI-13.2', nombre: 'Exportación Terrestre', pasos: ['Recepción documental', 'Coordinación e ingreso', 'Estado de mercadería', 'Almacenaje', 'Coordinación de verificaciones', 'Consolidación de camión', 'Precintado y pre-cumplido', 'Control de salida y doc.'] },
  { code: 'P-TRI-14.2', nombre: 'Importación Terrestre', pasos: ['Preaviso de arribo del camión', 'Arribo y control de precintos', 'Confección doc. desconsolidación', 'Estado merc. desconsolidada', 'Informar al cliente', 'Almacenaje', 'Despacho verificar / retirar', 'Retiro, control y entrega'] },
];

const SOPORTES: { nombre: string; code: string | null }[] = [
  { nombre: 'Compras y Evaluación de Proveedores', code: 'P-TRI-11' },
  { nombre: 'RRHH · Capital Humano', code: 'P-TRI-17' },
  { nombre: 'Evaluación de Peligros y Riesgos', code: 'P-TRI-21' },
  { nombre: 'Participación y Consultas', code: 'P-TRI-18' },
  { nombre: 'Mantenimiento', code: 'P-TRI-12' },
  { nombre: 'Información Documentada', code: 'P-TRI-05' },
  { nombre: 'Aspectos Ambientales', code: 'P-TRI-23' },
  { nombre: 'Gestión de Residuos', code: 'P-TRI-25' },
  { nombre: 'Control de Dispositivos de Seguimiento y Medición', code: null },
  { nombre: 'Cumplimiento Legal', code: 'P-TRI-06' },
  { nombre: 'Incidentes y Accidentes Laborales', code: 'P-TRI-22' },
  { nombre: 'Comunicación', code: 'P-TRI-04' },
  { nombre: 'Emergencias', code: 'P-SST-004' },
];

function StepBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="shrink-0 w-[118px] min-h-[52px] flex items-center justify-center text-center px-2 py-1.5 rounded-md bg-[#4472C4] text-white text-[10.5px] font-semibold leading-tight shadow-sm">
      {children}
    </div>
  );
}

export default function MapaProcesos() {
  return (
    <PageContent>
      <Header title="🗺️ Mapa de Procesos" subtitle="F-TRI-03 Rev. 02 · enfoque a procesos (ISO 9001 4.4) · entrada comercial → 4 circuitos → soporte" />

      <div className="bg-white rounded-dassa shadow-dassa-card border border-gray-200 p-5 mb-4 overflow-x-auto">
        {/* flecha de retorno al cliente */}
        <div className="flex items-center justify-between text-dassa-celeste-deep mb-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide"><ArrowDown size={14} /> Cliente · requisitos</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide">Cliente · entrega <ArrowRight size={14} /></span>
        </div>

        <div className="flex gap-4 min-w-[920px]">
          {/* ENTRADA */}
          <div className="shrink-0 w-[210px] flex flex-col gap-3">
            <div className="rounded-lg bg-[#6B4E9E] text-white p-3 text-center text-[12px] font-bold shadow-sm">Determinación de Requisitos</div>
            <div className="rounded-lg border border-dassa-red/30 bg-dassa-red-tint p-3">
              <div className="text-[10px] font-extrabold uppercase tracking-wide text-dassa-red-deep mb-2">Proceso Comercial</div>
              <div className="flex flex-col gap-1.5">
                {COMERCIAL.map((s) => (
                  <div key={s} className="text-[10.5px] font-semibold text-dassa-red-deep bg-white/70 border border-dassa-red/20 rounded px-2 py-1 leading-tight">{s}</div>
                ))}
              </div>
              <Link to="/procedimientos?code=P-TRI-09" className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-dassa-red hover:underline">
                <FileText size={11} /> P-TRI-09 Gestión Comercial
              </Link>
            </div>
          </div>

          {/* CIRCUITOS */}
          <div className="flex-1 flex flex-col gap-5">
            {CIRCUITOS.map((c) => (
              <div key={c.code}>
                <Link to={`/procedimientos?code=${c.code}`}
                  className="group block rounded-lg bg-gradient-to-r from-[#6B4E9E] to-[#8E6FC0] text-white px-4 py-2 mb-2 shadow-sm hover:from-[#5A3F88] transition">
                  <span className="text-[15px] font-extrabold">{c.nombre}</span>
                  <span className="ml-2 text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded">{c.code}</span>
                  <span className="ml-2 text-[10px] opacity-80 group-hover:opacity-100">ver procedimiento →</span>
                </Link>
                <div className="flex flex-wrap items-center gap-1.5">
                  {c.pasos.map((p, i) => (
                    <div key={p} className="flex items-center gap-1.5">
                      <StepBox>{p}</StepBox>
                      {i < c.pasos.length - 1 && <ArrowRight size={13} className="text-gray-400 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SOPORTES */}
      <div className="bg-white rounded-dassa shadow-dassa-card border border-gray-200 p-5">
        <div className="text-center text-[13px] font-extrabold uppercase tracking-[0.12em] text-dassa-navy mb-4">Procesos de Soporte</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {SOPORTES.map((s) => s.code ? (
            <Link key={s.nombre} to={`/procedimientos?code=${s.code}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[11.5px] font-semibold text-gray-700 hover:border-dassa-celeste hover:text-dassa-celeste-deep transition">
              <span className="leading-tight">{s.nombre}</span>
              <span className="text-[9px] font-mono text-gray-400 shrink-0">{s.code}</span>
            </Link>
          ) : (
            <div key={s.nombre} className="flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-[11.5px] font-semibold text-amber-700 leading-tight">
              <span>{s.nombre}</span>
              <span className="text-[9px] font-bold shrink-0">falta</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-gray-500 leading-relaxed">
          Los 4 circuitos cuelgan de los procedimientos generales <b>P-TRI-14 Operación Importación</b> y <b>P-TRI-13 Operación Exportación</b>.
          El proceso <b>Control de Dispositivos de Seguimiento y Medición</b> (calibración, ISO 9001 7.1.5) aún no tiene procedimiento cargado.
        </p>
      </div>
    </PageContent>
  );
}
