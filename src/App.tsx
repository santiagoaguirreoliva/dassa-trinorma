import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './lib/auth';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { SistemaGestion } from './pages/SistemaGestion';
import { Documents } from './pages/Documents';
import { Incidents } from './pages/Incidents';
import { EnvironmentalAspects } from './pages/EnvironmentalAspects';
import { CustomerSatisfaction } from './pages/CustomerSatisfaction';
import { Employees } from './pages/Employees';
import { Trainings } from './pages/Trainings';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { NotFound } from './pages/NotFound';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/ingresar" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sistema-gestion"
            element={
              <ProtectedRoute>
                <SistemaGestion />
              </ProtectedRoute>
            }
          />

          <Route
            path="/documentos"
            element={
              <ProtectedRoute>
                <Documents />
              </ProtectedRoute>
            }
          />

          <Route
            path="/incidentes"
            element={
              <ProtectedRoute>
                <Incidents />
              </ProtectedRoute>
            }
          />

          <Route
            path="/aspectos-ambientales"
            element={
              <ProtectedRoute>
                <EnvironmentalAspects />
              </ProtectedRoute>
            }
          />

          <Route
            path="/satisfaccion-cliente"
            element={
              <ProtectedRoute>
                <CustomerSatisfaction />
              </ProtectedRoute>
            }
          />

          <Route
            path="/empleados"
            element={
              <ProtectedRoute>
                <Employees />
              </ProtectedRoute>
            }
          />

          <Route
            path="/capacitaciones"
            element={
              <ProtectedRoute>
                <Trainings />
              </ProtectedRoute>
            }
          />

          {/* Placeholder routes */}
          <Route
            path="/hallazgos"
            element={
              <ProtectedRoute>
                <PlaceholderPage title="Hallazgos y No Conformidades" />
              </ProtectedRoute>
            }
          />

          <Route
            path="/matriz-riesgos"
            element={
              <ProtectedRoute>
                <PlaceholderPage title="Matriz de Riesgos" />
              </ProtectedRoute>
            }
          />

          <Route
            path="/requisitos-legales"
            element={
              <ProtectedRoute>
                <PlaceholderPage title="Requisitos Legales" />
              </ProtectedRoute>
            }
          />

          <Route
            path="/compras"
            element={
              <ProtectedRoute>
                <PlaceholderPage title="Gestión de Compras" />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
