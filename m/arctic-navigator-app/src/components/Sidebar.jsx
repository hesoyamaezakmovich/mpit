import { useState } from 'react';

const Sidebar = ({ 
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