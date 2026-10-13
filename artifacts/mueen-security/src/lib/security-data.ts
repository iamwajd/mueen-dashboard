import { useCallback, useEffect, useState } from 'react';

export type IncidentType = 'Congestion' | 'Medical emergency' | 'Fall' | 'Obstruction' | 'Other';
export type Incident = {
  id: string;
  type: IncidentType;
  location: string;
  description: string;
  createdAt: string;
  status: 'Open' | 'Assigned' | 'Resolved' | 'Dismissed';
  reportedBy: 'Guest' | 'Operations';
  assignedStaff?: string;
  autoResolveAt?: number;
  resolvedAt?: number;
  dismissedAt?: number;
};
export type StaffStatus = 'Available' | 'Assigned' | 'Unavailable';
export type StaffMember = {
  id: string;
  name: string;
  role: string;
  status: StaffStatus;
  location: string;
  assignment: string;
};

const INCIDENT_KEY = 'mueen-incidents-v1';
const STAFF_KEY = 'mueen-staff-v1';
const seededIncidents: Incident[] = [
  { id: 'INC-2481', type: 'Congestion', location: 'King Fahd Gate', description: 'Pedestrian flow is slowing near the inner approach.', createdAt: '10:42', status: 'Open', reportedBy: 'Operations' },
  { id: 'INC-2479', type: 'Medical emergency', location: 'Eastern Courtyard', description: 'Medical team requested for a visitor requiring assistance.', createdAt: '10:26', status: 'Assigned', reportedBy: 'Operations', assignedStaff: 'Mariam Al-Harbi' },
  { id: 'INC-2476', type: 'Obstruction', location: 'Mataf, north side', description: 'A temporary obstruction has narrowed the walking route.', createdAt: '10:08', status: 'Open', reportedBy: 'Operations' },
];
const demoGuestIncidents: Incident[] = [
  { id: 'G-DEMO-01', type: 'Medical emergency', location: 'East Plaza', description: 'Demonstration visitor request for first aid; no real-world report.', createdAt: '10:51', status: 'Open', reportedBy: 'Guest' },
  { id: 'G-DEMO-02', type: 'Fall', location: 'Ajyad Gate', description: 'Demonstration report requesting assistance; no real-world report.', createdAt: '10:47', status: 'Open', reportedBy: 'Guest' },
];
const seededStaff: StaffMember[] = [
  { id: 'ST-1042', name: 'Mariam Al-Harbi', role: 'Field supervisor', status: 'Assigned', location: 'Eastern Courtyard', assignment: 'INC-2479 · Medical response' },
  { id: 'ST-1086', name: 'Faisal Al-Otaibi', role: 'Crowd safety officer', status: 'Available', location: 'King Abdulaziz Gate', assignment: 'No active assignment' },
  { id: 'ST-1121', name: 'Noura Al-Qahtani', role: 'First aid responder', status: 'Available', location: 'Western Arcade', assignment: 'No active assignment' },
  { id: 'ST-1138', name: 'Omar Al-Mutairi', role: 'Crowd safety officer', status: 'Assigned', location: 'Mataf, north side', assignment: 'INC-2468 · Route observation' },
  { id: 'ST-1194', name: 'Huda Al-Shehri', role: 'Field supervisor', status: 'Unavailable', location: 'Operations base', assignment: 'Off shift' },
  { id: 'ST-1227', name: 'Saad Al-Qahtani', role: 'First aid responder', status: 'Available', location: 'Ajyad Gate', assignment: 'No active assignment' },
];

function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}
function readIncidents(): Incident[] {
  const stored = read(INCIDENT_KEY, seededIncidents);
  const now = Date.now();
  const hasGuestReports = stored.some((incident) => incident.reportedBy === 'Guest');
  let changed = !hasGuestReports;
  const incidents = hasGuestReports
    ? stored
    : [...stored, ...demoGuestIncidents.map((incident, index) => ({
      ...incident,
      createdAt: new Date(now - index * 30_000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }))];
  const normalized = incidents.map((incident) => {
    if (incident.reportedBy === 'Guest'
      && (incident.status === 'Open' || incident.status === 'Assigned')
      && !incident.autoResolveAt) {
      changed = true;
      return { ...incident, autoResolveAt: now + 30_000 + Math.floor(Math.random() * 15_001) };
    }
    return incident;
  });
  if (changed) {
    try {
      localStorage.setItem(INCIDENT_KEY, JSON.stringify(normalized));
    } catch {
      // Keep the in-memory demo functional if browser storage is unavailable.
    }
  }
  return normalized;
}
function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event('mueen-local-update'));
}

export function useSecurityData() {
  const [incidents, setIncidents] = useState<Incident[]>(readIncidents);
  const [staff, setStaff] = useState<StaffMember[]>(() => read(STAFF_KEY, seededStaff));
  useEffect(() => {
    const refresh = () => {
      setIncidents(readIncidents());
      setStaff(read(STAFF_KEY, seededStaff));
    };
    window.addEventListener('storage', refresh);
    window.addEventListener('mueen-local-update', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('mueen-local-update', refresh);
    };
  }, []);
  const addIncident = useCallback((input: Pick<Incident, 'type' | 'location' | 'description'>) => {
    const now = Date.now();
    const current = readIncidents();
    const item: Incident = {
      ...input,
      id: `G-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Open',
      reportedBy: 'Guest',
      autoResolveAt: now + 30_000 + Math.floor(Math.random() * 15_001),
    };
    const next = [item, ...current];
    write(INCIDENT_KEY, next);
    setIncidents(next);
    return item;
  }, []);
  const assignIncident = useCallback((incidentId: string, staffId: string) => {
    const currentIncidents = readIncidents();
    const currentStaff = read(STAFF_KEY, seededStaff);
    const member = currentStaff.find((person) => person.id === staffId);
    const incident = currentIncidents.find((item) => item.id === incidentId);
    if (!member || !incident || incident.status !== 'Open' || member.status !== 'Available') return false;
    const nextIncidents = currentIncidents.map((item) => item.id === incidentId
      ? { ...item, status: 'Assigned' as const, assignedStaff: member.name } : item);
    const nextStaff = currentStaff.map((person) => person.id === staffId
      ? { ...person, status: 'Assigned' as const, assignment: `${incident.id} · ${incident.type}` } : person);
    write(INCIDENT_KEY, nextIncidents);
    write(STAFF_KEY, nextStaff);
    setIncidents(nextIncidents);
    setStaff(nextStaff);
    return true;
  }, []);
  const closeIncident = useCallback((incidentId: string, status: 'Resolved' | 'Dismissed') => {
    const currentIncidents = readIncidents();
    const currentStaff = read(STAFF_KEY, seededStaff);
    const incident = currentIncidents.find((item) => item.id === incidentId);
    if (!incident || (incident.status !== 'Open' && incident.status !== 'Assigned')) return false;
    const changedAt = Date.now();
    const nextIncidents = currentIncidents.map((item) => item.id === incidentId
      ? {
        ...item,
        status,
        resolvedAt: status === 'Resolved' ? changedAt : item.resolvedAt,
        dismissedAt: status === 'Dismissed' ? changedAt : item.dismissedAt,
      }
      : item);
    let releasedAssignment = false;
    const nextStaff = currentStaff.map((person) => {
      if (person.name === incident.assignedStaff
        && person.status === 'Assigned'
        && person.assignment.startsWith(`${incident.id} ·`)) {
        releasedAssignment = true;
        return { ...person, status: 'Available' as const, assignment: 'No active assignment' };
      }
      return person;
    });
    write(INCIDENT_KEY, nextIncidents);
    if (releasedAssignment) write(STAFF_KEY, nextStaff);
    setIncidents(nextIncidents);
    if (releasedAssignment) setStaff(nextStaff);
    return true;
  }, []);
  const resolveIncident = useCallback((incidentId: string) => closeIncident(incidentId, 'Resolved'), [closeIncident]);
  const dismissIncident = useCallback((incidentId: string) => closeIncident(incidentId, 'Dismissed'), [closeIncident]);
  useEffect(() => {
    const timers = incidents
      .filter((incident) => incident.reportedBy === 'Guest'
        && (incident.status === 'Open' || incident.status === 'Assigned')
        && incident.autoResolveAt)
      .map((incident) => window.setTimeout(
        () => resolveIncident(incident.id),
        Math.max(0, (incident.autoResolveAt as number) - Date.now()),
      ));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [incidents, resolveIncident]);
  return { incidents, staff, addIncident, assignIncident, resolveIncident, dismissIncident };
}
