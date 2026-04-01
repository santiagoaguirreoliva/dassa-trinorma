import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';

export function SistemaGestion() {
  const [activeTab, setActiveTab] = useState<'mision' | 'vision' | 'valores' | 'politica_calidad' | 'politica_gestion'>('mision');
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadContent();
  }, [activeTab]);

  const loadContent = async () => {
    try {
      const data = await api.getSistemaGestionSection(activeTab);
      setContent(data.content || '');
      setIsEditing(false);
    } catch (error) {
      console.error('Error al cargar:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.updateSistemaGestionSection(activeTab, content);
      setIsEditing(false);
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'mision', label: 'Misión' },
    { id: 'vision', label: 'Visión' },
    { id: 'valores', label: 'Valores' },
    { id: 'politica_calidad', label: 'Política de Calidad' },
    { id: 'politica_gestion', label: 'Política de Gestión Ambiental' },
  ];

  return (
    <Layout title="Sistema de Gestión">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <Card>
          <div className="space-y-4">
            {isEditing ? (
              <>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ingresa el contenido aquí..."
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    isLoading={isSaving}
                  >
                    Guardar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsEditing(false);
                      loadContent();
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-gray-700">{content || 'No hay contenido aún.'}</p>
                </div>
                <Button variant="secondary" onClick={() => setIsEditing(true)}>
                  Editar
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
