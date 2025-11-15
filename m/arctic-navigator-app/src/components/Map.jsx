import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import RouteBuilder from './RouteBuilder';

const Map = ({ iceData, ships, iceLayer, shipsLayer, routesLayer, onMapReady }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);
  const seaMapLayerRef = useRef(null);
  const graticuleRef = useRef(null);
  const nspRef = useRef(null);
  const [mouseCoords, setMouseCoords] = useState(null);
  const [mapView, setMapView] = useState({ zoom: 5, center: [76, 80] });
  const [calculatedRoutes, setCalculatedRoutes] = useState(null);

  // Инициализация карты
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [76, 80],
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
      minZoom: 3,
      maxZoom: 18
    });
    
    // Базовая карта OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
      maxZoom: 19
    }).addTo(map);

    // Статичная координатная сетка (фиксированные линии БЕЗ подписей)
    const graticule = L.layerGroup();
    
    // Определяем статичные интервалы для сетки
    const latLines = [65, 70, 75, 80, 85];
    const lngLines = [40, 60, 80, 100, 120, 140, 160, 180];
    
    // Рисуем линии широты БЕЗ подписей
    latLines.forEach(lat => {
      L.polyline(
        [[lat, -40], [lat, 220]], 
        {
          color: '#3b82f6',
          weight: 1,
          opacity: 0.3,
          interactive: false,
          className: 'graticule-line'
        }
      ).addTo(graticule);
    });
    
    // Рисуем линии долготы БЕЗ подписей
    lngLines.forEach(lng => {
      L.polyline(
        [[60, lng], [85, lng]], 
        {
          color: '#3b82f6',
          weight: 1,
          opacity: 0.3,
          interactive: false,
          className: 'graticule-line'
        }
      ).addTo(graticule);
    });
    
    graticule.addTo(map);
    graticuleRef.current = graticule;

    // Северный Морской Путь (СМП) - точный маршрут
    const nspRoute = [
      // Начало маршрута: Мурманск → Архангельск (кривая линия через Белое море)
      [69.00, 33.08],  // Мурманск
      [69.05, 33.06],  // Начало движения
      [69.08, 33.30],  // Начало поворота к югу
      [69.1616, 33.53],
      [69.32, 33.5389],
      [69.52, 34.57],
      [69.45, 38.58],
      [67.87, 42.05],  // Продолжение кривой
      [66.45, 41.37],  // Углубление в Белое море
      [65.75, 39.01],  // Продолжение кривой
      [65.65, 38.80],  // Финальный поворот
      [65.30, 39.30],  // Приближение к берегу
      [64.80, 39.80],  // Финальный участок
      [64.53, 40.51],  // Архангельск
      
      // Продолжение маршрута от Архангельска на восток
      [64.53, 40.51],  // Выход из Архангельска
      [64.84, 39.89],  // Направление на северо-восток
      [65.26, 39.52],  // Выход в Баренцево море
      [65.61, 39.39],  // Продолжение на восток
      [65.86, 39.94],  // Поворот на север
      [66.37, 41.48],  // Направление к Карским Воротам
      [66.96, 41.78],  // Приближение к Карским Воротам
      [68.15, 42.3620],  // Направление к Карским Воротам
      [68.82, 42.36],  // Приближение к Карским Воротам
      [69.88, 45.96],  // Направление к Карским Воротам
      [69.54, 50.67],  // Направление к Карским Воротам
      [69.43, 55.7607],  // Приближение к Карским Воротам
      [69.12, 56.16],  // Направление к Карским Воротам
      [68.27, 54.39],  // Направление к Карским Воротам
      [67.97, 53.90],  // Приближение к Карским Воротам

      // Карское море
      [70.00, 55.00],  
      [70.2080, 57.21],
      [70.42, 57.91],  // Карские Ворота
      [70.80, 60.00],
      [71.50, 63.00],
      [72.20, 66.00],
      [72.80, 68.00],
      [73.50, 70.00],  // Диксон
      [73.80, 73.00],
      [74.00, 76.00],
      [74.20, 78.50],
      [73.29, 80.31],
      
      // Район мыса Челюскин
      [75.00, 80.00],
      [75.62, 83.36],
      [77.30, 94.17],  // Проход севернее Таймыра
      [77.62, 98.58],
      [77.89, 100.87],
      [77.90, 102.98],
      [77.79, 105.00],
      [77.50, 110.00],
      
      // Море Лаптевых
      [77.00, 115.00],
      [76.50, 120.00],
      [76.00, 125.00],
      [75.50, 130.00],
      [75.50, 130.00],
      [75.00, 133.00],
      [72.88, 131.11],
      [71.54, 129.35],
      [72.89, 138.00],
      [73.08, 140.98], // Тикси
      
      // Восточно-Сибирское море
      [73.20, 145.00],
      [73.00, 150.00],
      [72.80, 155.00],
      [72.50, 160.00],
      [72.00, 165.00],
      [71.50, 168.00],
      [69.70, 170.25], // Певек
      
      // Чукотское море
      [70.75, 170.4854],
      [70.00, 176.00],
      [69.50, 179.00],
      [69.00, 182.00],
      [68.50, 185.00],
      [68.00, 188.00],
      [67.50, 190.00],
      [67.00, 192.00],
      [65.6961, 191.4668], // Берингов пролив
    ];

    const nspLayer = L.polyline(nspRoute, {
      color: '#00a0e3',
      weight: 5,
      opacity: 0.85,
      dashArray: '15, 8',
      className: 'nsp-route',
      smoothFactor: 1.5
    });

    // Создаем группу для СМП
    const nspGroup = L.layerGroup([nspLayer]);
    
    nspGroup.addTo(map);
    nspRef.current = nspGroup;

    // Добавляем popup для СМП
    nspLayer.bindPopup(`
      <div class="popup-title">🛤️ Северный Морской Путь</div>
      <div class="popup-info">
        <div class="popup-row">
          <span class="popup-label">Протяженность:</span>
          <span class="popup-value">~5600 км</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">Маршрут:</span>
          <span class="popup-value">Мурманск → Берингов пролив</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">Статус:</span>
          <span class="popup-value" style="color: #4ade80">Действующий</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">Сезон навигации:</span>
          <span class="popup-value">Июль - Ноябрь</span>
        </div>
      </div>
    `);

    // Добавляем ключевые точки СМП - основные порты
    const nspPoints = [
      { pos: [69.00, 33.08], name: '⚓ Мурманск', info: 'Начальная точка СМП, незамерзающий порт' },
      { pos: [64.53, 40.51], name: '⚓Архангельск', info: 'Наш город'},
      { pos: [67.64, 53.00], name: '⚓Нарьян-Мар', info: 'Порт в Баренцевом море' },
      { pos: [70.43, 57.92], name: '🌊 Карские Ворота', info: 'Пролив, вход в Карское море' },
      { pos: [73.30, 80.31], name: '⚓ Диксон', info: 'Порт в Карском море' },
      { pos: [71.38, 128.52], name: '⚓ Тикси', info: 'Порт в море Лаптевых' },
      { pos: [69.70, 170.25], name: '⚓ Певек', info: 'Самый северный город России' },
    ];

    nspPoints.forEach(point => {
      const pointIcon = L.divIcon({
        html: `<div class="nsp-point-marker">⚓</div>`,
        className: 'nsp-point',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker(point.pos, { icon: pointIcon })
        .bindPopup(`
          <div class="popup-title">${point.name}</div>
          <div class="popup-info">
            <div class="popup-row">
              <span class="popup-value">${point.info}</span>
            </div>
          </div>
        `)
        .addTo(nspGroup);
    });

    // Морская навигационная карта OpenSeaMap
    const seaMapLayer = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
      attribution: '',
      maxZoom: 18,
      opacity: 0.7
    }).addTo(map);
    
    seaMapLayerRef.current = seaMapLayer;

    // Ограничиваем область карты только Арктикой
    const arcticBounds = L.latLngBounds(
      L.latLng(60, -40),
      L.latLng(85, 220)
    );
    map.setMaxBounds(arcticBounds);
    map.fitBounds(L.latLngBounds(
      L.latLng(65, 40),
      L.latLng(85, 180)
    ));

    // Добавляем контроль зума в правый нижний угол
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    // Добавляем масштаб
    L.control.scale({
      position: 'bottomleft',
      imperial: false,
      metric: true
    }).addTo(map);

    // Отслеживание движения мыши для показа координат
    map.on('mousemove', (e) => {
      setMouseCoords({
        lat: e.latlng.lat.toFixed(4),
        lng: e.latlng.lng.toFixed(4)
      });
    });

    map.on('mouseout', () => {
      setMouseCoords(null);
    });

    // Отслеживание изменений вида карты
    const updateView = () => {
      const center = map.getCenter();
      setMapView({
        zoom: map.getZoom(),
        center: [center.lat.toFixed(2), center.lng.toFixed(2)]
      });
    };
    
    map.on('moveend zoomend', updateView);
    updateView();
    
    mapInstanceRef.current = map;
    if (onMapReady) onMapReady(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('moveend zoomend', updateView);
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [onMapReady]);

  // Обновление слоёв карты
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Очистка предыдущих слоев
    layersRef.current.forEach(layer => map.removeLayer(layer));
    layersRef.current = [];

    // Добавление ледовых зон
    if (iceLayer && iceData && iceData.features) {
      const iceGeoJSON = L.geoJSON(iceData, {
        style: (feature) => {
          const props = feature.properties;
          const concentration = props.concentration;
          
          let fillColor, opacity;
          
          if (props.danger_level === 'high') {
            fillColor = concentration > 90 ? '#dc2626' : '#ef4444';
            opacity = 0.65;
          } else if (props.danger_level === 'medium') {
            fillColor = concentration > 70 ? '#f59e0b' : '#fbbf24';
            opacity = 0.55;
          } else {
            fillColor = concentration > 50 ? '#06b6d4' : '#22d3ee';
            opacity = 0.45;
          }

          return {
            fillColor: fillColor,
            weight: 2,
            opacity: 0.9,
            color: '#ffffff',
            fillOpacity: opacity,
            className: 'ice-zone-layer'
          };
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          
          layer.bindPopup(`
            <div class="popup-title">❄️ ${props.type}</div>
            <div class="popup-info">
              <div class="popup-row">
                <span class="popup-label">Сплоченность:</span>
                <span class="popup-value">${props.concentration}%</span>
              </div>
              <div class="popup-row">
                <span class="popup-label">Толщина:</span>
                <span class="popup-value">${props.thickness_cm} см</span>
              </div>
              <div class="popup-row">
                <span class="popup-label">Возраст:</span>
                <span class="popup-value">${props.age === 'multi_year' ? 'Многолетний' : props.age === 'first_year' ? 'Однолетний' : 'Новый'}</span>
              </div>
              <div class="popup-row">
                <span class="popup-label">Опасность:</span>
                <span class="popup-value" style="color: ${props.danger_level === 'high' ? '#ef4444' : props.danger_level === 'medium' ? '#fbbf24' : '#4ade80'}">${props.danger_level === 'high' ? 'Высокая' : props.danger_level === 'medium' ? 'Средняя' : 'Низкая'}</span>
              </div>
              <div class="popup-row">
                <span class="popup-label">Дрейф:</span>
                <span class="popup-value">${props.drift_speed} уз, ${props.drift_direction}°</span>
              </div>
            </div>
          `);

          layer.on('mouseover', function () {
            this.setStyle({
              weight: 3,
              opacity: 1,
              fillOpacity: opacity + 0.15
            });
          });

          layer.on('mouseout', function () {
            iceGeoJSON.resetStyle(this);
          });
        }
      });
      iceGeoJSON.addTo(map);
      layersRef.current.push(iceGeoJSON);
    }

    // Добавление маршрутов судов БЕЗ стрелок
    if (routesLayer && ships && ships.length > 0) {
      ships.forEach(ship => {
        const colors = {
          icebreaker: '#3b82f6',
          tanker: '#8b5cf6',
          cargo: '#10b981',
          research: '#f59e0b'
        };
        
        const color = colors[ship.type] || '#64748b';
        
        // Генерируем траекторию
        const prevLat = ship.lat - (Math.cos(ship.course * Math.PI / 180) * 1.5);
        const prevLon = ship.lon - (Math.sin(ship.course * Math.PI / 180) * 1.5);
        const nextLat = ship.lat + (Math.cos(ship.course * Math.PI / 180) * 2);
        const nextLon = ship.lon + (Math.sin(ship.course * Math.PI / 180) * 2);
        
        // Пройденный путь
        const pastRoute = L.polyline(
          [[prevLat, prevLon], [ship.lat, ship.lon]], 
          {
            color: color,
            weight: 2,
            opacity: 0.4,
            dashArray: '5, 10',
            className: 'ship-past-route'
          }
        ).addTo(map);
        layersRef.current.push(pastRoute);
        
        // Планируемый маршрут (несколько промежуточных точек для плавности)
        const futureRoutePoints = [];
        const steps = 9; // Количество промежуточных точек
        for (let i = 0; i <= steps; i++) {
          const ratio = i / steps;
          const lat = ship.lat + (nextLat - ship.lat) * ratio;
          const lon = ship.lon + (nextLon - ship.lon) * ratio;
          futureRoutePoints.push([lat, lon]);
        }
        
        const futureRoute = L.polyline(
          futureRoutePoints, 
          {
            color: color,
            weight: 3,
            opacity: 0.7,
            className: 'ship-future-route'
          }
        ).addTo(map);
        
        layersRef.current.push(futureRoute);
      });
    }

    // Добавление судов
    if (shipsLayer && ships && ships.length > 0) {
      ships.forEach(ship => {
        const colors = {
          icebreaker: '#3b82f6',
          tanker: '#8b5cf6',
          cargo: '#10b981',
          research: '#f59e0b'
        };
        
        const color = colors[ship.type] || '#64748b';
        
        const shipIcon = L.icon({
          iconUrl: '/ship.png',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          className: 'ship-marker-custom'
        });

        const marker = L.marker([ship.lat, ship.lon], { icon: shipIcon })
          .bindPopup(`
            <div class="popup-title">🚢 ${ship.name}</div>
            <div class="popup-info">
              <div class="popup-row">
                <span class="popup-label">MMSI:</span>
                <span class="popup-value">${ship.mmsi}</span>
              </div>
              <div class="popup-row">
                <span class="popup-label">Тип:</span>
                <span class="popup-value" style="color: ${color}">${ship.type}</span>
              </div>
              <div class="popup-row">
                <span class="popup-label">Позиция:</span>
                <span class="popup-value">${ship.lat.toFixed(4)}°N, ${ship.lon.toFixed(4)}°E</span>
              </div>
              <div class="popup-row">
                <span class="popup-label">Скорость:</span>
                <span class="popup-value">${ship.speed} узлов</span>
              </div>
              <div class="popup-row">
                <span class="popup-label">Курс:</span>
                <span class="popup-value">${ship.course}°</span>
              </div>
              <div class="popup-row">
                <span class="popup-label">Пункт назначения:</span>
                <span class="popup-value">${ship.destination}</span>
              </div>
              <div class="popup-row">
                <span class="popup-label">Груз:</span>
                <span class="popup-value">${ship.cargo}</span>
              </div>
            </div>
          `)
          .addTo(map);
        
        layersRef.current.push(marker);
      });
    }
  }, [iceData, ships, iceLayer, shipsLayer, routesLayer]);

  const handleRouteCalculated = (routes) => {
    setCalculatedRoutes(routes);
  };

  return (
    <>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>
      
      {/* Координаты курсора */}
      {mouseCoords && (
        <div className="mouse-coords">
          📍 {mouseCoords.lat}°N, {mouseCoords.lng}°E
        </div>
      )}
      
      {/* Конструктор маршрутов */}
      {mapInstanceRef.current && (
        <RouteBuilder 
          map={mapInstanceRef.current} 
          iceData={iceData}
          onRouteCalculated={handleRouteCalculated}
        />
      )}
      
      {/* Информация о системе */}
      <div className="status-overlay">
        <div className="status-item">
          <span className="status-label">Zoom</span>
          <span className="status-value">{mapView.zoom}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Центр</span>
          <span className="status-value">{mapView.center[0]}°, {mapView.center[1]}°</span>
        </div>
        <div className="status-item">
          <span className="status-label">Спутники</span>
          <span className="status-value">
            <span className="status-indicator"></span>
            4/6
          </span>
        </div>
        {calculatedRoutes && (
          <div className="status-item">
            <span className="status-label">Маршрут</span>
            <span className="status-value" style={{ color: '#4ade80' }}>
              ✅ Построен
            </span>
          </div>
        )}
      </div>
    </>
  );
};

export default Map;