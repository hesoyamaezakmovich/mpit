import { useEffect, useRef } from 'react';
import L from 'leaflet';

const Map = ({ iceData, ships, iceLayer, shipsLayer, onMapReady }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);

  // Инициализация карты
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([76, 80], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);
    
    mapInstanceRef.current = map;
    if (onMapReady) onMapReady(map);

    return () => {
      if (mapInstanceRef.current) {
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
          const colors = {
            low: '#4ade80',
            medium: '#fbbf24',
            high: '#ef4444'
          };
          return {
            fillColor: colors[feature.properties.danger_level] || '#94a3b8',
            weight: 2,
            opacity: 0.7,
            color: 'white',
            fillOpacity: 0.4
          };
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          layer.bindPopup(`
            <div style="font-family: sans-serif;">
              <strong style="font-size: 14px;">${props.type}</strong><br/>
              <div style="margin-top: 8px; font-size: 12px;">
                <strong>Сплоченность:</strong> ${props.concentration}%<br/>
                <strong>Толщина:</strong> ${props.thickness_cm} см<br/>
                <strong>Опасность:</strong> ${props.danger_level}<br/>
                <strong>Дрейф:</strong> ${props.drift_speed} уз, ${props.drift_direction}°
              </div>
            </div>
          `);
        }
      });
      iceGeoJSON.addTo(map);
      layersRef.current.push(iceGeoJSON);
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
        
        const icon = L.divIcon({
          html: `<div style="background: ${colors[ship.type] || '#64748b'}; border-radius: 50%; width: 20px; height: 20px; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          className: 'ship-marker'
        });

        const marker = L.marker([ship.lat, ship.lon], { icon })
          .bindPopup(`
            <div style="font-family: sans-serif; min-width: 200px;">
              <strong style="font-size: 14px;">${ship.name}</strong><br/>
              <div style="margin-top: 8px; font-size: 12px;">
                <strong>MMSI:</strong> ${ship.mmsi}<br/>
                <strong>Позиция:</strong> ${ship.lat.toFixed(4)}°N, ${ship.lon.toFixed(4)}°E<br/>
                <strong>Скорость:</strong> ${ship.speed} узлов<br/>
                <strong>Курс:</strong> ${ship.course}°<br/>
                <strong>Тип:</strong> ${ship.type}<br/>
                <strong>Пункт назначения:</strong> ${ship.destination}<br/>
                <strong>Груз:</strong> ${ship.cargo}
              </div>
            </div>
          `)
          .addTo(map);
        
        layersRef.current.push(marker);
      });
    }
  }, [iceData, ships, iceLayer, shipsLayer]);

  return (
    <>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>
      
      {/* Статус системы */}
      <div className="status-badge">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }}></div>
          <span>Спутники: 4/6 активны</span>
        </div>
      </div>
    </>
  );
};

export default Map;