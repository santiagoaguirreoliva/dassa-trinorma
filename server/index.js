import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './db.js';

import authRoutes from './routes/auth.js';
import sistemaGestionRoutes from './routes/sistema-gestion.js';
import documentsRoutes from './routes/documents.js';
import incidentsRoutes from './routes/incidents.js';
import environmentalRoutes from './routes/environmental.js';
import satisfactionRoutes from './routes/satisfaction.js';
import employeesRoutes from './routes/employees.js';
import trainingsRoutes from './routes/trainings.js';
import purchasesRoutes from './routes/purchases.js';
import suppliersRoutes from './routes/suppliers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/sistema-gestion', sistemaGestionRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/environmental', environmentalRoutes);
app.use('/api/satisfaction', satisfactionRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/trainings', trainingsRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/suppliers', suppliersRoutes);

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`✅ Trinorma Manager running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
  });
