import { useState, useEffect } from 'react';

const Sidebar = ({
  onTiffUpload,
  onCalculateRoute,
  onUpload, 
  ships, 
  iceLayer, 
  shipsLayer,
  routesLayer,
  onIceLayerChange, 
  onShipsLayerChange,
  onRoutesLayerChange,
  onRefresh,
  onShipClick
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);

  const shipColors = {
    icebreaker: '#3b82f6',
    tanker: '#8b5cf6',
    cargo: '#10b981',
    research: '#f59e0b'
  };

  const shipLabels = {
    icebreaker: 'Ледокол',
    tanker: 'Танкер',
    cargo: 'Грузовой',
    research: 'Исследовательский'
  };

  useEffect(() => {
    if (showAnalytics) {
      loadAnalyticsData();
    }
  }, [ships, showAnalytics]);

  const loadAnalyticsData = async () => {
    try {
      const [iceRes, statusRes] = await Promise.all([
        fetch('/api/ice'),
        fetch('/api/status')
      ]);
      
      const ice = await iceRes.json();
      const status = await statusRes.json();
      
      // Подсчет статистики по судам
      const shipsByType = ships.reduce((acc, ship) => {
        acc[ship.type] = (acc[ship.type] || 0) + 1;
        return acc;
      }, {});

      const avgSpeed = ships.length > 0 
        ? (ships.reduce((sum, s) => sum + s.speed, 0) / ships.length).toFixed(1)
        : 0;

      const maxSpeed = ships.length > 0 
        ? Math.max(...ships.map(s => s.speed))
        : 0;

      // Статистика по льду
      const iceZones = ice.features || [];
      const dangerZones = {
        high: iceZones.filter(z => z.properties.danger_level === 'high').length,
        medium: iceZones.filter(z => z.properties.danger_level === 'medium').length,
        low: iceZones.filter(z => z.properties.danger_level === 'low').length
      };

      const avgConcentration = iceZones.length > 0
        ? (iceZones.reduce((sum, z) => sum + z.properties.concentration, 0) / iceZones.length).toFixed(0)
        : 0;

      const avgThickness = iceZones.length > 0
        ? (iceZones.reduce((sum, z) => sum + z.properties.thickness_cm, 0) / iceZones.length).toFixed(0)
        : 0;

      setAnalyticsData({
        shipsByType,
        avgSpeed,
        maxSpeed,
        dangerZones,
        avgConcentration,
        avgThickness,
        totalIceZones: iceZones.length,
        satellites: status.satellites,
        coverage: status.data_coverage
      });
    } catch (err) {
      console.error('Ошибка загрузки аналитики:', err);
    }
  };

  const getPercentage = (value, total) => {
    return total > 0 ? ((value / total) * 100).toFixed(0) : 0;
  };

  return (
    <>
      {/* Кнопка гамбургер */}
      <button 
        className="hamburger-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        <div className={`hamburger-icon ${isOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {/* Боковая панель */}
      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="app-header">
          <div className="app-header-content">
            <img 
              src="/logo.png" 
              alt="OKAK Navigation Logo" 
              className="app-logo"
            />
            <div className="app-header-text">
              <h1 className="app-title">
                OKAK-Navigation
              </h1>
              <div className="app-subtitle">
                Орбитальный комплекс арктического контроля
              </div>
            </div>
          </div>
        </div>
        
        <div className="sidebar-content">

          {/* загрузка geojson */}
           <div style={{marginBottom: '10px'}}>
            <label className="btn-secondary" style={{display: 'block', textAlign: 'center'}}>
              📁 Загрузить разметку льда
              <input 
                type="file" 
                accept=".geojson"
                onChange={(e) => onUpload(e)}  // ← ИЗМЕНИ ТУТ
                style={{display: 'none'}}
              />
            </label>
          </div>

          <div style={{marginBottom: '10px'}}>
            <label className="btn-secondary" style={{display: 'block', textAlign: 'center'}}>
              🛰️ Загрузить спутниковый снимок (TIFF)
              <input 
                type="file" 
                accept=".tif,.tiff"
                onChange={(e) => onTiffUpload(e)}
                style={{display: 'none'}}
              />
            </label>
          </div>

          <button 
            className="btn-primary" 
            onClick={onCalculateRoute}
            style={{marginBottom: '10px', width: '100%'}}
          >
            🗺️ Построить маршрут
          </button>


          {/* Кнопка аналитики */}
          <button 
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="btn-analytics"
          >
            <span>{showAnalytics ? '📊' : '📈'}</span>
            <span>{showAnalytics ? 'Скрыть аналитику' : 'Показать аналитику'}</span>
          </button>

          {/* Панель аналитики */}
          {showAnalytics && analyticsData && (
            <div className="analytics-panel">
              <div className="analytics-header">
                📊 Аналитический модуль
              </div>

              {/* Статистика по судам */}
              <div className="analytics-section">
                <div className="analytics-section-title">🚢 Суда в зоне</div>
                <div className="analytics-grid">
                  <div className="analytics-card">
                    <div className="analytics-card-label">Всего судов</div>
                    <div className="analytics-card-value">{ships.length}</div>
                  </div>
                  <div className="analytics-card">
                    <div className="analytics-card-label">Ср. скорость</div>
                    <div className="analytics-card-value">{analyticsData.avgSpeed} <span className="unit">уз</span></div>
                  </div>
                  <div className="analytics-card">
                    <div className="analytics-card-label">Макс. скорость</div>
                    <div className="analytics-card-value">{analyticsData.maxSpeed} <span className="unit">уз</span></div>
                  </div>
                </div>

                <div className="analytics-breakdown">
                  <div className="breakdown-title">По типам:</div>
                  {Object.entries(analyticsData.shipsByType).map(([type, count]) => (
                    <div key={type} className="breakdown-item">
                      <div className="breakdown-info">
                        <span className="breakdown-label">{shipLabels[type]}</span>
                        <span className="breakdown-value">{count}</span>
                      </div>
                      <div className="breakdown-bar">
                        <div 
                          className="breakdown-bar-fill"
                          style={{ 
                            width: `${getPercentage(count, ships.length)}%`,
                            background: shipColors[type]
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Статистика по льду */}
              <div className="analytics-section">
                <div className="analytics-section-title">❄️ Ледовая обстановка</div>
                <div className="analytics-grid">
                  <div className="analytics-card">
                    <div className="analytics-card-label">Ледовых зон</div>
                    <div className="analytics-card-value">{analyticsData.totalIceZones}</div>
                  </div>
                  <div className="analytics-card">
                    <div className="analytics-card-label">Ср. сплоченность</div>
                    <div className="analytics-card-value">{analyticsData.avgConcentration}<span className="unit">%</span></div>
                  </div>
                  <div className="analytics-card">
                    <div className="analytics-card-label">Ср. толщина</div>
                    <div className="analytics-card-value">{analyticsData.avgThickness}<span className="unit">см</span></div>
                  </div>
                </div>

                <div className="analytics-breakdown">
                  <div className="breakdown-title">Уровни опасности:</div>
                  <div className="breakdown-item">
                    <div className="breakdown-info">
                      <span className="breakdown-label">⚠️ Высокий</span>
                      <span className="breakdown-value">{analyticsData.dangerZones.high}</span>
                    </div>
                    <div className="breakdown-bar">
                      <div 
                        className="breakdown-bar-fill"
                        style={{ 
                          width: `${getPercentage(analyticsData.dangerZones.high, analyticsData.totalIceZones)}%`,
                          background: '#ef4444'
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="breakdown-item">
                    <div className="breakdown-info">
                      <span className="breakdown-label">⚡ Средний</span>
                      <span className="breakdown-value">{analyticsData.dangerZones.medium}</span>
                    </div>
                    <div className="breakdown-bar">
                      <div 
                        className="breakdown-bar-fill"
                        style={{ 
                          width: `${getPercentage(analyticsData.dangerZones.medium, analyticsData.totalIceZones)}%`,
                          background: '#f59e0b'
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="breakdown-item">
                    <div className="breakdown-info">
                      <span className="breakdown-label">✅ Низкий</span>
                      <span className="breakdown-value">{analyticsData.dangerZones.low}</span>
                    </div>
                    <div className="breakdown-bar">
                      <div 
                        className="breakdown-bar-fill"
                        style={{ 
                          width: `${getPercentage(analyticsData.dangerZones.low, analyticsData.totalIceZones)}%`,
                          background: '#4ade80'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Статистика по спутникам */}
              <div className="analytics-section">
                <div className="analytics-section-title">🛰️ Спутниковая сеть</div>
                <div className="analytics-grid">
                  <div className="analytics-card">
                    <div className="analytics-card-label">Активных</div>
                    <div className="analytics-card-value" style={{ color: '#4ade80' }}>
                      {analyticsData.satellites.active}/{analyticsData.satellites.total}
                    </div>
                  </div>
                  <div className="analytics-card">
                    <div className="analytics-card-label">Покрытие</div>
                    <div className="analytics-card-value">{analyticsData.coverage.coverage_percentage}<span className="unit">%</span></div>
                  </div>
                  <div className="analytics-card">
                    <div className="analytics-card-label">Задержка</div>
                    <div className="analytics-card-value">{analyticsData.coverage.average_latency_minutes}<span className="unit">мин</span></div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Контроль слоёв */}
          <div className="panel">
            <div className="panel-header">
              🗺️ Слои карты
            </div>
            <div className="layer-controls">
              <div 
                className={`layer-toggle ${iceLayer ? 'active' : ''}`}
                onClick={() => onIceLayerChange(!iceLayer)}
              >
                <div className="layer-info">
                  <span className="layer-icon">❄️</span>
                  <span className="layer-label">Ледовая обстановка</span>
                </div>
                <div className={`toggle-switch ${iceLayer ? 'active' : ''}`}>
                  <div className="toggle-slider"></div>
                </div>
              </div>

              <div 
                className={`layer-toggle ${shipsLayer ? 'active' : ''}`}
                onClick={() => onShipsLayerChange(!shipsLayer)}
              >
                <div className="layer-info">
                  <span className="layer-icon">🚢</span>
                  <span className="layer-label">Суда (AIS)</span>
                </div>
                <div className={`toggle-switch ${shipsLayer ? 'active' : ''}`}>
                  <div className="toggle-slider"></div>
                </div>
              </div>

              <div 
                className={`layer-toggle ${routesLayer ? 'active' : ''}`}
                onClick={() => onRoutesLayerChange(!routesLayer)}
              >
                <div className="layer-info">
                  <span className="layer-icon">🛤️</span>
                  <span className="layer-label">Маршруты судов</span>
                </div>
                <div className={`toggle-switch ${routesLayer ? 'active' : ''}`}>
                  <div className="toggle-slider"></div>
                </div>
              </div>
            </div>
            
            <button 
              onClick={onRefresh}
              className="btn-primary"
              style={{ marginTop: '12px' }}
            >
              <span>🔄</span>
              <span>Обновить данные</span>
            </button>
          </div>

          {/* Список судов */}
          <div className="panel">
            <div className="panel-header">
              🚢 Суда в зоне ({ships.length})
            </div>
            <div className="ships-list">
              {ships.map(ship => (
                <div 
                  key={ship.id}
                  className={`ship-card ship-${ship.type}`}
                  style={{ '--ship-color': shipColors[ship.type] }}
                  onClick={() => onShipClick(ship)}
                >
                  <div className="ship-name">
                    <span>{ship.name}</span>
                    <span 
                      className="ship-type-badge"
                      style={{ 
                        background: shipColors[ship.type],
                        color: 'white'
                      }}
                    >
                      {shipLabels[ship.type]}
                    </span>
                  </div>
                  <div className="ship-details">
                    <div className="ship-detail">
                      <span>📍</span>
                      <span>{ship.lat.toFixed(2)}°N, {ship.lon.toFixed(2)}°E</span>
                    </div>
                    <div className="ship-detail">
                      <span>⚡</span>
                      <span>{ship.speed} уз</span>
                      <span>|</span>
                      <span>🧭</span>
                      <span>{ship.course}°</span>
                    </div>
                    <div className="ship-detail">
                      <span>🎯</span>
                      <span>{ship.destination}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Легенда */}
          <div className="legend">
            <div className="legend-title">📊 Уровень опасности</div>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'linear-gradient(90deg, #60a5fa, #3b82f6)' }}></div>
                <span>Низкий (разреженный лёд)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'linear-gradient(90deg, #fbbf24, #f59e0b)' }}></div>
                <span>Средний (плотный лёд)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'linear-gradient(90deg, #ef4444, #dc2626)' }}></div>
                <span>Высокий (многолетний лёд)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;