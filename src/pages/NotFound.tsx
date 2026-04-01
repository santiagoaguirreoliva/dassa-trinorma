import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-2xl font-semibold text-gray-700 mb-4">Página no encontrada</p>
        <p className="text-gray-600 mb-8">La página que buscas no existe.</p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Volver al Dashboard
        </Button>
      </div>
    </div>
  );
}
