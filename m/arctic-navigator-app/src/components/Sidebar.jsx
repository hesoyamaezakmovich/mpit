const Sidebar = ({ 
  ships, 
  iceLayer, 
  shipsLayer, 
  onIceLayerChange, 
  onShipsLayerChange, 
  onRefresh,
  onShipClick 
}) => {
  return (
    <div className="sidebar">
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        🌨️ Арктик Навигатор
      </h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
          Слои карты
        </h2>
        <label className="checkbox-label">
          <input 
            type="checkbox" 
            checked={iceLayer}
            onChange={(e) => onIceLayerChange(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Ледовая обстановка
        </label>
        <label className="checkbox-label">
          <input 
            type="checkbox" 
            checked={shipsLayer}
            onChange={(e) => onShipsLayerChange(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Суда (АИС)
        </label>
        <button 
          onClick={onRefresh}
          className="btn-primary"
          style={{ marginTop: '10px' }}
        >
          🔄 Обновить данные
        </button>
      </div>

      <div>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
          🚢 Суда в зоне ({ships.length})
        </h2>
        {ships.map(ship => (
          <div 
            key={ship.id}
            className="ship-card"
            onClick={() => onShipClick(ship)}
          >
            <div style={{ fontWeight: '500' }}>{ship.name}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
              {ship.lat.toFixed(2)}°N, {ship.lon.toFixed(2)}°E
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
              ⚡ {ship.speed} уз | 🧭 {ship.course}°
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #374151' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
          📊 Легенда опасности льда
        </h3>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#4ade80' }}></div>
          Низкий (разреженный)
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#fbbf24' }}></div>
          Средний (плотный)
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#ef4444' }}></div>
          Высокий (многолетний)
        </div>
      </div>
    </div>
  );
};

export default Sidebar;