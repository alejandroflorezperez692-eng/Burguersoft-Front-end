const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Datos simulados para tablas
const tablasDisponibles = [
  { tabla: 'ventas', etiqueta: 'Ventas' },
  { tabla: 'clientes', etiqueta: 'Clientes' },
  { tabla: 'productos', etiqueta: 'Productos' },
  { tabla: 'facturas', etiqueta: 'Facturas' },
  { tabla: 'usuarios', etiqueta: 'Usuarios' },
  { tabla: 'inventario', etiqueta: 'Inventario' }
];

// Endpoint: GET /api/backups/tablas - Obtener lista de tablas disponibles
app.get('/api/backups/tablas', (req, res) => {
  res.json(tablasDisponibles);
});

// Datos simulados de backups existentes
const backupsSimulados = [
  { id: 1, nombre_tabla: 'ventas', nombre: 'backup_ventas', fecha: '2026-10-19T10:30:00Z', usuario_id: 1 },
  { id: 2, nombre_tabla: 'clientes', nombre: 'backup_clientes', fecha: '2026-10-18T14:20:00Z', usuario_id: 1 },
  { id: 3, nombre_tabla: 'productos', nombre: 'backup_productos', fecha: '2026-10-17T08:45:00Z', usuario_id: 2 }
];

// Endpoint: GET /api/backups - Obtener historial de backups
app.get('/api/backups', (req, res) => {
  res.json(backupsSimulados);
});

// Endpoint: POST /api/backups - Generar nuevo backup
app.post('/api/backups', (req, res) => {
  const { tablas } = req.body;
  
  if (!tablas || tablas.length === 0) {
    return res.status(400).json({ success: false, message: 'No se seleccionaron tablas' });
  }
  
  // Simular generación de backup
  const nuevoBackup = {
    id: Date.now(),
    nombre_tabla: tablas[0],
    nombre: `backup_${new Date().toISOString().split('T')[0]}`,
    fecha: new Date().toISOString(),
    usuario_id: 1
  };
  
  // Agregar al simulado array
  backupsSimulados.push(nuevoBackup);
  
  res.json({ 
    success: true, 
    message: 'Copia generada exitosamente',
    tablas: [nuevoBackup]
  });
});

app.listen(PORT, () => {
  console.log(`Backend simulando API en http://127.0.0.1:${PORT}`);
  console.log('Endpoints disponibles:');
  console.log('  GET /backups/tablas');
  console.log('  GET /backups');
  console.log('  POST /backups');
});