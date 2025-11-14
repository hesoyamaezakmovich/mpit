import { useState, useEffect, useRef } from 'react';
import Map from './components/Map';
import Sidebar from './components/Sidebar';

function App() {
  const [ships, setShips] = useState([]);
  const [iceData, setIceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [iceLayer, setIceLayer] = useState(true);
  const [shipsLayer, setShipsLayer] = useState(true);
  const mapInstanceRef = useRef(null);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const [shipsRes, iceRes] = await Promise.all([
        fetch('/api/ships'),
        fetch('/api/ice')
      ]);
      
      if (!shipsRes.ok || !iceRes.ok) {
        throw new Error('Ошибка загрузки данных с сервера');
      }
      
      const shipsData = await shipsRes.json();
      const iceDataRes = await iceRes.json();
      
      setShips(shipsData.ships || []);
      setIceData(iceDataRes);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleShipClick = (ship) => {
    const map = mapInstanceRef.current;
    if (map) {
      map.setView([ship.lat, ship.lon], 8);
      
      // Найти и открыть popup маркера
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          const latlng = layer.getLatLng();
          if (Math.abs(latlng.lat - ship.lat) < 0.01 && Math.abs(latlng.lng - ship.lon) < 0.01) {
            layer.openPopup();
          }
        }
      });
    }
  };

  const handleMapReady = (map) => {
    mapInstanceRef.current = map;
  };

  if (loading) {
    return (
      <div className="loading">
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '20px' }}>⏳ Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading">
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '20px', color: '#ef4444' }}>❌ {error}</p>
          <button 
            onClick={loadData}
            className="btn-primary"
            style={{
              marginTop: '20px',
              width: 'auto',
              padding: '10px 20px'
            }}
          >
            🔄 Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <Sidebar 
        ships={ships}
        iceLayer={iceLayer}
        shipsLayer={shipsLayer}
        onIceLayerChange={setIceLayer}
        onShipsLayerChange={setShipsLayer}
        onRefresh={loadData}
        onShipClick={handleShipClick}
      />
      
      <div className="map-container">
        <Map 
          iceData={iceData}
          ships={ships}
          iceLayer={iceLayer}
          shipsLayer={shipsLayer}
          onMapReady={handleMapReady}
        />
      </div>
    </div>
  );
}

export default App;