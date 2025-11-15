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
    const { start, end, iceData } = req.body;
    
    if (!start || !end || !start.lat || !start.lon || !end.lat || !end.lon) {
      return res.status(400).json({ error: 'Некорректные параметры' });
    }

    // Загружаем данные о льде, если не переданы
    let iceDataToUse = iceData;
    if (!iceDataToUse) {
      try {
        iceDataToUse = await readDataFile('ice.geojson');
      } catch (error) {
        console.warn('Не удалось загрузить данные о льде, используем упрощённый алгоритм');
      }
    }

    // Улучшенный алгоритм построения маршрута с учётом льда и суши
    const route = {
      safe: generateRouteWithIce(start, end, 'safe', iceDataToUse),
      optimal: generateRouteWithIce(start, end, 'optimal', iceDataToUse),
      distance: calculateDistance(start, end),
      estimatedTime: calculateTime(start, end)
    };

    res.json(route);
  } catch (error) {
    console.error('Ошибка расчёта маршрута:', error);
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

// Проверка, находится ли точка на суше (упрощённая для Арктики)
function isOnLand(lat, lon) {
  // Приблизительные границы основных островов и суши в Арктике
  // Это упрощённая проверка, в реальности нужна более точная карта
  const landZones = [
    // Новая Земля
    { minLat: 70.5, maxLat: 77.0, minLon: 50.0, maxLon: 69.0 },
    // Северная Земля
    { minLat: 78.0, maxLat: 81.5, minLon: 90.0, maxLon: 110.0 },
    // Остров Врангеля
    { minLat: 70.5, maxLat: 71.5, minLon: 178.0, maxLon: -180.0 },
    { minLat: 70.5, maxLat: 71.5, minLon: 180.0, maxLon: -179.0 },
    // Материковая часть (приблизительно)
    { minLat: 65.0, maxLat: 75.0, minLon: 30.0, maxLon: 60.0 },
    { minLat: 65.0, maxLat: 75.0, minLon: 100.0, maxLon: 180.0 },
    { minLat: 65.0, maxLat: 75.0, minLon: -180.0, maxLon: -150.0 },
  ];
  
  for (const zone of landZones) {
    if (lat >= zone.minLat && lat <= zone.maxLat) {
      if (zone.minLon > zone.maxLon) {
        // Пересекает линию перемены дат
        if ((lon >= zone.minLon && lon <= 180) || (lon >= -180 && lon <= zone.maxLon)) {
          return true;
        }
      } else {
        if (lon >= zone.minLon && lon <= zone.maxLon) {
          return true;
        }
      }
    }
  }
  
  return false;
}

// Проверка, находится ли точка в зоне тяжёлого льда
function isInHeavyIce(lat, lon, iceData) {
  if (!iceData || !iceData.features) return false;
  
  for (const feature of iceData.features) {
    if (feature.geometry && feature.geometry.type === 'Polygon') {
      const props = feature.properties || {};
      const danger = props.danger_level || 'low';
      const concentration = props.concentration || 0;
      
      // Проверяем только зоны с высокой опасностью или высокой концентрацией
      if (danger === 'high' || concentration > 80) {
        if (isPointInIceZone(lat, lon, feature.geometry.coordinates[0])) {
          return true;
        }
      }
    }
  }
  
  return false;
}

// Проверка, находится ли точка в зоне льда
function isPointInIceZone(lat, lon, polygonCoords) {
  let inside = false;
  
  for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
    const [xi, yi] = polygonCoords[i];
    const [xj, yj] = polygonCoords[j];
    
    const intersect = ((yi > lat) !== (yj > lat)) && 
                     (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

// Получить вес точки для оптимального маршрута (меньше = лучше)
function getPointWeight(lat, lon, iceData) {
  if (!iceData || !iceData.features) return 1;
  
  let weight = 1;
  
  for (const feature of iceData.features) {
    if (feature.geometry && feature.geometry.type === 'Polygon') {
      if (isPointInIceZone(lat, lon, feature.geometry.coordinates[0])) {
        const props = feature.properties || {};
        const danger = props.danger_level || 'low';
        const concentration = props.concentration || 0;
        
        // Увеличиваем вес в зависимости от опасности и концентрации
        if (danger === 'high') {
          weight += 5;
        } else if (danger === 'medium') {
          weight += 2;
        } else {
          weight += 0.5;
        }
        
        weight += concentration / 20; // Чем выше концентрация, тем больше вес
      }
    }
  }
  
  return weight;
}

// Генерация маршрута с учётом льда и суши
function generateRouteWithIce(start, end, type, iceData) {
  const points = [];
  const steps = 20; // Больше точек для более плавного маршрута
  
  // Начальная точка
  points.push([start.lon, start.lat]);
  
  for (let i = 1; i < steps; i++) {
    const ratio = i / steps;
    let lat = start.lat + (end.lat - start.lat) * ratio;
    let lon = start.lon + (end.lon - start.lon) * ratio;
    
    // Базовое отклонение для обхода суши
    let offsetLat = 0;
    let offsetLon = 0;
    
    // Проверяем и обходим сушу
    if (isOnLand(lat, lon)) {
      // Отклоняемся в сторону моря
      const bearing = Math.atan2(end.lon - start.lon, end.lat - start.lat);
      const perpendicular = bearing + Math.PI / 2;
      
      // Пробуем разные направления
      for (let attempt = 0; attempt < 8; attempt++) {
        const angle = perpendicular + (attempt * Math.PI / 4);
        const testLat = lat + Math.cos(angle) * 0.5;
        const testLon = lon + Math.sin(angle) * 0.5;
        
        if (!isOnLand(testLat, testLon)) {
          offsetLat = Math.cos(angle) * 0.5;
          offsetLon = Math.sin(angle) * 0.5;
          break;
        }
      }
    }
    
    // Для безопасного маршрута обходим тяжёлый лёд
    if (type === 'safe') {
      if (isInHeavyIce(lat + offsetLat, lon + offsetLon, iceData)) {
        // Отклоняемся от зоны тяжёлого льда
        const bearing = Math.atan2(end.lon - start.lon, end.lat - start.lat);
        const perpendicular = bearing + Math.PI / 2;
        
        // Пробуем обойти зону
        for (let attempt = 0; attempt < 8; attempt++) {
          const angle = perpendicular + (attempt * Math.PI / 4);
          const testLat = lat + Math.cos(angle) * 1.0;
          const testLon = lon + Math.sin(angle) * 1.0;
          
          if (!isOnLand(testLat, testLon) && !isInHeavyIce(testLat, testLon, iceData)) {
            offsetLat = Math.cos(angle) * 1.0;
            offsetLon = Math.sin(angle) * 1.0;
            break;
          }
        }
      }
    }
    
    // Для оптимального маршрута выбираем путь с минимальным весом
    if (type === 'optimal') {
      let bestLat = lat;
      let bestLon = lon;
      let bestWeight = getPointWeight(lat, lon, iceData);
      
      // Пробуем небольшие отклонения для оптимизации
      for (let dx = -0.3; dx <= 0.3; dx += 0.3) {
        for (let dy = -0.3; dy <= 0.3; dy += 0.3) {
          if (dx === 0 && dy === 0) continue;
          
          const testLat = lat + dy;
          const testLon = lon + dx;
          
          if (!isOnLand(testLat, testLon)) {
            const weight = getPointWeight(testLat, testLon, iceData);
            if (weight < bestWeight) {
              bestWeight = weight;
              bestLat = testLat;
              bestLon = testLon;
            }
          }
        }
      }
      
      lat = bestLat;
      lon = bestLon;
    }
    
    // Применяем смещения
    lat += offsetLat;
    lon += offsetLon;
    
    // Убеждаемся, что точка не на суше
    if (!isOnLand(lat, lon)) {
      points.push([lon, lat]);
    }
  }
  
  // Конечная точка
  points.push([end.lon, end.lat]);
  
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