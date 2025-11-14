import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

const Map = ({ iceData, ships, iceLayer, shipsLayer, routesLayer, onMapReady }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);
  const seaMapLayerRef = useRef(null);
  const graticuleRef = useRef(null);
  const [mouseCoords, setMouseCoords] = useState(null);
  const [mapView, setMapView] = useState({ zoom: 5, center: [76, 80] });

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

    // Простая координатная сетка
    const graticule = L.layerGroup();
    
    const updateGraticule = () => {
      graticule.clearLayers();
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      
      // Интервал в зависимости от зума
      let interval = 10;
      if (zoom >= 5 && zoom < 7) interval = 5;
      if (zoom >= 7 && zoom < 10) interval = 2;
      if (zoom >= 10) interval = 1;
      
      // Линии широты
      for (let lat = Math.floor(bounds.getSouth() / interval) * interval; 
           lat <= bounds.getNorth(); 
           lat += interval) {
        L.polyline(
          [[lat, bounds.getWest()], [lat, bounds.getEast()]], 
          {
            color: '#3b82f6',
            weight: 1,
            opacity: 0.5,
            interactive: false
          }
        ).addTo(graticule);
      }
      
      // Линии долготы
      for (let lng = Math.floor(bounds.getWest() / interval) * interval; 
           lng <= bounds.getEast(); 
           lng += interval) {
        L.polyline(
          [[bounds.getSouth(), lng], [bounds.getNorth(), lng]], 
          {
            color: '#3b82f6',
            weight: 1,
            opacity: 0.5,
            interactive: false
          }
        ).addTo(graticule);
      }
    };
    
    graticule.addTo(map);
    graticuleRef.current = graticule;
    updateGraticule();
    
    map.on('moveend zoomend', updateGraticule);

    // Морская навигационная карта OpenSeaMap
    const seaMapLayer = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
      attribution: '',
      maxZoom: 18,
      opacity: 0.7
    }).addTo(map);
    
    seaMapLayerRef.current = seaMapLayer;

    // Ограничиваем область карты только Арктикой
    const arcticBounds = L.latLngBounds(
      L.latLng(65, 40),
      L.latLng(85, 180)
    );
    map.setMaxBounds(arcticBounds);
    map.fitBounds(arcticBounds);

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
        mapInstanceRef.current.off('moveend zoomend', updateGraticule);
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

    // Добавление маршрутов судов
    if (routesLayer && ships && ships.length > 0) {
      ships.forEach(ship => {
        const colors = {
          icebreaker: '#3b82f6',
          tanker: '#8b5cf6',
          cargo: '#10b981',
          research: '#f59e0b'
        };
        
        const color = colors[ship.type] || '#64748b';
        
        // Генерируем траекторию (от прошлой позиции к текущей и к пункту назначения)
        // Симулируем прошлые позиции
        const prevLat = ship.lat - (Math.cos(ship.course * Math.PI / 180) * 1.5);
        const prevLon = ship.lon - (Math.sin(ship.course * Math.PI / 180) * 1.5);
        
        // Симулируем будущую позицию (приблизительно)
        const nextLat = ship.lat + (Math.cos(ship.course * Math.PI / 180) * 2);
        const nextLon = ship.lon + (Math.sin(ship.course * Math.PI / 180) * 2);
        
        // Пройденный путь (пунктирная линия)
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
        
        // Планируемый маршрут (сплошная линия)
        const futureRoute = L.polyline(
          [[ship.lat, ship.lon], [nextLat, nextLon]], 
          {
            color: color,
            weight: 3,
            opacity: 0.7,
            className: 'ship-future-route'
          }
        ).addTo(map);
        
        // Стрелка направления
        const decorator = L.polylineDecorator(futureRoute, {
          patterns: [
            {
              offset: '50%',
              repeat: 0,
              symbol: L.Symbol.arrowHead({
                pixelSize: 12,
                polygon: false,
                pathOptions: {
                  stroke: true,
                  weight: 3,
                  color: color,
                  opacity: 0.7
                }
              })
            }
          ]
        }).addTo(map);
        
        layersRef.current.push(futureRoute);
        layersRef.current.push(decorator);
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

        const icons = {
          icebreaker: '⚓',
          tanker: '🛢️',
          cargo: '📦',
          research: '🔬'
        };
        
        const color = colors[ship.type] || '#64748b';
        const icon = icons[ship.type] || '🚢';
        
        const shipIcon = L.divIcon({
          html: `
            <div style="position: relative;">
              <div style="
                position: absolute;
                width: 40px;
                height: 40px;
                background: ${color};
                border-radius: 50%;
                opacity: 0.3;
                animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
              "></div>
              <div style="
                position: relative;
                background: ${color};
                border-radius: 50%;
                width: 32px;
                height: 32px;
                border: 3px solid white;
                box-shadow: 0 4px 16px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
              ">${icon}</div>
            </div>
            <style>
              @keyframes ping {
                75%, 100% {
                  transform: scale(1.5);
                  opacity: 0;
                }
              }
            </style>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
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

  return (
    <>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>
      
      {/* Координаты курсора */}
      {mouseCoords && (
        <div className="mouse-coords">
          📍 {mouseCoords.lat}°N, {mouseCoords.lng}°E
        </div>
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
      </div>
    </>
  );
};

export default Map;