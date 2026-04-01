import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/Card';
import { api } from '../lib/api';
import { FileText, AlertCircle, BarChart3, Users, TrendingUp } from 'lucide-react';

export function Dashboard() {
  const [stats, setStats] = useState({
    totalDocuments: 0,
    openIncidents: 0,
    npsScore: 0,
    pendingTrainings: 0,
    significantAspects: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [docs, incidents, satisfaction, trainings, aspects] = await Promise.all([
          api.getDocuments(),
          api.getIncidents(),
          api.getSatisfaction(),
          api.getTrainings(),
          api.getEnvironmentalAspects(),
        ]);

        setStats({
          totalDocuments: docs.length,
          openIncidents: incidents.filter((i: any) => i.status === 'abierto').length,
          npsScore: satisfaction.nps || 0,
          pendingTrainings: trainings.filter((t: any) => t.status === 'planificada').length,
          significantAspects: aspects.filter((a: any) => a.is_significant).length,
        });
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const kpiCards = [
    {
      label: 'Documentos Vigentes',
      value: stats.totalDocuments,
      icon: FileText,
      color: 'blue',
    },
    {
      label: 'Incidentes Abiertos',
      value: stats.openIncidents,
      icon: AlertCircle,
      color: 'red',
    },
    {
      label: 'Puntuación NPS',
      value: stats.npsScore,
      icon: TrendingUp,
      color: 'green',
    },
    {
      label: 'Capacitaciones Pendientes',
      value: stats.pendingTrainings,
      icon: Users,
      color: 'yellow',
    },
    {
      label: 'Aspectos Ambientales Significativos',
      value: stats.significantAspects,
      icon: BarChart3,
      color: 'purple',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {kpiCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Card key={idx} className={`${colorClasses[card.color as keyof typeof colorClasses]}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-75">{card.label}</p>
                    <p className="text-3xl font-bold mt-2">{loading ? '...' : card.value}</p>
                  </div>
                  <Icon size={24} className="opacity-50" />
                </div>
              </Card>
            );
          })}
        </div>

        {/* Welcome Section */}
        <Card title="Bienvenida a Trinorma Manager">
          <div className="space-y-4">
            <p className="text-gray-700">
              Sistema integral de gestión para ISO 9001 (Calidad), ISO 14001 (Ambiente) e ISO 45001 (Seguridad y Salud).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Documentos</h3>
                <p className="text-sm text-blue-700">Gestiona procedimientos, instrucciones y registros ISO.</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Operaciones</h3>
                <p className="text-sm text-green-700">Registra incidentes, aspectos ambientales y capacitaciones.</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">Análisis</h3>
                <p className="text-sm text-purple-700">Matriz de riesgos, satisfacción del cliente y hallazgos.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
