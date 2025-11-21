import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import Map from './components/Map';
import Sidebar from './components/Sidebar';

function App() {
  const [ships, setShips] = useState([]);
  const [iceData, setIceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [iceLayer, setIceLayer] = useState(null);
  const [shipsLayer, setShipsLayer] = useState(true);
  const [routesLayer, setRoutesLayer] = useState(true);
  const mapInstanceRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [bboxRect, setBboxRect] = useState(null);
  const [routeLayer, setRouteLayer] = useState(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [savedFormData, setSavedFormData] = useState(null);
  const rectRef = useRef(null);
  const routeLayerRef = useRef(null);
  const [tiffFile, setTiffFile] = useState(null);

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

const handleUpload = async (event) => {
  const file = event.target.files[0];
  
  const formData = new FormData();
  formData.append('geojsonFile', file);
  setSavedFormData(formData);

  const bboxResponse = await fetch('/api/get-bbox', {
    method: 'POST',
    body: formData
  });
  const { bbox } = await bboxResponse.json();
  
  // Просто сохраняем bbox, а отрисовку делаем в useEffect
  setBboxRect(bbox);
};



const handleTiffUpload = (event) => {
  setTiffFile(event.target.files[0]);
};

const handleCalculateRoute = async () => {
  if (!savedFormData || !tiffFile) {
    console.log('❌ Нужно загрузить и GeoJSON и TIFF');
    return;
  }
  
  const formData = new FormData();
  formData.append('geojsonFile', savedFormData.get('geojsonFile'));
  formData.append('tiffFile', tiffFile);
  
  const routeResponse = await fetch('/api/calculate-route', {
    method: 'POST', 
    body: formData
  });
  const routeGeoJSON = await routeResponse.json();
  setRouteGeoJSON(routeGeoJSON);
};




useEffect(() => {
  if (!mapInstanceRef.current) return;
  
  const map = mapInstanceRef.current;
  
  // Отрисовка/обновление прямоугольника
  if (bboxRect) {
    if (rectRef.current) {
      map.removeLayer(rectRef.current);
    }
    const rect = L.rectangle([
      [bboxRect[1], bboxRect[0]],
      [bboxRect[3], bboxRect[2]]
    ], {
      color: '#3388ff',
      weight: 2,
      fillOpacity: 0.1
    }).addTo(map);
    rectRef.current = rect;
    
    // Центрируем на прямоугольнике с задержкой
    setTimeout(() => {
      if (map.getSize().x) { // проверяем что карта отрендерена
        map.fitBounds(rect.getBounds());
      }
    }, 100);
  }
  
  // Отрисовка/обновление маршрута
  if (routeGeoJSON) {
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
    }
    const newRouteLayer = L.geoJSON(routeGeoJSON, {
      style: {
        color: '#ff0000',
        weight: 6,
        opacity: 1
      }
    }).addTo(map);
    routeLayerRef.current = newRouteLayer;
  }
  
}, [bboxRect, routeGeoJSON]); // оба зависимости


const handleMapReady = (map) => {
  mapInstanceRef.current = map;
};

  return (
    <div className="main-container">
      <Sidebar 
        onTiffUpload={handleTiffUpload}
        onCalculateRoute={handleCalculateRoute}
        onUpload={handleUpload}
        ships={ships}
        iceLayer={iceLayer}
        shipsLayer={shipsLayer}
        routesLayer={routesLayer}
        onIceLayerChange={setIceLayer}
        onShipsLayerChange={setShipsLayer}
        onRoutesLayerChange={setRoutesLayer}
        onRefresh={loadData}
        onShipClick={handleShipClick}
      />
      
      <div className="map-container">
        <Map 
          iceData={iceData}
          ships={ships}
          iceLayer={iceLayer}
          shipsLayer={shipsLayer}
          routesLayer={routesLayer}
          onMapReady={handleMapReady}
        />
      </div>
    </div>
  );
}

export default App;