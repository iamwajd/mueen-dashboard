import { Fragment, useEffect, useMemo, useState } from 'react';
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { divIcon, type LatLngExpression } from 'leaflet';
import type { Incident, StaffMember } from '../lib/security-data';
import type { Language } from '../pages/experiences';
import 'leaflet/dist/leaflet.css';

export const HARAM_CENTER: LatLngExpression = [21.4225, 39.8262];

const gates = [
  { id: 'king-fahd', name: { en: 'King Fahd Gate', ar: 'بوابة الملك فهد' }, risk: 'high', level: 86, point: [21.4219, 39.8248] as LatLngExpression, labelPoint: [21.42255, 39.8248] as LatLngExpression, radius: 125 },
  { id: 'east-plaza', name: { en: 'East Plaza', ar: 'الساحة الشرقية' }, risk: 'medium', level: 57, point: [21.42325, 39.8280] as LatLngExpression, labelPoint: [21.42395, 39.8280] as LatLngExpression, radius: 105 },
  { id: 'ajyad', name: { en: 'Ajyad', ar: 'أجياد' }, risk: 'low', level: 29, point: [21.41995, 39.8272] as LatLngExpression, labelPoint: [21.4206, 39.8272] as LatLngExpression, radius: 92 },
] as const;

const namedPlaces: Array<{ terms: string[]; point: [number, number] }> = [
  { terms: ['king fahd', 'بوابة الملك فهد'], point: [21.4219, 39.8248] },
  { terms: ['east plaza', 'eastern courtyard', 'eastern plaza', 'الساحة الشرقية'], point: [21.42325, 39.8280] },
  { terms: ['ajyad', 'أجياد'], point: [21.41995, 39.8272] },
  { terms: ['king abdulaziz', 'بوابة الملك عبدالعزيز'], point: [21.4234, 39.8232] },
  { terms: ['mataf', 'المطاف'], point: [21.4224, 39.82625] },
  { terms: ['western arcade', 'west arcade'], point: [21.4220, 39.8235] },
  { terms: ['operations base'], point: [21.4251, 39.8260] },
];

export function locationCoordinates(location: string): [number, number] {
  const normalized = location.toLocaleLowerCase();
  const known = namedPlaces.find((place) => place.terms.some((term) => normalized.includes(term)));
  if (known) return known.point;
  let hash = 0;
  for (let i = 0; i < location.length; i += 1) hash = (hash * 31 + location.charCodeAt(i)) | 0;
  const latOffset = (((Math.abs(hash) % 1000) / 1000) - 0.5) * 0.006;
  const lonOffset = (((Math.abs((hash * 17) | 0) % 1000) / 1000) - 0.5) * 0.008;
  return [21.4225 + latOffset, 39.8262 + lonOffset];
}

const staffPositions: Record<string, [number, number]> = {
  'ST-1042': [21.4230, 39.8272], 'ST-1086': [21.4234, 39.8232],
  'ST-1121': [21.4220, 39.8235], 'ST-1138': [21.4227, 39.8267],
  'ST-1194': [21.4251, 39.8260], 'ST-1227': [21.4201, 39.8270],
};

export type PositionedUnit = { person: StaffMember; position: [number, number] };

type OperationsMapProps = {
  incidents: Incident[];
  units: PositionedUnit[];
  staff: StaffMember[];
  lang: Language;
  density?: number[];
  assignIncident: (incidentId: string, staffId: string) => boolean;
  resolveIncident: (incidentId: string) => boolean;
  dismissIncident: (incidentId: string) => boolean;
};

function IncidentPopup({ incident, staff, lang, now, assignIncident, resolveIncident, dismissIncident }: {
  incident: Incident;
  staff: StaffMember[];
  lang: Language;
  now: number;
  assignIncident: OperationsMapProps['assignIncident'];
  resolveIncident: OperationsMapProps['resolveIncident'];
  dismissIncident: OperationsMapProps['dismissIncident'];
}) {
  const [staffId, setStaffId] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const isArabic = lang === 'ar';
  const active = incident.status === 'Open' || incident.status === 'Assigned';
  const availableStaff = staff.filter((person) => person.status === 'Available');
  const deadline = incident.autoResolveAt;
  const remaining = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
  const statusText = incident.status === 'Resolved'
    ? (isArabic ? 'تم الإنجاز' : 'Resolved')
    : incident.status === 'Dismissed'
      ? (isArabic ? 'ملغي' : 'Dismissed')
      : incident.status === 'Assigned'
        ? (isArabic ? 'مكلّف' : 'Assigned')
        : (isArabic ? 'مفتوح' : 'Open');
  const perform = (action: 'assign' | 'resolve' | 'dismiss') => {
    const success = action === 'assign'
      ? (staffId ? assignIncident(incident.id, staffId) : false)
      : action === 'resolve'
        ? resolveIncident(incident.id)
        : dismissIncident(incident.id);
    const text = action === 'assign'
      ? (isArabic ? 'تم تكليف الفرد بالبلاغ.' : 'Officer assigned to the report.')
      : action === 'resolve'
        ? (isArabic ? 'تم الإنجاز' : 'Report marked as resolved.')
        : (isArabic ? 'تم إلغاء البلاغ.' : 'Alert dismissed.');
    const errorText = isArabic ? 'تعذر تنفيذ الإجراء. تحقق من حالة البلاغ والفرد.' : 'Action could not be completed. Check the report and officer status.';
    setFeedback({ text: success ? text : errorText, error: !success });
    if (success && action === 'assign') setStaffId('');
  };

  return <div className="incident-popup" dir={isArabic ? 'rtl' : 'ltr'} data-testid={`popup-incident-${incident.id}`}>
    <div className="popup-title">{incident.reportedBy === 'Guest' ? (isArabic ? 'بلاغ زائر' : 'Guest report') : (isArabic ? 'بلاغ عمليات' : 'Operations report')} · {incident.id}</div>
    <div className="popup-line"><b>{isArabic ? 'النوع' : 'Type'}:</b> {incident.type}</div>
    <div className="popup-line"><b>{isArabic ? 'الحالة' : 'Status'}:</b> {statusText}{incident.assignedStaff ? ` · ${incident.assignedStaff}` : ''}</div>
    <div className="popup-line"><b>{isArabic ? 'الموقع' : 'Location'}:</b> {incident.location}</div>
    {incident.description && <div className="popup-line"><b>{isArabic ? 'التفاصيل' : 'Details'}:</b> {incident.description}</div>}
    <div className="popup-line"><b>{isArabic ? 'وقت البلاغ' : 'Reported'}:</b> {incident.createdAt}</div>
    {incident.reportedBy === 'Guest' && active && remaining !== null && <div className="popup-line feed-countdown" role="timer" aria-live="off" data-testid={`countdown-popup-${incident.id}`}><b>{isArabic ? 'الوقت المتبقي' : 'Time remaining'}:</b> {remaining}s</div>}
    {incident.status === 'Resolved' && <div className="popup-complete" data-testid={`status-resolved-${incident.id}`}>{isArabic ? 'تم الإنجاز' : 'Completed'}{incident.resolvedAt ? ` · ${new Date(incident.resolvedAt).toLocaleTimeString(isArabic ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}</div>}
    {incident.status === 'Dismissed' && <div className="popup-complete">{isArabic ? 'تم إلغاء البلاغ' : 'Alert dismissed'}</div>}
    {active && <div className="popup-actions">
      {incident.status === 'Open' && <>
        <label className="sr-only" htmlFor={`officer-${incident.id}`}>{isArabic ? 'اختيار فرد متاح' : 'Select available officer'}</label>
        <select id={`officer-${incident.id}`} className="incident-select" value={staffId} onChange={(event) => setStaffId(event.target.value)} data-testid={`select-officer-${incident.id}`}>
          <option value="">{isArabic ? 'اختر فرداً متاحاً' : 'Select available officer'}</option>
          {availableStaff.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.role}</option>)}
        </select>
        <button type="button" className="incident-action" disabled={!staffId} onClick={() => perform('assign')} data-testid={`button-assign-${incident.id}`}>{isArabic ? 'تكليف أمني' : 'Assign Security'}</button>
      </>}
      <button type="button" className="incident-action secondary" onClick={() => perform('resolve')} data-testid={`button-resolve-${incident.id}`}>{isArabic ? 'تغيير إلى منجز' : 'Mark as Resolved'}</button>
      <button type="button" className="incident-action dismiss" onClick={() => perform('dismiss')} data-testid={`button-dismiss-${incident.id}`}>{isArabic ? 'إلغاء البلاغ' : 'Dismiss Alert'}</button>
      {feedback && <div className={`popup-feedback ${feedback.error ? 'error' : ''}`} role={feedback.error ? 'alert' : 'status'} data-testid={`feedback-incident-${incident.id}`}>{feedback.text}</div>}
    </div>}
  </div>;
}

export function OperationsMap({ incidents, units, staff, lang, assignIncident, resolveIncident, dismissIncident }: OperationsMapProps) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return <div className="ops-map" data-testid="map-operations">
    <MapContainer center={HARAM_CENTER} zoom={16} minZoom={14} maxZoom={19} scrollWheelZoom zoomControl aria-label={lang === 'ar' ? 'خريطة توضيحية لمنطقة الحرم' : 'Map around Al-Masjid al-Haram'}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        className="dark-map-tiles"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        eventHandlers={{ tileload: () => setTilesLoaded(true), tileerror: () => setTilesFailed(true) }}
      />
      {units.map(({ person, position }) => <Marker key={person.id} position={position} icon={divIcon({ className: 'unit-div-icon', html: '<div class="unit-marker" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="m9 12 2 2 4-4"/></svg></div>', iconSize: [27, 27], iconAnchor: [13, 13] })}>
        <Popup><div className="popup-title">{person.name}</div><div className="popup-line"><b>{lang === 'ar' ? 'الدور' : 'Role'}:</b> {person.role}</div><div className="popup-line"><b>{lang === 'ar' ? 'الحالة' : 'Status'}:</b> {person.status === 'Available' ? (lang === 'ar' ? 'متاح' : 'Available') : person.status === 'Assigned' ? (lang === 'ar' ? 'مكلّف' : 'Assigned') : (lang === 'ar' ? 'غير متاح' : 'Unavailable')}</div><div className="popup-line"><b>{lang === 'ar' ? 'الموقع' : 'Location'}:</b> {person.location}</div><div className="popup-line">{lang === 'ar' ? 'موقع متحرك للمحاكاة فقط' : 'Simulated position only'}</div></Popup>
      </Marker>)}
      {incidents.map((incident) => {
        const iconState = incident.status === 'Resolved' ? 'resolved' : incident.status === 'Dismissed' ? 'dismissed' : 'active';
        const color = incident.status === 'Resolved' ? '#788e7d' : incident.status === 'Dismissed' ? '#727a73' : '#c54f45';
        const icon = divIcon({
          className: `alert-div-icon ${iconState}`,
          html: `<div class="alert-marker" aria-hidden="true" style="background:${color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3l-7.6-13.1a2 2 0 0 0-3.4 0Z"/></svg></div>`,
          iconSize: [25, 25], iconAnchor: [12, 22],
        });
        return <Marker key={incident.id} position={locationCoordinates(incident.location)} icon={icon} data-testid={`marker-incident-${incident.id}`}>
          <Popup><IncidentPopup incident={incident} staff={staff} lang={lang} now={now} assignIncident={assignIncident} resolveIncident={resolveIncident} dismissIncident={dismissIncident} /></Popup>
        </Marker>;
      })}
    </MapContainer>
    {!tilesLoaded && !tilesFailed && <div className="tile-loading" role="status" data-testid="map-tile-loading">{lang === 'ar' ? 'جارٍ تحميل خريطة الأساس…' : 'Loading public map tiles…'}</div>}
    {tilesFailed && <div className="tile-status" role="status" data-testid="map-tile-warning">{lang === 'ar' ? 'تعذر تحميل بعض خرائط الأساس العامة؛ تبقى طبقات المحاكاة والعلامات متاحة.' : 'Some public base-map tiles could not load. Illustrative crowd layers and markers remain available.'}</div>}
  </div>;
}

export function initialUnitPositions(staff: StaffMember[]): PositionedUnit[] {
  return staff.map((person, index) => ({
    person,
    position: staffPositions[person.id] ?? [21.4225 + ((index % 3) - 1) * 0.001, 39.8262 + (((index + 1) % 3) - 1) * 0.001],
  }));
}
