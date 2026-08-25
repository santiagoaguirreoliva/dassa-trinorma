import { Search, X } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

// Buscador estándar de las tablas: multicampo por palabras clave.
export default function SearchInput({ value, onChange, placeholder = 'Buscar…', className = '' }: Props) {
  return (
    <div className={`relative ${className}`}>
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-gray-200 rounded-lg pl-7 pr-7 py-1.5 text-xs focus:outline-none focus:border-dassa-celeste w-48"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
          <X size={12} />
        </button>
      )}
    </div>
  );
}
