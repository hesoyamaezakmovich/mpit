import express from 'express';
import cors from 'cors';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

async function readDataFile(filename) {
  try {
    const filePath = join(__dirname, '..', 'data', filename);
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Ошибка чтения файла ${filename}:`, error);
    throw error;
  }
}

app.get('/api/ice', async (req, res) => {
  try {
    const iceData = await readDataFile('ice.geojson');
    res.json(iceData);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки данных о льде' });
  }
});

app.get('/api/ships', async (req, res) => {
  try {
    const shipsData = await readDataFile('ships.json');
    res.json(shipsData);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки данных о судах' });
  }
});

app.get('/api/routes', async (req, res) => {
  try {
    const routesData = await readDataFile('routes.json');
    res.json(routesData);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки маршрутов' });
  }
});

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

app.get('/api/status', async (req, res) => {
  try {
    const statusData = await readDataFile('status.json');
    res.json(statusData);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки статуса' });
  }
});

export default app;