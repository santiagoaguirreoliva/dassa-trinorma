// Comunicaciones — unificadas en el Centro de Comunicaciones de Smart DASSA Apps.
// El módulo propio del SGI quedó deprecado para evitar la duplicación del
// registro F-TRI-06 entre la app hija y la app madre.
import { Megaphone, ExternalLink } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageContent } from '@/components/ui';

const CENTRO_URL = 'https://apps.dassa.com.ar/comunicaciones';

export default function Comunicaciones() {
  return (
    <>
      <Header title="Comunicaciones" subtitle="Centralizadas en Smart DASSA Apps" />
      <PageContent>
        <main className="max-w-xl mx-auto mt-8 bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-dassa-red-tint flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-7 h-7 text-dassa-red" />
          </div>
          <h2 className="text-lg font-extrabold text-gray-900">Comunicaciones unificadas</h2>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            Las comunicaciones se gestionan de forma centralizada en el{' '}
            <strong>Centro de Comunicaciones de Smart DASSA Apps</strong>: directorio único de
            destinatarios, acuses de lectura con firma, recordatorios automáticos y registro
            F-TRI-06. Así evitamos tener el mismo registro duplicado en dos sistemas.
          </p>
          <a
            href={CENTRO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-dassa-red text-white font-bold text-sm rounded-xl hover:bg-dassa-red-deep transition-colors"
          >
            <ExternalLink size={16} /> Ir al Centro de Comunicaciones
          </a>
        </main>
      </PageContent>
    </>
  );
}
