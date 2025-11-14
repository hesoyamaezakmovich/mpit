import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Утилита для чтения JSON файлов
async function readDataFile(filename) {
  try {
    const filePath = path.join(__dirname, 'data', filename);
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Ошибка чтения файла ${filename}:`, error);
    throw error;
  }
}

// =====================================================
// API Endpoints
// =====================================================

// Получить данные о ледовой обстановке
app.get('/api/ice', async (req, res) => {
  try {
    const iceData = await readDataFile('ice.geojson');
    res.json(iceData);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки данных о льде' });
  }
});

// Получить позиции судов (АИС данные)
app.get('/api/ships', async (req, res) => {
  try {
    const shipsData = await readDataFile('ships.json');
    res.json(shipsData);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки данных о судах' });
  }
});

// Получить рекомендуемые маршруты
app.get('/api/routes', async (req, res) => {
  try {
    const routesData = await readDataFile('routes.json');
    res.json(routesData);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки маршрутов' });
  }
});

// Получить данные о конкретном судне
app.get('/api/ships/:id', async (req, res) => {
  try {
    const shipsData = await readDataFile('ships.json');
    const ship = shipsData.ships.find(s => s.id === parseInt(req.params.id));
    if (ship) {
      res.json(ship);
    } else {
      res.status(404).json({ error: 'Судно не найдено' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки данных' });
  }
});

// Построить маршрут между двумя точками
app.post('/api/route/calculate', async (req, res) => {
  try {
    const { start, end } = req.body;
    
    if (!start || !end || !start.lat || !start.lon || !end.lat || !end.lon) {
      return res.status(400).json({ error: 'Некорректные параметры' });
    }

    // Простейший алгоритм построения маршрута
    const route = {
      safe: generateRoute(start, end, 'safe'),
      optimal: generateRoute(start, end, 'optimal'),
      distance: calculateDistance(start, end),
      estimatedTime: calculateTime(start, end)
    };

    res.json(route);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка расчёта маршрута' });
  }
});

// Получить метаинформацию о системе
app.get('/api/status', async (req, res) => {
  try {
    const statusData = await readDataFile('status.json');
    res.json(statusData);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки статуса' });
  }
});

// =====================================================
// Вспомогательные функции
// =====================================================

function generateRoute(start, end, type) {
  const points = [];
  const steps = 5;
  
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const lat = start.lat + (end.lat - start.lat) * ratio;
    const lon = start.lon + (end.lon - start.lon) * ratio;
    
    // Для безопасного маршрута добавляем отклонение
    const offset = type === 'safe' ? Math.sin(ratio * Math.PI) * 2 : 0;
    points.push([lon + offset, lat]);
  }
  
  return points;
}

function calculateDistance(start, end) {
  const R = 6371; // Радиус Земли в км
  const dLat = (end.lat - start.lat) * Math.PI / 180;
  const dLon = (end.lon - start.lon) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

function calculateTime(start, end) {
  const distance = calculateDistance(start, end);
  const averageSpeed = 10; // узлов
  const hours = Math.round(distance / (averageSpeed * 1.852));
  return hours;
}

// =====================================================
// Запуск сервера
// =====================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║      🌨️  Арктик Навигатор - Сервер запущен      ║
╠═══════════════════════════════════════════════════╣
║  Порт: ${PORT}                                      ║
║  URL:  http://localhost:${PORT}                     ║
║  API:  http://localhost:${PORT}/api                 ║
╚═══════════════════════════════════════════════════╝
  `);
  console.log('📡 Доступные API endpoints:');
  console.log('   GET  /api/ice');
  console.log('   GET  /api/ships');
  console.log('   GET  /api/ships/:id');
  console.log('   GET  /api/routes');
  console.log('   GET  /api/status');
  console.log('   POST /api/route/calculate');
  console.log('');
});