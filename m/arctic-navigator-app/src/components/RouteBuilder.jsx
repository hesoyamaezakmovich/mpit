import { useState, useRef, useEffect } from 'react';
import L from 'leaflet';

const RouteBuilder = ({ map, iceData, onRouteCalculated }) => {
  const [isActive, setIsActive] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [routes, setRoutes] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Используем ref для хранения актуальных значений точек
  const startPointRef = useRef(null);
  const endPointRef = useRef(null);
  
  // Синхронизируем ref с state
  useEffect(() => {
    startPointRef.current = startPoint;
  }, [startPoint]);
  
  useEffect(() => {
    endPointRef.current = endPoint;
  }, [endPoint]);

  const activateRouteMode = () => {
    setIsActive(true);
    setStartPoint(null);
    setEndPoint(null);
    setRoutes(null);
    startPointRef.current = null;
    endPointRef.current = null;
    
    // Меняем курсор
    map.getContainer().style.cursor = 'crosshair';
    
    // Добавляем обработчик клика
    map.on('click', handleMapClick);
  };

  const deactivateRouteMode = () => {
    setIsActive(false);
    setStartPoint(null);
    setEndPoint(null);
    setRoutes(null);
    startPointRef.current = null;
    endPointRef.current = null;
    map.getContainer().style.cursor = '';
    map.off('click', handleMapClick);
    
    // Очищаем маркеры и маршруты
    map.eachLayer((layer) => {
      if (layer.options && (layer.options.routeMarker || layer.options.calculatedRoute)) {
        map.removeLayer(layer);
      }
    });
  };

  const handleMapClick = (e) => {
    // Используем ref для проверки актуального состояния
    if (!startPointRef.current) {
      // Устанавливаем начальную точку
      const newStartPoint = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
      };
      setStartPoint(newStartPoint);
      startPointRef.current = newStartPoint;
      
      // Добавляем маркер
      const marker = L.marker([e.latlng.lat, e.latlng.lng], {
        icon: L.divIcon({
          html: `
            <div style="
              background: #22c55e;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
            ">🏁</div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          className: 'route-point-marker'
        }),
        routeMarker: true
      }).addTo(map);
      
      marker.bindPopup('<b>🏁 Начальная точка</b>').openPopup();
      
    } else if (!endPointRef.current) {
      // Устанавливаем конечную точку
      const newEndPoint = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
      };
      setEndPoint(newEndPoint);
      endPointRef.current = newEndPoint;
      
      // Добавляем маркер
      const marker = L.marker([e.latlng.lat, e.latlng.lng], {
        icon: L.divIcon({
          html: `
            <div style="
              background: #ef4444;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
            ">🎯</div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          className: 'route-point-marker'
        }),
        routeMarker: true
      }).addTo(map);
      
      marker.bindPopup('<b>🎯 Конечная точка</b>').openPopup();
      
      // Деактивируем режим выбора
      map.off('click', handleMapClick);
      map.getContainer().style.cursor = '';
      
      // Строим маршрут
      calculateRoute({
        lat: startPointRef.current.lat,
        lng: startPointRef.current.lng
      }, {
        lat: e.latlng.lat,
        lng: e.latlng.lng
      });
    }
  };

  const calculateRoute = async (start, end) => {
    setIsCalculating(true);
    
    try {
      // Вызываем API для построения маршрута с передачей данных о льде
      const response = await fetch('/api/route/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: { lat: start.lat, lon: start.lng },
          end: { lat: end.lat, lon: end.lng },
          iceData: iceData // Передаём данные о льде на сервер
        })
      });
      
      const routeData = await response.json();
      
      // Улучшаем маршруты с учетом ледовой обстановки
      const enhancedRoutes = enhanceRoutesWithIceData(routeData, start, end);
      
      setRoutes(enhancedRoutes);
      displayRoutes(enhancedRoutes);
      
      if (onRouteCalculated) {
        onRouteCalculated(enhancedRoutes);
      }
      
    } catch (error) {
      console.error('Ошибка построения маршрута:', error);
      alert('Ошибка построения маршрута. Попробуйте еще раз.');
    } finally {
      setIsCalculating(false);
    }
  };

  // Функция для расчета расстояния между точками маршрута
  const calculateRouteDistance = (routePoints) => {
    if (!routePoints || routePoints.length < 2) return 0;
    
    let totalDistance = 0;
    const R = 6371; // Радиус Земли в км
    
    for (let i = 0; i < routePoints.length - 1; i++) {
      const [lon1, lat1] = routePoints[i];
      const [lon2, lat2] = routePoints[i + 1];
      
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      totalDistance += R * c;
    }
    
    return Math.round(totalDistance);
  };

  // Функция для проверки, находится ли точка внутри полигона (алгоритм ray casting)
  const isPointInPolygon = (point, polygonCoords) => {
    const [x, y] = point;
    let inside = false;
    
    for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
      const [xi, yi] = polygonCoords[i];
      const [xj, yj] = polygonCoords[j];
      
      const intersect = ((yi > y) !== (yj > y)) && 
                       (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    return inside;
  };

  // Функция для анализа ледовой обстановки вдоль маршрута
  const analyzeIceAlongRoute = (routePoints) => {
    if (!iceData || !iceData.features || routePoints.length === 0) {
      return {
        maxDanger: 'low',
        icebreakerRequired: false,
        iceZones: [],
        avgConcentration: 0
      };
    }

    const iceZones = [];
    let totalConcentration = 0;
    let concentrationCount = 0;
    let maxDangerLevel = 'low';
    let requiresIcebreaker = false;

    // Проверяем каждую точку маршрута
    routePoints.forEach(([lon, lat]) => {
      iceData.features.forEach((feature) => {
        if (feature.geometry && feature.geometry.type === 'Polygon') {
          const polygonCoords = feature.geometry.coordinates[0].map(coord => [coord[0], coord[1]]);
          
          // Проверяем, находится ли точка внутри полигона льда
          if (isPointInPolygon([lon, lat], polygonCoords)) {
            const props = feature.properties;
            const danger = props.danger_level || 'low';
            
            // Обновляем максимальный уровень опасности
            if (danger === 'high' || (danger === 'medium' && maxDangerLevel === 'low')) {
              maxDangerLevel = danger;
            }
            
            if (danger === 'high' || (danger === 'medium' && props.concentration > 70)) {
              requiresIcebreaker = true;
            }
            
            if (!iceZones.find(z => z.id === props.id)) {
              iceZones.push({
                id: props.id,
                type: props.type,
                concentration: props.concentration,
                danger_level: danger,
                thickness: props.thickness_cm
              });
              
              totalConcentration += props.concentration;
              concentrationCount++;
            }
          }
        }
      });
    });

    const avgConcentration = concentrationCount > 0 
      ? Math.round(totalConcentration / concentrationCount) 
      : 0;

    return {
      maxDanger: maxDangerLevel,
      icebreakerRequired: requiresIcebreaker,
      iceZones,
      avgConcentration
    };
  };

  const enhanceRoutesWithIceData = (routeData, start, end) => {
    // Анализируем ледовую обстановку для каждого маршрута
    const safeRoutePoints = routeData.safe || [];
    const optimalRoutePoints = routeData.optimal || [];
    
    const safeIceAnalysis = analyzeIceAlongRoute(safeRoutePoints);
    const optimalIceAnalysis = analyzeIceAlongRoute(optimalRoutePoints);
    
    // Рассчитываем расстояние и время для каждого маршрута
    const safeDistance = calculateRouteDistance(safeRoutePoints);
    const optimalDistance = calculateRouteDistance(optimalRoutePoints);
    
    const averageSpeed = 10; // узлов
    const safeTime = Math.round(safeDistance / (averageSpeed * 1.852));
    const optimalTime = Math.round(optimalDistance / (averageSpeed * 1.852));
    
    const safeRoute = {
      safe: safeRoutePoints,
      type: 'safe',
      name: 'Безопасный маршрут',
      color: '#22c55e',
      description: safeIceAnalysis.iceZones.length === 0 
        ? 'Маршрут без ледовых препятствий' 
        : 'Обходит зоны тяжелого льда',
      icebreaker_required: safeIceAnalysis.icebreakerRequired,
      danger_level: safeIceAnalysis.maxDanger,
      distance: safeDistance,
      estimatedTime: safeTime,
      iceZones: safeIceAnalysis.iceZones,
      avgConcentration: safeIceAnalysis.avgConcentration
    };
    
    const optimalRoute = {
      optimal: optimalRoutePoints,
      type: 'optimal',
      name: 'Оптимальный маршрут',
      color: '#3b82f6',
      description: optimalIceAnalysis.iceZones.length === 0
        ? 'Кратчайший путь'
        : 'Кратчайший путь через разреженные льды',
      icebreaker_required: optimalIceAnalysis.icebreakerRequired,
      danger_level: optimalIceAnalysis.maxDanger,
      distance: optimalDistance,
      estimatedTime: optimalTime,
      iceZones: optimalIceAnalysis.iceZones,
      avgConcentration: optimalIceAnalysis.avgConcentration
    };
    
    return { safe: safeRoute, optimal: optimalRoute };
  };

  const displayRoutes = (routes) => {
    // Удаляем старые маршруты
    map.eachLayer((layer) => {
      if (layer.options && layer.options.calculatedRoute) {
        map.removeLayer(layer);
      }
    });
    
    const allBounds = [];
    
    // Безопасный маршрут
    if (routes.safe && routes.safe.safe && routes.safe.safe.length > 0) {
      const safePolyline = L.polyline(
        routes.safe.safe.map(p => [p[1], p[0]]),
        {
          color: '#22c55e',
          weight: 5,
          opacity: 0.8,
          dashArray: '10, 5',
          calculatedRoute: true,
          routeType: 'safe'
        }
      ).addTo(map);
      
      const dangerColor = routes.safe.danger_level === 'high' ? '#ef4444' 
        : routes.safe.danger_level === 'medium' ? '#fbbf24' 
        : '#4ade80';
      const dangerText = routes.safe.danger_level === 'high' ? 'Высокая'
        : routes.safe.danger_level === 'medium' ? 'Средняя'
        : 'Низкая';
      
      safePolyline.bindPopup(`
        <div class="popup-title">🛡️ Безопасный маршрут</div>
        <div class="popup-info">
          <div class="popup-row">
            <span class="popup-label">Расстояние:</span>
            <span class="popup-value">${routes.safe.distance} км</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Время:</span>
            <span class="popup-value">${routes.safe.estimatedTime} ч</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Опасность:</span>
            <span class="popup-value" style="color: ${dangerColor}">${dangerText}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Ледокол:</span>
            <span class="popup-value">${routes.safe.icebreaker_required ? 'Требуется' : 'Не требуется'}</span>
          </div>
          ${routes.safe.iceZones.length > 0 ? `
          <div class="popup-row">
            <span class="popup-label">Ледовых зон:</span>
            <span class="popup-value">${routes.safe.iceZones.length}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Сплоченность:</span>
            <span class="popup-value">${routes.safe.avgConcentration}%</span>
          </div>
          ` : ''}
        </div>
      `);
      
      allBounds.push(safePolyline.getBounds());
    }
    
    // Оптимальный маршрут
    if (routes.optimal && routes.optimal.optimal && routes.optimal.optimal.length > 0) {
      const optimalPolyline = L.polyline(
        routes.optimal.optimal.map(p => [p[1], p[0]]),
        {
          color: '#3b82f6',
          weight: 5,
          opacity: 0.8,
          calculatedRoute: true,
          routeType: 'optimal'
        }
      ).addTo(map);
      
      const dangerColor = routes.optimal.danger_level === 'high' ? '#ef4444' 
        : routes.optimal.danger_level === 'medium' ? '#fbbf24' 
        : '#4ade80';
      const dangerText = routes.optimal.danger_level === 'high' ? 'Высокая'
        : routes.optimal.danger_level === 'medium' ? 'Средняя'
        : 'Низкая';
      
      optimalPolyline.bindPopup(`
        <div class="popup-title">⚡ Оптимальный маршрут</div>
        <div class="popup-info">
          <div class="popup-row">
            <span class="popup-label">Расстояние:</span>
            <span class="popup-value">${routes.optimal.distance} км</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Время:</span>
            <span class="popup-value">${routes.optimal.estimatedTime} ч</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Опасность:</span>
            <span class="popup-value" style="color: ${dangerColor}">${dangerText}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Ледокол:</span>
            <span class="popup-value">${routes.optimal.icebreaker_required ? 'Требуется' : 'Не требуется'}</span>
          </div>
          ${routes.optimal.iceZones.length > 0 ? `
          <div class="popup-row">
            <span class="popup-label">Ледовых зон:</span>
            <span class="popup-value">${routes.optimal.iceZones.length}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Сплоченность:</span>
            <span class="popup-value">${routes.optimal.avgConcentration}%</span>
          </div>
          ` : ''}
        </div>
      `);
      
      allBounds.push(optimalPolyline.getBounds());
    }
    
    // Центрируем карту на всех маршрутах
    if (allBounds.length > 0) {
      const group = new L.featureGroup(allBounds.map(b => L.rectangle(b)));
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  };

  const clearRoute = () => {
    setStartPoint(null);
    setEndPoint(null);
    setRoutes(null);
    startPointRef.current = null;
    endPointRef.current = null;
    
    // Удаляем все маркеры и маршруты
    map.eachLayer((layer) => {
      if (layer.options && (layer.options.routeMarker || layer.options.calculatedRoute)) {
        map.removeLayer(layer);
      }
    });
    
    // Реактивируем режим выбора точек
    if (isActive) {
      map.getContainer().style.cursor = 'crosshair';
      map.on('click', handleMapClick);
    }
  };

  return (
    <div className="route-builder-panel">
      {!isActive ? (
        <button 
          className="btn-route-builder"
          onClick={activateRouteMode}
          title="Построить маршрут на карте"
        >
          <span>🗺️</span>
          <span>Построить маршрут</span>
        </button>
      ) : (
        <div className="route-builder-active">
          <div className="route-builder-header">
            <span className="route-builder-title">
              {!startPoint && '🏁 Выберите начальную точку'}
              {startPoint && !endPoint && '🎯 Выберите конечную точку'}
              {startPoint && endPoint && isCalculating && '⏳ Построение маршрута...'}
              {startPoint && endPoint && !isCalculating && routes && '✅ Маршрут построен'}
            </span>
          </div>
          
          {routes && (
            <div className="route-results">
              <div className="route-result-card" style={{ borderLeft: '4px solid #22c55e' }}>
                <div className="route-result-header">
                  <span>🛡️ Безопасный</span>
                  <span className="route-result-badge" style={{ background: '#22c55e' }}>
                    Рекомендуется
                  </span>
                </div>
                <div className="route-result-stats">
                  <span>📏 {routes.safe?.distance || 0} км</span>
                  <span>⏱️ {routes.safe?.estimatedTime || 0} ч</span>
                </div>
              </div>
              
              <div className="route-result-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                <div className="route-result-header">
                  <span>⚡ Оптимальный</span>
                  <span className="route-result-badge" style={{ background: '#3b82f6' }}>
                    Быстрее
                  </span>
                </div>
                <div className="route-result-stats">
                  <span>📏 {routes.optimal?.distance || 0} км</span>
                  <span>⏱️ {routes.optimal?.estimatedTime || 0} ч</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="route-builder-actions">
            <button 
              className="btn-route-action btn-clear"
              onClick={clearRoute}
            >
              🔄 Очистить
            </button>
            <button 
              className="btn-route-action btn-close"
              onClick={deactivateRouteMode}
            >
              ✕ Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteBuilder;