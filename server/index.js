import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './db.js';

// Import routes
import authRoutes from './routes/auth.js';
import sistemaGestionRoutes from './routes/sistema-gestion.js';
import documentsRoutes from './routes/documents.js';
import incidentsRoutes from './routes/incidents.js';
import environmentalRoutes from './routes/environmental.js';
import satisfactionRoutes from './routes/satisfaction.js';
import employeesRoutes from './routes/employees.js';
import trainingsRoutes from './routes/trainings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sistema-gestion', sistemaGestionRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/environmental', environmentalRoutes);
app.use('/api/satisfaction', satisfactionRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/trainings', trainingsRoutes);

// Serve static frontend files
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Initialize DB then start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Trinorma Manager running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
  });
