import React from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/Card';

interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <Layout title={title}>
      <Card>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
          <p className="text-gray-600 mb-4">
            Módulo en desarrollo. Esta sección estará disponible pronto.
          </p>
          <p className="text-sm text-gray-500">
            Para más información, contacte a Santiago García (santiago@dassa.com.ar)
          </p>
        </div>
      </Card>
    </Layout>
  );
}
