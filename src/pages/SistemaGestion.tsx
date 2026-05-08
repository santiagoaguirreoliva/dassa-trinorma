import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save, Loader2, Target, Eye, Heart, Award, Shield,
  Edit3, Check
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent } from '@/components/ui';

// ─── Tipos ──────────────────────────────────────────────────
type SectionKey = 'mision' | 'vision' | 'valores' | 'politica_calidad' | 'politica_gestion';

interface SGData {
  [key: string]: string;
}

// ─── Constantes ─────────────────────────────────────────────
const SECTIONS: { key: SectionKey; label: string; icon: typeof Target; description: string }[] = [
  { key: 'mision',           label: 'Misión',              icon: Target, description: 'Razón de ser de la organización' },
  { key: 'vision',           label: 'Visión',              icon: Eye,    description: 'Hacia dónde queremos llegar' },
  { key: 'valores',          label: 'Valores',             icon: Heart,  description: 'Principios que nos guían' },
  { key: 'politica_calidad', label: 'Política de Calidad', icon: Award,  description: 'Compromiso con la calidad — ISO 9001' },
  { key: 'politica_gestion', label: 'Política SGI',        icon: Shield, description: 'Política del Sistema de Gestión Integrado — TRINORMA' },
];

// ─── Section Editor ──────────────────────────────────────────
function SectionEditor({ sectionKey, content, onSaved }: { sectionKey: SectionKey; content: string; onSaved: () => void }) {
  const { isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(content);

  const mutation = useMutation({
    mutationFn: () => api.patch(`/sistema-gestion/${sectionKey}`, { content: text }),
    onSuccess: () => { setEditing(false); onSaved(); },
  });

  const section = SECTIONS.find(s => s.key === sectionKey)!;
  const Icon = section.icon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-dassa-red" />
          <div>
            <h3 className="text-[13px] font-bold text-gray-800">{section.label}</h3>
            <p className="text-[10px] text-gray-400">{section.description}</p>
          </div>
        </div>
        {isAdmin && !editing && (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-dassa-red hover:bg-dassa-red-tint rounded-lg transition-colors">
            <Edit3 size={11} /> Editar
          </button>
        )}
      </div>
      <div className="p-5">
        {editing ? (
          <div className="space-y-3">
            <textarea value={text} onChange={e => setText(e.target.value)}
              rows={6} className="input-field resize-none text-sm leading-relaxed"
              placeholder={`Escriba la ${section.label.toLowerCase()} de la organización...`} />
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => { setEditing(false); setText(content); }}
                className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
              <button onClick={() => mutation.mutate()}
                disabled={mutation.isPending || text === content}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-dassa-red-deep text-white font-bold text-xs rounded-lg hover:bg-dassa-red disabled:opacity-50">
                {mutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[60px]">
            {content || <span className="text-gray-300 italic">Sin contenido definido. Haga clic en Editar para agregar.</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function SistemaGestion() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<SGData>({
    queryKey: ['sistema-gestion'],
    queryFn: () => api.get('/sistema-gestion'),
    refetchInterval: 60_000,
  });

  const handleSaved = () => {
    qc.invalidateQueries({ queryKey: ['sistema-gestion'] });
  };

  const completeSections = SECTIONS.filter(s => data?.[s.key] && data[s.key].trim().length > 0).length;
  const totalSections = SECTIONS.length;

  return (
    <>
      <Header
        title="Sistema de Gestión Integrado"
        subtitle="Misión, Visión, Valores y Políticas — TRINORMA"
      />

      <PageContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>
        ) : (
          <div className="space-y-4">
            {/* Progress indicator */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-600">Completitud del SGI</span>
                <span className="text-xs font-bold text-dassa-red">{completeSections}/{totalSections} secciones</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full transition-all"
                  style={{ width: `${(completeSections / totalSections) * 100}%` }} />
              </div>
              {completeSections === totalSections && (
                <p className="text-[10px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                  <Check size={10} /> Todas las secciones del SGI están completas
                </p>
              )}
            </div>

            {/* Section editors */}
            {SECTIONS.map(section => (
              <SectionEditor
                key={section.key}
                sectionKey={section.key}
                content={data?.[section.key] ?? ''}
                onSaved={handleSaved}
              />
            ))}
          </div>
        )}
      </PageContent>
    </>
  );
}
