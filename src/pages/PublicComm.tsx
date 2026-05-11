import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CheckCircle2, Megaphone, Loader2, ShieldCheck } from 'lucide-react';

export default function PublicComm() {
  const { token } = useParams();
  const [name, setName] = useState('');
  const [feedback, setFeedback] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [confirmHash, setConfirmHash] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<any>({});

  useEffect(() => {
    // Capturar device info al cargar
    const info = {
      device_fingerprint: navigator.userAgent.split(' ').slice(0, 3).join('|') + '|' + screen.width + 'x' + screen.height,
      screen_resolution: `${screen.width}x${screen.height}@${window.devicePixelRatio || 1}x`,
      browser_language: navigator.language,
      browser_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      platform_info: navigator.platform + ' · ' + (navigator as any).userAgentData?.platform || navigator.userAgent.slice(0,80),
      connection_type: (navigator as any).connection?.effectiveType || 'unknown',
    };
    setDeviceInfo(info);
  }, []);

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ['public-comm', token],
    queryFn: () => fetch(`/api/comunicaciones/public/c/${token}`).then(r => r.json()),
    enabled: !!token,
  });

  const confirmMut = useMutation({
    mutationFn: () => fetch(`/api/comunicaciones/public/c/${token}/confirm`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ confirmed_by_full_name: name, feedback, ...deviceInfo })
    }).then(r => r.json()),
    onSuccess: (r:any) => {
      setConfirmed(true);
      setConfirmHash(r?.confirmation?.confirmation_hash || '');
    },
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-dassa-red"/></div>;
  if (error || !data?.communication) return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center"><h1 className="text-xl font-bold text-gray-900">Link inválido</h1><p className="text-sm text-gray-500 mt-2">Esta comunicación no está disponible o ya fue archivada.</p></div>
    </div>
  );
  const c = data.communication;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-dassa-celeste-tint p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200">

          {/* MEMBRETE DASSA */}
          <div className="bg-dassa-red text-white p-6 rounded-t-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center font-extrabold text-2xl" style={{fontFamily:"'Montserrat Alternates', sans-serif"}}>D</div>
              <div>
                <div className="font-extrabold text-lg" style={{fontFamily:"'Montserrat Alternates', sans-serif", letterSpacing: '-0.5px'}}>DASSA</div>
                <div className="text-[10px] opacity-80 uppercase tracking-widest">Sistema de Gestión Integrado · TRINORMA</div>
              </div>
            </div>
            <div className="border-t border-white/20 pt-3 mt-2">
              <div className="text-[10px] opacity-70 uppercase tracking-wider">📢 Comunicación oficial</div>
              <h1 className="text-2xl font-extrabold mt-1">{c.title}</h1>
              <div className="text-xs opacity-90 mt-2">{c.code} · Categoría: {c.category} · Por: {c.sender_name}</div>
            </div>
          </div>

          <div className="p-6">
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">{c.body_md}</div>
          </div>

          {!confirmed && (
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={18} className="text-emerald-600"/>
                <h3 className="text-sm font-bold text-gray-900">Confirmación de lectura · firma electrónica</h3>
              </div>
              <p className="text-[11px] text-gray-500 mb-3">Al confirmar registramos: tu nombre, fecha/hora, IP, dispositivo, navegador y huella digital · genera hash SHA-256 forense.</p>
              <input value={name} onChange={e=>setName(e.target.value)}
                placeholder="Tu NOMBRE COMPLETO (mínimo 3 letras · ej: Juan Pérez)"
                className="w-full mb-2 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-dassa-celeste focus:outline-none"/>
              <textarea value={feedback} onChange={e=>setFeedback(e.target.value)} rows={2} placeholder="Feedback / comentario (opcional)"
                className="w-full mb-3 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"/>
              <details className="mb-3 text-[10px] text-gray-500">
                <summary className="cursor-pointer">📍 Datos del dispositivo que se van a registrar</summary>
                <div className="mt-2 bg-white p-2 rounded text-[10px] font-mono text-gray-600">
                  <div>Resolución: {deviceInfo.screen_resolution}</div>
                  <div>Idioma: {deviceInfo.browser_language}</div>
                  <div>Zona horaria: {deviceInfo.browser_timezone}</div>
                  <div>Plataforma: {deviceInfo.platform_info?.slice(0,80)}</div>
                  <div>Conexión: {deviceInfo.connection_type}</div>
                  <div>+ IP detectada server-side al confirmar</div>
                </div>
              </details>
              <button onClick={()=>confirmMut.mutate()} disabled={!name || name.length < 3 || confirmMut.isPending}
                className="w-full px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {confirmMut.isPending? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>}
                Confirmo que leí esta comunicación
              </button>
            </div>
          )}

          {confirmed && (
            <div className="p-8 text-center border-t border-gray-200 bg-emerald-50 rounded-b-2xl">
              <CheckCircle2 size={56} className="text-emerald-600 mx-auto mb-3"/>
              <h3 className="text-xl font-bold text-emerald-900">¡Gracias, {name}!</h3>
              <p className="text-sm text-emerald-700 mt-1">Tu confirmación de lectura quedó registrada con firma electrónica.</p>
              {confirmHash && (
                <div className="mt-4 inline-block bg-white px-3 py-2 rounded-lg border border-emerald-200 text-[10px] font-mono text-emerald-700">
                  Hash forense: {confirmHash}
                </div>
              )}
            </div>
          )}
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-4">
          DASSA SA · Sistema de Gestión Integrado TRINORMA · ISO 9001 · 14001 · 45001
        </p>
      </div>
    </div>
  );
}
