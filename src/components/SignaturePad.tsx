// Captura de firma manuscrita en canvas — devuelve un data-URI PNG.
// Sin dependencias externas: implementación propia con eventos pointer.
import { useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';

interface Props {
  height?: number;
  onChange?: (dataUrl: string | null) => void;
  label?: string;
}

export default function SignaturePad({ height = 160, onChange, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  // Ajustar tamaño del canvas en DPR
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = Math.round(rect.width * dpr);
    c.height = Math.round(rect.height * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
  }, []);

  const emit = () => {
    const c = canvasRef.current;
    if (!c || !onChange) return;
    if (empty) { onChange(null); return; }
    onChange(c.toDataURL('image/png'));
  };

  const pt = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    lastRef.current = pt(e);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !lastRef.current) return;
    const cur = pt(e);
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(cur.x, cur.y);
    ctx.stroke();
    lastRef.current = cur;
    if (empty) setEmpty(false);
  };
  const onUp = () => {
    drawingRef.current = false;
    lastRef.current = null;
    emit();
  };
  const clear = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    setEmpty(true);
    onChange?.(null);
  };

  return (
    <div>
      {label && <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">{label}</div>}
      <div className="relative bg-white border-2 border-dashed border-gray-300 rounded-xl overflow-hidden" style={{ height }}>
        <canvas
          ref={canvasRef}
          className="block w-full h-full touch-none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        />
        {empty && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 pointer-events-none">
            Firmá acá con el dedo o el lápiz
          </div>
        )}
        <button
          type="button"
          onClick={clear}
          className="absolute top-2 right-2 px-2 py-1 bg-white/90 border border-gray-200 rounded-md text-[10px] font-bold text-gray-600 flex items-center gap-1 hover:bg-gray-50"
        >
          <Eraser size={10} /> Borrar
        </button>
      </div>
    </div>
  );
}
