// Renderer custom para comunicaciones DASSA · soporte:
// **bold** · _italic_ · [link](url) · ![alt](img) · {{youtube:VIDEO_ID}}
// {{file:url|nombre}} · listas con - · ## headers
import { useMemo } from 'react';

interface Props { content: string; className?: string; }

export default function MarkdownRender({ content, className = '' }: Props) {
  const html = useMemo(() => {
    if (!content) return '';
    let s = content;

    // Headers
    s = s.replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-gray-900 mt-4 mb-2">$1</h3>');
    s = s.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-gray-900 mt-5 mb-2">$1</h2>');
    s = s.replace(/^# (.+)$/gm, '<h1 class="text-xl font-extrabold text-dassa-red-deep mt-6 mb-3">$1</h1>');

    // YouTube embed
    s = s.replace(/\{\{youtube:([a-zA-Z0-9_-]+)\}\}/g,
      '<div class="my-4 rounded-xl overflow-hidden shadow-lg" style="aspect-ratio: 16/9; max-width: 100%;"><iframe class="w-full h-full" src="https://www.youtube.com/embed/$1" title="YouTube" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>');

    // Adjunto · {{file:url|nombre}}
    s = s.replace(/\{\{file:([^|]+)\|([^}]+)\}\}/g,
      '<a href="$1" target="_blank" rel="noreferrer" class="inline-flex items-center gap-2 my-2 px-3 py-2 bg-dassa-celeste-tint text-dassa-celeste-deep rounded-lg font-bold text-sm hover:bg-dassa-celeste hover:text-white transition border border-dassa-celeste/30">📎 $2</a>');

    // Imágenes
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img alt="$1" src="$2" class="my-3 rounded-xl max-w-full shadow-md border border-gray-200" />');

    // Links
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer" class="text-dassa-celeste-deep font-semibold hover:underline">$1</a>');

    // Bold + italic
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
    s = s.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em class="italic">$1</em>');

    // Listas con guión
    s = s.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
    s = s.replace(/(<li.+?<\/li>\n?)+/g, '<ul class="my-2 space-y-1 text-sm">$&</ul>');

    // Saltos de línea: dos enters = párrafo
    s = s.split(/\n\n+/).map(p => {
      if (p.match(/^<(h[1-6]|ul|ol|div|img|a|iframe)/)) return p;
      return `<p class="my-2 text-sm leading-relaxed text-gray-700">${p.replace(/\n/g, '<br/>')}</p>`;
    }).join('\n');

    return s;
  }, [content]);

  return <div className={`prose prose-sm max-w-none ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
