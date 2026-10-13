import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMap, useMapEvents } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { Crosshair, MapPin, CheckCircle2, AlertTriangle, Compass } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

export const HARAM_CENTER: [number, number] = [21.4225, 39.8262];

export const HARAM_POLYGON: [number, number][] = [
  [21.4262, 39.8240],
  [21.4262, 39.8285],
  [21.4243, 39.8299],
  [21.4207, 39.8297],
  [21.4188, 39.8278],
  [21.4189, 39.8243],
  [21.4208, 39.8227],
  [21.4243, 39.8226],
];

export const HARAM_LANDMARKS = [
  {
    id: 'king-fahd',
    name: { en: 'King Fahd Gate', ar: 'بوابة الملك فهد' },
    point: [21.4219, 39.8248] as [number, number],
  },
  {
    id: 'east-plaza',
    name: { en: 'East Plaza', ar: 'الساحة الشرقية' },
    point: [21.42325, 39.8280] as [number, number],
  },
  {
    id: 'mataf',
    name: { en: 'Mataf Courtyard', ar: 'صحن المطاف' },
    point: [21.4224, 39.82625] as [number, number],
  },
  {
    id: 'ajyad',
    name: { en: 'Ajyad Gate', ar: 'بوابة أجياد' },
    point: [21.41995, 39.8272] as [number, number],
  },
  {
    id: 'king-abdulaziz',
    name: { en: 'King Abdulaziz Gate', ar: 'بوابة الملك عبدالعزيز' },
    point: [21.4234, 39.8232] as [number, number],
  },
];

export function isPointInsideHaram(lat: number, lon: number, polygon: [number, number][] = HARAM_POLYGON): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function getNearestLandmark(lat: number, lon: number, lang: 'en' | 'ar'): string {
  let nearest = HARAM_LANDMARKS[0];
  let minDistance = Infinity;
  for (const landmark of HARAM_LANDMARKS) {
    const d = Math.hypot(landmark.point[0] - lat, landmark.point[1] - lon);
    if (d < minDistance) {
      minDistance = d;
      nearest = landmark;
    }
  }
  if (minDistance < 0.0012) {
    return nearest.name[lang];
  }
  return `${nearest.name[lang]} (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
}

const pinIcon = divIcon({
  className: 'location-picker-marker-container',
  html: `
    <div style="position: relative; transform: translate(-50%, -100%); width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
      <div style="position: absolute; bottom: -1px; left: 50%; transform: translateX(-50%); width: 10px; height: 3.5px; background: rgba(0,0,0,0.45); border-radius: 50%; filter: blur(1px);"></div>
      <div style="width: 19px; height: 19px; border-radius: 50% 50% 50% 2px; transform: rotate(-45deg); background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: 1.5px solid #d1fae5; box-shadow: 0 3px 8px rgba(16, 185, 129, 0.45); display: flex; align-items: center; justify-content: center;">
        <div style="width: 6px; height: 6px; border-radius: 50%; background: #ffffff; transform: rotate(45deg);"></div>
      </div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

function MapClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
    // Invalidate size once after mounting to ensure crisp tiles
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [center, map]);
  return null;
}

type LocationPickerMapProps = {
  selectedLocationName: string;
  onLocationChange: (locationName: string, coords?: [number, number]) => void;
  lang: 'en' | 'ar';
};

export function LocationPickerMap({
  selectedLocationName,
  onLocationChange,
  lang,
}: LocationPickerMapProps) {
  const isArabic = lang === 'ar';
  const [coords, setCoords] = useState<[number, number]>(HARAM_CENTER);
  const [sourceMode, setSourceMode] = useState<'preset' | 'manual' | 'gps'>('preset');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const isInside = useMemo(() => isPointInsideHaram(coords[0], coords[1]), [coords]);

  // If a known landmark name matches the input, keep coordinates aligned
  useEffect(() => {
    if (!selectedLocationName) return;
    const match = HARAM_LANDMARKS.find((lm) =>
      selectedLocationName.toLowerCase().includes(lm.name.en.toLowerCase()) ||
      selectedLocationName.includes(lm.name.ar)
    );
    if (match && (coords[0] !== match.point[0] || coords[1] !== match.point[1])) {
      setCoords(match.point);
    }
  }, [selectedLocationName]);

  const handleMapClick = (lat: number, lng: number) => {
    const nextCoords: [number, number] = [lat, lng];
    setCoords(nextCoords);
    setSourceMode('manual');
    setGpsError(null);
    const landmarkName = getNearestLandmark(lat, lng, lang);
    onLocationChange(landmarkName, nextCoords);
  };

  const handleSelectPreset = (landmark: typeof HARAM_LANDMARKS[number]) => {
    setCoords(landmark.point);
    setSourceMode('preset');
    setGpsError(null);
    onLocationChange(landmark.name[lang], landmark.point);
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsError(isArabic ? 'تحديد الموقع الجغرافي غير مدعوم في متصفحك.' : 'Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const nextCoords: [number, number] = [lat, lng];
        setCoords(nextCoords);
        setSourceMode('gps');
        setGpsLoading(false);
        const landmarkName = getNearestLandmark(lat, lng, lang);
        onLocationChange(landmarkName, nextCoords);
      },
      (error) => {
        setGpsLoading(false);
        setGpsError(
          isArabic
            ? 'تعذر الوصول إلى موقع GPS الحالي. يمكنك الضغط على الخريطة لتحديده يدوياً.'
            : 'Unable to retrieve GPS location. You can click on the map to set it manually.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="location-picker-container" style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#c5d0d4', display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={13} color="#10b981" />
          {isArabic ? 'تحديد موقع البلاغ على الخريطة' : 'Interactive Location Pin Picker'}
        </span>
        <button
          type="button"
          onClick={handleUseGps}
          disabled={gpsLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: '10px',
            color: '#a7f3d0',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '6px',
            padding: '4px 8px',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          title={isArabic ? 'تحديد الموقع تلقائياً بواسطة GPS' : 'Auto-locate using GPS'}
        >
          <Crosshair size={11} className={gpsLoading ? 'animate-spin' : ''} />
          {gpsLoading ? (isArabic ? 'جارٍ التحديد...' : 'Locating...') : (isArabic ? 'موقعي الحالي (GPS)' : 'Use My GPS')}
        </button>
      </div>

      {/* Preset Landmarks Quick Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 9 }}>
        {HARAM_LANDMARKS.map((landmark) => {
          const isSelected = Math.abs(coords[0] - landmark.point[0]) < 0.0003 && Math.abs(coords[1] - landmark.point[1]) < 0.0003;
          return (
            <button
              type="button"
              key={landmark.id}
              onClick={() => handleSelectPreset(landmark)}
              style={{
                fontSize: '9.5px',
                padding: '3px 8px',
                borderRadius: '5px',
                border: isSelected ? '1px solid #10b981' : '1px solid #2b3944',
                background: isSelected ? 'rgba(16, 185, 129, 0.18)' : '#14202b',
                color: isSelected ? '#ecfdf5' : '#8fa0aa',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {landmark.name[lang]}
            </button>
          );
        })}
      </div>

      {/* Map Container */}
      <div
        style={{
          position: 'relative',
          height: '220px',
          borderRadius: '9px',
          overflow: 'hidden',
          border: '1px solid #2f404d',
          background: '#15211d',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <MapContainer
          center={coords}
          zoom={17}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="dark-map-tiles"
          />
          <MapCenterController center={coords} />
          <MapClickHandler onSelect={handleMapClick} />

          {/* Haram Geofence Boundary Polygon */}
          <Polygon
            positions={HARAM_POLYGON}
            pathOptions={{
              color: '#34d399',
              weight: 1.5,
              dashArray: '4, 4',
              fillColor: '#10b981',
              fillOpacity: 0.08,
            }}
          />

          {/* User Incident Pin Marker */}
          <Marker position={coords} icon={pinIcon} />
        </MapContainer>

        {/* Floating Instruction / Hint Pill */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            right: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pointerEvents: 'none',
            zIndex: 400,
          }}
        >
          <span
            style={{
              fontSize: '8.5px',
              color: '#94a3b8',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(51, 65, 85, 0.6)',
              padding: '3px 7px',
              borderRadius: '4px',
              backdropFilter: 'blur(4px)',
            }}
          >
            {isArabic ? 'اضغط على الخريطة لتثبيت موقع البلاغ' : 'Click anywhere on map to reposition pin'}
          </span>
          <span
            style={{
              fontSize: '8px',
              color: '#34d399',
              background: 'rgba(6, 78, 59, 0.8)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 500,
            }}
          >
            {isArabic ? 'نطاق الحرم الشريف' : 'Haram Geofence'}
          </span>
        </div>
      </div>

      {/* Geofence Status and Telemetry readout */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '7px',
          padding: '6px 9px',
          background: '#131e28',
          border: '1px solid #283744',
          borderRadius: '6px',
          fontSize: '9.5px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
          <Compass size={12} color="#64748b" />
          <span>
            {coords[0].toFixed(5)}° N, {coords[1].toFixed(5)}° E
          </span>
          <span style={{ color: '#475569' }}>·</span>
          <span style={{ color: '#cbd5e1' }}>
            {sourceMode === 'gps'
              ? (isArabic ? 'تحديد عبر GPS' : 'GPS Fix')
              : sourceMode === 'manual'
                ? (isArabic ? 'تحديد يدوي' : 'Manual Map Pin')
                : (isArabic ? 'موقع محدد' : 'Landmark Selected')}
          </span>
        </div>

        {/* Geofence Verification Pill */}
        {isInside ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              padding: '2px 7px',
              borderRadius: '12px',
              fontSize: '8.5px',
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={10} />
            {isArabic ? 'داخل نطاق الحرم' : 'Inside Haram'}
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: '#fbbf24',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              padding: '2px 7px',
              borderRadius: '12px',
              fontSize: '8.5px',
              fontWeight: 600,
            }}
          >
            <AlertTriangle size={10} />
            {isArabic ? 'خارج نطاق الحرم' : 'Outside Haram'}
          </span>
        )}
      </div>

      {gpsError && (
        <div style={{ fontSize: '9px', color: '#f87171', marginTop: '4px', lineHeight: 1.4 }}>
          {gpsError}
        </div>
      )}
    </div>
  );
}
