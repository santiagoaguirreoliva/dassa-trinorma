// =============================================================================
// Componentes de gráficos reutilizables · recharts wrappers
// =============================================================================
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#C8202C', '#2BB8BE', '#2C5278', '#F59E0B', '#7C3AED', '#10B981', '#6366F1', '#EC4899'];
const COLOR_NPR = { significativo: '#EF4444', no_significativo: '#10B981', sin_evaluar: '#94A3B8' };

interface ChartCardProps {
  title: string;
  subtitle?: string;
  height?: number;
  children: React.ReactNode;
}

export function ChartCard({ title, subtitle, height = 280, children }: ChartCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="mb-3">
        <h4 className="text-sm font-extrabold text-gray-900">{title}</h4>
        {subtitle && <p className="text-[10px] text-gray-500">{subtitle}</p>}
      </div>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          {children as any}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface PieDatum { name: string; value: number; color?: string; }
export function SimplePie({ data, title, subtitle, height = 240 }: { data: PieDatum[]; title: string; subtitle?: string; height?: number }) {
  return (
    <ChartCard title={title} subtitle={subtitle} height={height}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={(e:any) => `${e.name}: ${e.value}`}>
          {data.map((d, i) => <Cell key={i} fill={d.color || COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ChartCard>
  );
}

interface BarDatum { name: string; value: number; value2?: number; color?: string; }
export function SimpleBar({ data, title, subtitle, height = 240, dataKey = 'value', dataKey2, label = 'Cantidad', label2 }: {
  data: BarDatum[]; title: string; subtitle?: string; height?: number; dataKey?: string; dataKey2?: string; label?: string; label2?: string;
}) {
  return (
    <ChartCard title={title} subtitle={subtitle} height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip />
        {dataKey2 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        <Bar dataKey={dataKey} fill="#C8202C" name={label} />
        {dataKey2 && <Bar dataKey={dataKey2} fill="#2BB8BE" name={label2 || dataKey2} />}
      </BarChart>
    </ChartCard>
  );
}

export function SimpleLine({ data, title, subtitle, height = 240, dataKey = 'value' }: any) {
  return (
    <ChartCard title={title} subtitle={subtitle} height={height}>
      <LineChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip />
        <Line type="monotone" dataKey={dataKey} stroke="#C8202C" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ChartCard>
  );
}

// Para Riesgos AMFE específicamente (NPR colors)
export function RiskLevelPie({ data, title }: { data: { name: string; value: number; level?: string }[]; title: string }) {
  return (
    <ChartCard title={title} height={240}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={(e:any) => `${e.name}: ${e.value}`}>
          {data.map((d, i) => <Cell key={i} fill={COLOR_NPR[d.level as keyof typeof COLOR_NPR] || COLORS[i]} />)}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ChartCard>
  );
}
