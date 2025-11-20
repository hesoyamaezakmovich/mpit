import os
import sys
import requests
import pandas as pd
import geopandas as gpd
import numpy as np
import rasterio
from rasterio.features import rasterize
from skimage.graph import route_through_array
from shapely.geometry import LineString
from rasterio.warp import transform as warp_transform

# ==============================================================================
# --- ГЛАВНЫЙ БЛОК НАСТРОЕК ---
# ==============================================================================

GEOJSON_PATH = sys.argv[1]
ORIGINAL_SAR_IMAGE_PATH = sys.argv[2]
TARGET_DATE = "2025-11-18"
TARGET_HOUR = 12
W_ICE = 10.0
W_WEATHER = 1.0

COST_MAPPING = {
    "Water": 1, 
    "Thin Ice": 1, 
    "Medium Ice": 200,
    "Thick Ice": 10000, 
    "Land": np.inf
}

# ==============================================================================
# --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
# ==============================================================================

def get_weather_for_point(lat, lon, target_date, target_hour):
    """Запрашивает данные о погоде для указанной точки и времени."""
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat, "longitude": lon, "start_date": target_date, "end_date": target_date,
        "hourly": "temperature_2m,visibility,wind_speed_10m", "timezone": "UTC"
    }
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        df = pd.DataFrame(data["hourly"])
        df["time"] = pd.to_datetime(df["time"])
        weather_at_hour = df[df.time.dt.hour == target_hour].iloc[0]
        return weather_at_hour
    except Exception as e:
        print(f"Ошибка при получении данных о погоде: {e}")
        sys.exit()

# ==============================================================================
# --- ОСНОВНОЙ КОНВЕЙЕР ОБРАБОТКИ ---
# ==============================================================================

if __name__ == "__main__":
    
    os.environ['OGR_GEOJSON_MAX_OBJ_SIZE'] = '0'

    # ЭТАП 1: Создание карты стоимости льда
    with rasterio.open(ORIGINAL_SAR_IMAGE_PATH) as src:
        meta = src.profile
        transform = src.transform
        out_shape = src.shape
        crs = src.crs

    gdf = gpd.read_file(GEOJSON_PATH)
    if gdf.crs != crs:
        gdf = gdf.to_crs(crs)
    gdf['cost'] = gdf['ice_type'].str.strip().str.title().map(COST_MAPPING)

    ice_cost = np.full(out_shape, COST_MAPPING["Water"], dtype=np.float32)
    shapes = ((geom, value) for geom, value in zip(gdf.geometry, gdf.cost))
    rasterize(shapes=shapes, out=ice_cost, transform=transform, dtype=np.float32)

    with rasterio.open(ORIGINAL_SAR_IMAGE_PATH) as src:
        no_data_mask = src.read(1) == 0
    ice_cost[no_data_mask] = COST_MAPPING["Land"]

    # ЭТАП 2: Интеграция погоды и построение маршрута
    center_x = transform.c + transform.a * (meta['width'] / 2)
    center_y = transform.f + transform.e * (meta['height'] / 2)
    center_lon, center_lat = warp_transform(crs, 'EPSG:4326', [center_x], [center_y])
    weather_data = get_weather_for_point(center_lat[0], center_lon[0], TARGET_DATE, TARGET_HOUR)

    speed_ms = weather_data['wind_speed_10m'] / 3.6
    penalty_wind = speed_ms ** 2
    penalty_visibility = 999999 if (weather_data['visibility'] is not None and weather_data['visibility'] < 500) else 0
    weather_cost_base = penalty_wind + penalty_visibility

    penalty_temp_array = np.zeros_like(ice_cost)
    if weather_data['temperature_2m'] < -25:
        is_water_mask = (ice_cost == COST_MAPPING["Thin Ice"])
        penalty_temp_array[is_water_mask] = 10

    total_cost = (W_ICE * ice_cost) + (W_WEATHER * weather_cost_base) + penalty_temp_array

    walkable_coords = np.argwhere(ice_cost == COST_MAPPING["Thin Ice"])
    if len(walkable_coords) < 2:
        print("Критическая ошибка: на карте не найдено достаточно проходимых точек.")
        sys.exit()
    start_point_px = tuple(walkable_coords[0])
    end_point_px = tuple(walkable_coords[-1])

    try:
        indices, weight = route_through_array(
            total_cost, start=start_point_px, end=end_point_px,
            geometric=True, fully_connected=True
        )
    except Exception as e:
        print(f"Ошибка при поиске пути: {e}")
        sys.exit()

    # ЭТАП 3: Преобразование в WGS84 и вывод
    path_geo = [(transform * (col, row)) for row, col in indices]
    line = LineString(path_geo)
    
    # Создаем GeoDataFrame в исходной CRS
    gdf = gpd.GeoDataFrame({'name': ['route_with_weather']}, geometry=[line], crs=crs)
    
    # Конвертируем в WGS84 (EPSG:4326)
    gdf_wgs84 = gdf.to_crs('EPSG:4326')
    
    # Выводим результат
    result_geojson = gdf_wgs84.to_json()
    print(result_geojson)