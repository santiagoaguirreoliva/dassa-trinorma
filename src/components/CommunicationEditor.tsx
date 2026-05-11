import { useState, useRef } from 'react';
import { Bold, Italic, List, Link as LinkIcon, Image as ImageIcon, Youtube, Paperclip, Heading1, Heading2, FileCheck } from 'lucide-react';
import MarkdownRender from './MarkdownRender';

interface Props { value: string; onChange: (v: string) => void; }

export default function CommunicationEditor({ value, onChange }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);

  const insert = (before: string, after: string = '') => {
    if (!ref.current) return;
    const ta = ref.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end);
    const v = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(v);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + before.length + sel.length + after.length;
    }, 0);
  };

  const insertBlock = (block: string) => onChange(value + (value ? '\n\n' : '') + block);

  return (
    <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
      {/* TOOLBAR */}
      <div className="flex items-center gap-1 px-2 py-2 bg-gray-50 border-b border-gray-200 flex-wrap">
        <button type="button" onClick={()=>insert('# ', '')} className="p-1.5 hover:bg-gray-200 rounded" title="Título grande"><Heading1 size={14}/></button>
        <button type="button" onClick={()=>insert('## ', '')} className="p-1.5 hover:bg-gray-200 rounded" title="Subtítulo"><Heading2 size={14}/></button>
        <div className="w-px h-5 bg-gray-300 mx-1"/>
        <button type="button" onClick={()=>insert('**','**')} className="p-1.5 hover:bg-gray-200 rounded" title="Negrita"><Bold size={14}/></button>
        <button type="button" onClick={()=>insert('_','_')} className="p-1.5 hover:bg-gray-200 rounded" title="Cursiva"><Italic size={14}/></button>
        <button type="button" onClick={()=>insert('- ', '')} className="p-1.5 hover:bg-gray-200 rounded" title="Lista"><List size={14}/></button>
        <div className="w-px h-5 bg-gray-300 mx-1"/>
        <button type="button" onClick={()=>setShowLinkModal(true)} className="p-1.5 hover:bg-gray-200 rounded text-dassa-celeste-deep" title="Link"><LinkIcon size={14}/></button>
        <button type="button" onClick={()=>setShowImageModal(true)} className="p-1.5 hover:bg-gray-200 rounded text-dassa-celeste-deep" title="Imagen"><ImageIcon size={14}/></button>
        <button type="button" onClick={()=>setShowYouTubeModal(true)} className="p-1.5 hover:bg-gray-200 rounded text-red-600" title="YouTube"><Youtube size={14}/></button>
        <button type="button" onClick={()=>setShowFileModal(true)} className="p-1.5 hover:bg-gray-200 rounded text-amber-600" title="Adjunto"><Paperclip size={14}/></button>
        <div className="ml-auto">
          <button type="button" onClick={()=>setShowPreview(!showPreview)} className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded bg-dassa-celeste-tint text-dassa-celeste-deep">
            <FileCheck size={12}/> {showPreview ? 'Editar' : 'Vista previa'}
          </button>
        </div>
      </div>

      {/* EDITOR / PREVIEW */}
      {!showPreview ? (
        <textarea ref={ref} value={value} onChange={e=>onChange(e.target.value)} rows={12}
          placeholder="Escribí tu comunicación · usá la toolbar para insertar fotos, links, YouTube, adjuntos..."
          className="w-full p-4 text-sm font-mono focus:outline-none resize-none"/>
      ) : (
        <div className="p-6 bg-white max-h-[400px] overflow-y-auto">
          {/* Membrete DASSA en preview */}
          <div className="bg-dassa-red text-white p-4 -mx-6 -mt-6 mb-4">
            <div className="text-[10px] opacity-80 uppercase tracking-widest">DASSA SGI · TRINORMA · Comunicación</div>
          </div>
          <MarkdownRender content={value}/>
        </div>
      )}

      {/* MODAL LINK */}
      {showLinkModal && (
        <ModalInsert title="Insertar link" onClose={()=>setShowLinkModal(false)}
          fields={[{ name:'text', placeholder:'Texto visible', required:true }, { name:'url', placeholder:'https://...', required:true }]}
          onSubmit={(f:any)=>{ insert(`[${f.text}](${f.url})`); setShowLinkModal(false); }}/>
      )}
      {showImageModal && (
        <ModalInsert title="Insertar imagen" onClose={()=>setShowImageModal(false)}
          fields={[{ name:'alt', placeholder:'Descripción (alt)' }, { name:'url', placeholder:'https://...imagen.jpg', required:true }]}
          onSubmit={(f:any)=>{ insertBlock(`![${f.alt||'imagen'}](${f.url})`); setShowImageModal(false); }}/>
      )}
      {showYouTubeModal && (
        <ModalInsert title="Insertar video YouTube" onClose={()=>setShowYouTubeModal(false)}
          fields={[{ name:'url', placeholder:'https://youtube.com/watch?v=... o ID del video', required:true }]}
          onSubmit={(f:any)=>{
            const m = f.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
            const id = m ? m[1] : f.url.trim();
            insertBlock(`{{youtube:${id}}}`);
            setShowYouTubeModal(false);
          }}/>
      )}
      {showFileModal && (
        <ModalInsert title="Insertar adjunto" onClose={()=>setShowFileModal(false)}
          fields={[{ name:'name', placeholder:'Nombre visible (ej. Manual.pdf)', required:true }, { name:'url', placeholder:'URL del archivo', required:true }]}
          onSubmit={(f:any)=>{ insertBlock(`{{file:${f.url}|${f.name}}}`); setShowFileModal(false); }}/>
      )}
    </div>
  );
}

function ModalInsert({ title, fields, onClose, onSubmit }: any) {
  const [state, setState] = useState<any>({});
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5" onClick={e=>e.stopPropagation()}>
        <h4 className="text-sm font-extrabold mb-3">{title}</h4>
        {fields.map((f:any)=>(
          <input key={f.name} value={state[f.name]||''} onChange={e=>setState({...state, [f.name]:e.target.value})}
            placeholder={f.placeholder} className="w-full px-3 py-2 mb-2 border border-gray-200 rounded-lg text-sm"/>
        ))}
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-600">Cancelar</button>
          <button onClick={()=>onSubmit(state)} disabled={!fields.filter((f:any)=>f.required).every((f:any)=>state[f.name])} className="px-4 py-1.5 bg-dassa-red text-white text-xs font-bold rounded-lg disabled:opacity-50">Insertar</button>
        </div>
      </div>
    </div>
  );
}
