import sys
import json

geojson_path = sys.argv[1]

try:
    with open(geojson_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    
    # Пробуем взять bbox из metadata
    if 'bbox' in data:
        bounds = data['bbox']
    else:
        # Собираем все координаты из первых 50 фич
        all_coords = []
        for feature in data['features']:
            geometry = feature.get('geometry', {})
            if geometry.get('type') == 'Polygon':
                for ring in geometry['coordinates']:
                    all_coords.extend(ring)
            elif geometry.get('type') == 'MultiPolygon':
                for polygon in geometry['coordinates']:
                    for ring in polygon:
                        all_coords.extend(ring)
        
        if not all_coords:
            # Если нет координат, используем дефолтные
            bounds = [0, 0, 10, 10]
        else:
            # Вычисляем bbox
            lons = [coord[0] for coord in all_coords]
            lats = [coord[1] for coord in all_coords]
            bounds = [min(lons), min(lats), max(lons), max(lats)]
    
    result = json.dumps({'bbox': bounds})
    print(result)
    
except Exception as e:
    # Fallback bbox
    print(json.dumps({'bbox': [0, 0, 10, 10]}))