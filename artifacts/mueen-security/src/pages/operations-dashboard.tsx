import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import {
  Activity, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight,
  FileText, LayoutGrid, Map, Navigation, ShieldCheck, Tv, Users,
} from 'lucide-react';
import { Brand, type Language } from './experiences';
import { useSecurityData, type Incident } from '../lib/security-data';
import { initialUnitPositions, locationCoordinates, OperationsMap, type PositionedUnit } from '../components/operations-map';
import { LiveVideoFeed } from '../components/live-video-feed';
import { CrowdFlowChart } from '../components/crowd-flow-chart';

type Props = { lang: Language; setLang: (language: Language) => void };
type IncidentFilter = 'All' | 'Active' | 'Resolved';
type DashboardViewMode = 'integrated' | 'map' | 'surveillance';

const activeStatus = (incident: Incident) => incident.status === 'Open' || incident.status === 'Assigned';
const deadlineFor = (incident: Incident) => incident.autoResolveAt ?? (incident as Incident & { expiresAt?: number }).expiresAt;

export function OperationsDashboard({ lang, setLang }: Props) {
  const { incidents, staff, assignIncident, resolveIncident, dismissIncident } = useSecurityData();
  const [collapsed, setCollapsed] = useState(false);
  const [surveillanceCollapsed, setSurveillanceCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<DashboardViewMode>('integrated');
  const [crowdTotal, setCrowdTotal] = useState(43860);
  const [density, setDensity] = useState([86, 57, 29]);
  const [filter, setFilter] = useState<IncidentFilter>('Active');
  const [units, setUnits] = useState<PositionedUnit[]>(() => initialUnitPositions(staff));
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [clock, setClock] = useState(() => new Date());
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const activeIncidents = incidents.filter(activeStatus);
  const resolvedIncidents = incidents.filter((incident) => incident.status === 'Resolved');
  const openIncidents = incidents.filter((incident) => incident.status === 'Open');
  const availableCount = staff.filter((person) => person.status === 'Available').length;
  const assignedCount = staff.filter((person) => person.status === 'Assigned').length;
  const onFieldCount = availableCount + assignedCount;
  const visibleIncidents = filter === 'Active'
    ? activeIncidents
    : filter === 'Resolved'
      ? resolvedIncidents
      : incidents;
  const isArabic = lang === 'ar';

  useEffect(() => {
    setUnits((current) => current.map((unit) => {
      const base = locationCoordinates(unit.person.location);
      return {
        ...unit,
        person: staff.find((person) => person.id === unit.person.id) ?? unit.person,
        position: [base[0] + (Math.random() - 0.5) * 0.00018, base[1] + (Math.random() - 0.5) * 0.00018],
      };
    }));
  }, [staff]);

  useEffect(() => {
    const clockTimer = window.setInterval(() => setClock(new Date()), 1000);
    const timer = window.setInterval(() => {
      setDensity((values) => values.map((value, index) => Math.max(14, Math.min(96, value + Math.round((Math.random() - 0.5) * (index === 0 ? 8 : 12))))));
      setCrowdTotal((value) => value + Math.round((Math.random() - 0.48) * 280));
      setUnits((current) => current.map((unit) => ({
        ...unit,
        position: (() => {
          const base = locationCoordinates(unit.person.location);
          return [base[0] + (Math.random() - 0.5) * 0.00028, base[1] + (Math.random() - 0.5) * 0.00028] as [number, number];
        })(),
      })));
      setLastUpdated(new Date());
    }, 7000);
    return () => {
      window.clearInterval(clockTimer);
      window.clearInterval(timer);
    };
  }, []);

  const dispatchNearest = () => {
    const target = openIncidents[0];
    if (!target) {
      setFeedback({ text: isArabic ? 'لا توجد بلاغات مفتوحة للتوجيه حالياً.' : 'There are no open reports to dispatch to.', error: true });
      return;
    }
    const targetPoint = locationCoordinates(target.location);
    const candidates = staff.filter((member) => member.status === 'Available');
    if (!candidates.length) {
      setFeedback({ text: isArabic ? 'لا يوجد أفراد متاحون للتوجيه.' : 'No available personnel are currently listed.', error: true });
      return;
    }
    const currentPoint = (person: typeof candidates[number]) => units.find((unit) => unit.person.id === person.id)?.position ?? locationCoordinates(person.location);
    const nearest = candidates.reduce((best, person) => {
      const bestPoint = currentPoint(best);
      const point = currentPoint(person);
      return Math.hypot(point[0] - targetPoint[0], point[1] - targetPoint[1]) < Math.hypot(bestPoint[0] - targetPoint[0], bestPoint[1] - targetPoint[1]) ? person : best;
    });
    const assigned = assignIncident(target.id, nearest.id);
    setFeedback(assigned
      ? { text: isArabic ? `تم توجيه ${nearest.name} إلى ${target.id} (${target.location}).` : `${nearest.name} assigned to ${target.id} at ${target.location}.`, error: false }
      : { text: isArabic ? 'تعذر إتمام التوجيه. تحقق من حالة الفرد والبلاغ.' : 'Dispatch could not be completed. Recheck the unit and report status.', error: true });
  };

  const appTime = clock.toLocaleTimeString(isArabic ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const updateTime = lastUpdated.toLocaleTimeString(isArabic ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const peakDensity = Math.max(...density);
  const risk = peakDensity >= 75
    ? { en: 'Elevated', ar: 'مرتفع', className: 'high' }
    : peakDensity >= 50
      ? { en: 'Watch', ar: 'متابعة', className: 'medium' }
      : { en: 'Steady', ar: 'مستقر', className: 'low' };
  const filterLabels: Record<IncidentFilter, { en: string; ar: string }> = {
    All: { en: 'All', ar: 'الكل' },
    Active: { en: 'Active', ar: 'النشطة' },
    Resolved: { en: 'Resolved', ar: 'المنجزة' },
  };

  return <div className="command-center" dir={isArabic ? 'rtl' : 'ltr'} data-testid="page-dashboard">
    <header className="command-topbar">
      <Brand compact />
      <div className="monitor-live" data-testid="status-live-monitoring"><i className="live-light" />{isArabic ? 'مراقبة توضيحية' : 'OPERATIONS MONITOR'}</div>
      <span className="command-tag" data-testid="label-simulated-demo">{isArabic ? 'عرض توضيحي · بيانات محاكاة' : 'SIMULATED DEMO · ILLUSTRATIVE DATA'}</span>
      <span className="command-clock" data-testid="text-live-clock" aria-label={isArabic ? 'الوقت الحالي' : 'Current time'}>{appTime}</span>

      {/* View Mode Switcher */}
      <div className="view-mode-tabs" role="tablist" aria-label={isArabic ? 'أوضاع العرض' : 'View Modes'}>
        <button
          type="button"
          className={`view-mode-tab ${viewMode === 'integrated' ? 'active' : ''}`}
          onClick={() => setViewMode('integrated')}
          title={isArabic ? 'العرض المدمج الشامل (خريطة + بث + تدفق)' : 'Integrated Grid (Map + Video + Flow)'}
          data-testid="tab-view-integrated"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>{isArabic ? 'مدمج' : 'Integrated'}</span>
        </button>
        <button
          type="button"
          className={`view-mode-tab ${viewMode === 'map' ? 'active' : ''}`}
          onClick={() => setViewMode('map')}
          title={isArabic ? 'خريطة العمليات فقط' : 'Map Focus'}
          data-testid="tab-view-map"
        >
          <Map className="w-3.5 h-3.5" />
          <span>{isArabic ? 'الخريطة' : 'Map'}</span>
        </button>
        <button
          type="button"
          className={`view-mode-tab ${viewMode === 'surveillance' ? 'active' : ''}`}
          onClick={() => setViewMode('surveillance')}
          title={isArabic ? 'البث المباشر وتدفق الحشود' : 'Surveillance & Flow Focus'}
          data-testid="tab-view-surveillance"
        >
          <Tv className="w-3.5 h-3.5" />
          <span>{isArabic ? 'البث والتدفق' : 'Video & Flow'}</span>
        </button>
      </div>

      <nav className="command-nav" aria-label={isArabic ? 'التنقل الرئيسي' : 'Main navigation'}>
        <Link href="/dashboard" className="active" data-testid="link-dashboard"><Activity />{isArabic ? 'العمليات' : 'Operations'}</Link>
        <Link href="/staff" data-testid="link-staff"><Users />{isArabic ? 'الأفراد' : 'Staff'}</Link>
        <Link href="/report" data-testid="link-guest-report"><FileText />{isArabic ? 'بلاغ زائر' : 'Guest report'}</Link>
      </nav>
      <button className="command-lang" onClick={() => setLang(isArabic ? 'en' : 'ar')} data-testid="button-language" aria-label={isArabic ? 'Switch to English' : 'Switch to Arabic'}>{isArabic ? 'English' : 'العربية'}</button>
    </header>

    {viewMode === 'surveillance' ? (
      <div className="surveillance-deck" data-testid="deck-surveillance-full">
        <div className="deck-header">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-lg font-bold text-[#f0eee5]">
                {isArabic ? 'مركز البث والتحليل المرئي وتدفق الحشود' : 'Live Surveillance & Crowd Flow Analysis Center'}
              </h1>
            </div>
            <p className="text-xs text-[#8ea093] mt-1">
              {isArabic
                ? 'تحليل مباشر لصحن المطاف · شبكة الكاميرات الذكية ونموذج التنبؤ بالازدحام (YOLOv8 & Predictor AI)'
                : 'Real-time Mataf CCTV feed · AI object detection & predictive flow analysis'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#14231d] border border-emerald-500/30 text-emerald-300 font-mono text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>YOLOv8 Detection Active · 27 Objects Tracked</span>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('integrated')}
              className="px-3 py-1.5 rounded-lg bg-[#1e3328] hover:bg-[#284737] border border-[#3b5947] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{isArabic ? 'العودة للعرض المدمج' : 'Return to Integrated Grid'}</span>
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Deck Grid */}
        <div className="deck-grid">
          <LiveVideoFeed lang={lang} />
          <CrowdFlowChart lang={lang} />
        </div>

        {/* Real-time Scene Telemetry Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
          <div className="p-3 rounded-xl bg-[#13221b] border border-[#2b3c31]">
            <span className="text-[10px] text-[#8fa195] block">{isArabic ? 'الموقع والكاميرا' : 'Location & Camera'}</span>
            <strong className="text-sm text-white font-semibold mt-1 block">صحن المطاف · Cam-01</strong>
          </div>
          <div className="p-3 rounded-xl bg-[#13221b] border border-[#2b3c31]">
            <span className="text-[10px] text-[#8fa195] block">{isArabic ? 'تعداد الأشخاص المرصود' : 'Tracked Pedestrians'}</span>
            <strong className="text-sm text-emerald-400 font-mono font-bold mt-1 block">27 شخص</strong>
          </div>
          <div className="p-3 rounded-xl bg-[#13221b] border border-[#2b3c31]">
            <span className="text-[10px] text-[#8fa195] block">{isArabic ? 'الكثافة المحسوبة' : 'Calculated Density'}</span>
            <strong className="text-sm text-emerald-300 font-mono font-bold mt-1 block">0.42 شخص/م²</strong>
          </div>
          <div className="p-3 rounded-xl bg-[#13221b] border border-[#2b3c31]">
            <span className="text-[10px] text-[#8fa195] block">{isArabic ? 'مستوى الأمان التنبؤي' : 'Predictive Risk Status'}</span>
            <strong className="text-sm text-emerald-400 font-bold mt-1 block">طبيعي (NORMAL) · 96%</strong>
          </div>
        </div>
      </div>
    ) : (
      <main className="command-main">
        <OperationsMap incidents={visibleIncidents} units={units} staff={staff} lang={lang} density={density} assignIncident={assignIncident} resolveIncident={resolveIncident} dismissIncident={dismissIncident} />

        {/* Center Top Map HUD */}
        <div className="map-hud">
          <div className="map-title"><div className="eyebrow">{isArabic ? 'مركز تنسيق السلامة · مكة المكرمة' : 'HARAM SAFETY COORDINATION · MAKKAH'}</div><h1>{isArabic ? 'مركز العمليات' : 'Operations center'}</h1><p>{isArabic ? 'حرم المسجد الحرام · عرض مكاني توضيحي' : 'Al-Masjid al-Haram · illustrative spatial view'}</p></div>
          <div className="map-coordinates" data-testid="text-map-center">21.4225° N&nbsp; 39.8262° E</div>
        </div>

        {/* Surveillance & Crowd Flow Dock in Integrated Mode */}
        {viewMode === 'integrated' && (
          <aside
            className={`surveillance-panel ${surveillanceCollapsed ? 'collapsed' : ''}`}
            aria-label={isArabic ? 'لوحة البث والتحليل المرئي' : 'Live surveillance and flow analysis panel'}
            data-testid="panel-surveillance-flow"
          >
            <div className="surveillance-panel-head">
              {!surveillanceCollapsed && (
                <div>
                  <div className="surveillance-panel-title">
                    {isArabic ? 'المراقبة وتدفق الحشود' : 'SURVEILLANCE & FLOW'}
                  </div>
                  <span className="surveillance-panel-kicker">
                    {isArabic ? 'بث الكاميرا المباشر وتتبع الأفراد' : 'CCTV STREAM & PEDESTRIAN FLOW'}
                  </span>
                </div>
              )}
              <button
                className="icon-button"
                onClick={() => setSurveillanceCollapsed(!surveillanceCollapsed)}
                aria-label={
                  surveillanceCollapsed
                    ? isArabic
                      ? 'توسيع لوحة البث'
                      : 'Expand surveillance panel'
                    : isArabic
                      ? 'طي لوحة البث'
                      : 'Collapse surveillance panel'
                }
                data-testid="button-toggle-surveillance"
              >
                {surveillanceCollapsed
                  ? isArabic
                    ? <ChevronRight />
                    : <ChevronLeft />
                  : isArabic
                    ? <ChevronLeft />
                    : <ChevronRight />}
              </button>
            </div>

            {!surveillanceCollapsed && (
              <div className="panel-content space-y-3 p-3 overflow-y-auto">
                <LiveVideoFeed lang={lang} />
                <CrowdFlowChart lang={lang} />
              </div>
            )}
          </aside>
        )}

        {/* Floating Mini Monitor in Map-Only Mode */}
        {viewMode === 'map' && (
          <div
            className="absolute z-[415] bottom-16 start-5 max-w-[280px] sm:max-w-[320px] rounded-xl bg-[#111e19]/95 border border-[#35483c] p-2 shadow-2xl backdrop-blur-xl"
            data-testid="pip-video-preview"
          >
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#25362b] text-[10px]">
              <span className="font-bold text-[#e5dfd3] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {isArabic ? 'بث الكاميرا المباشر' : 'Live CCTV Stream'}
              </span>
              <button
                type="button"
                onClick={() => setViewMode('integrated')}
                className="px-1.5 py-0.5 rounded bg-[#1e3328] hover:bg-[#284737] text-emerald-300 text-[9px] font-semibold"
              >
                {isArabic ? 'توسيع' : 'Expand'}
              </button>
            </div>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
              <video
                autoPlay
                loop
                muted
                playsInline
                controls={false}
                preload="auto"
                src="/output_result.mp4"
                className="w-full h-full object-cover rounded-lg"
                style={{ display: 'block', backgroundColor: '#000' }}
              >
                <source src="/output_result.mp4" type="video/mp4" />
                <source src="./output_result.mp4" type="video/mp4" />
              </video>
              <div className="absolute top-1.5 end-1.5 z-10 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-emerald-300 border border-emerald-500/30">
                NORMAL · 27p
              </div>
            </div>
          </div>
        )}

        {/* Operations Telemetry Sidebar */}
        <aside className={`ops-panel ${collapsed ? 'collapsed' : ''}`} aria-label={isArabic ? 'لوحة القياس والتوجيه' : 'Telemetry and dispatch panel'} data-testid="panel-telemetry">
          <div className="ops-panel-head">
            {!collapsed && <div><div className="ops-panel-title">{isArabic ? 'لوحة المتابعة' : 'FIELD OVERVIEW'}</div><span className="ops-panel-kicker">{isArabic ? 'مؤشرات توضيحية · محلية' : 'SIMULATED TELEMETRY · LOCAL DEMO'}</span></div>}
            <button className="icon-button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? (isArabic ? 'توسيع لوحة المتابعة' : 'Expand telemetry panel') : (isArabic ? 'طي لوحة المتابعة' : 'Collapse telemetry panel')} data-testid="button-toggle-telemetry">{collapsed ? (isArabic ? <ChevronLeft /> : <ChevronRight />) : (isArabic ? <ChevronRight /> : <ChevronLeft />)}</button>
          </div>
          {!collapsed && <div className="panel-content">
            <div className="telemetry-grid summary-grid">
              <div className="telemetry-card summary-card visitor" data-testid="metric-active-reports"><div className="telemetry-label"><AlertTriangle size={12} /> {isArabic ? 'البلاغات النشطة' : 'Active reports'}</div><div className="telemetry-number">{activeIncidents.length}<small>{isArabic ? 'بلاغ' : 'reports'}</small></div></div>
              <div className="telemetry-card summary-card resolved" data-testid="metric-resolved-reports"><div className="telemetry-label"><CheckCircle2 size={12} /> {isArabic ? 'البلاغات المنجزة' : 'Resolved reports'}</div><div className="telemetry-number">{resolvedIncidents.length}<small>{isArabic ? 'بلاغ' : 'reports'}</small></div></div>
              <div className="telemetry-card summary-card units" data-testid="metric-on-field-units"><div className="telemetry-label"><Users size={12} /> {isArabic ? 'الوحدات الميدانية' : 'On-field units'}</div><div className="telemetry-number">{onFieldCount}<small>{isArabic ? 'متاح + مكلّف' : 'available + assigned'}</small></div></div>
              <div className={`telemetry-card summary-card risk ${risk.className}`} data-testid="metric-risk-status"><div className="telemetry-label"><ShieldCheck size={12} /> {isArabic ? 'مستوى المخاطر الحالي' : 'Current risk status'}</div><div className="telemetry-number risk-value">{isArabic ? risk.ar : risk.en}<small>{peakDensity}%</small></div></div>
            </div>
            <div className="telemetry-card crowd crowd-estimate" data-testid="metric-predicted-crowd"><div className="telemetry-label">{isArabic ? 'إجمالي الحشود المتوقع · تقديري' : 'Predicted crowd estimate'}</div><div className="telemetry-number">{crowdTotal.toLocaleString(isArabic ? 'ar-SA' : 'en-US')}<small>{isArabic ? 'زائر · توضيحي' : 'visitors · illustrative'}</small></div></div>
            <div className="telemetry-section">
              <div className="telemetry-section-title">{isArabic ? 'وحدات الاستجابة' : 'Response units'}<span>{availableCount} {isArabic ? 'متاح' : 'available'} · {assignedCount} {isArabic ? 'مكلّف' : 'assigned'}</span></div>
              {units.slice(0, 4).map(({ person }) => <div className="unit-row" key={person.id} data-testid={`unit-row-${person.id}`}><i className={`unit-indicator ${person.status === 'Assigned' ? 'assigned' : ''} ${person.status === 'Unavailable' ? 'unavailable' : ''}`} /><div className="unit-copy"><strong>{person.name}</strong><small>{person.role} · {person.location}</small></div><span className="unit-status">{person.status === 'Available' ? (isArabic ? 'متاح' : 'READY') : person.status === 'Assigned' ? (isArabic ? 'مكلّف' : 'ASSIGNED') : (isArabic ? 'غير متاح' : 'OFFLINE')}</span></div>)}
            </div>
            <button className="dispatch-action" onClick={dispatchNearest} disabled={!openIncidents.length || !availableCount} data-testid="button-dispatch-nearest"><Navigation />{isArabic ? 'توجيه أقرب فرد متاح' : 'Dispatch Nearest Security Unit'}</button>
            {feedback && <div className={`dispatch-feedback ${feedback.error ? 'error' : ''}`} role={feedback.error ? 'alert' : 'status'} data-testid="status-dispatch-feedback">{feedback.text}</div>}
            <div className="telemetry-section">
              <div className="telemetry-section-title"><span>{isArabic ? 'سجل البلاغات' : 'Incident feed'}</span><span data-testid="text-feed-count">{visibleIncidents.length} {isArabic ? 'بلاغ' : 'records'}</span></div>
              <div className="incident-filters" role="group" aria-label={isArabic ? 'تصفية البلاغات' : 'Filter incidents'} data-testid="filters-incident-feed">
                {(['All', 'Active', 'Resolved'] as IncidentFilter[]).map((option) => <button key={option} type="button" className="incident-filter" aria-pressed={filter === option} onClick={() => setFilter(option)} data-testid={`button-filter-${option.toLowerCase()}`}>{filterLabels[option][lang]}</button>)}
              </div>
              <div className="incident-feed" aria-live="polite" data-testid="list-incident-feed">
                {visibleIncidents.map((incident) => {
                  const remaining = deadlineFor(incident);
                  const seconds = remaining && activeStatus(incident) ? Math.max(0, Math.ceil((remaining - clock.getTime()) / 1000)) : null;
                  return <article className={`feed-incident ${incident.status.toLowerCase()}`} key={incident.id} data-testid={`activity-${incident.id}`}>
                    <div className="feed-topline"><span className="feed-id">{incident.id}</span><span className={`feed-status ${incident.status.toLowerCase()}`} data-testid={`status-incident-${incident.id}`}>{incident.status === 'Resolved' && isArabic ? 'تم الإنجاز' : incident.status === 'Resolved' ? 'Resolved' : incident.status === 'Dismissed' ? (isArabic ? 'ملغي' : 'Dismissed') : incident.status === 'Assigned' ? (isArabic ? 'مكلّف' : 'Assigned') : (isArabic ? 'مفتوح' : 'Open')}</span></div>
                    <div className="feed-location">{incident.type} · {incident.location}</div>
                    {incident.description && <div className="feed-detail">{incident.description}</div>}
                    <div className="feed-meta"><span>{isArabic ? 'وقت البلاغ' : 'Reported'} · {incident.createdAt}</span>{incident.reportedBy === 'Guest' && seconds !== null && <span className={`feed-countdown ${seconds <= 10 ? 'urgent' : ''}`} role="timer" aria-live="off" data-testid={`countdown-${incident.id}`}>{isArabic ? `ينتهي خلال ${seconds}ث` : `Resolves in ${seconds}s`}</span>}{incident.assignedStaff && <span>{isArabic ? 'مكلّف' : 'Assigned'} · {incident.assignedStaff}</span>}</div>
                  </article>;
                })}
                {!visibleIncidents.length && <div className="feed-empty" data-testid="empty-incident-feed">{filter === 'Active' ? (isArabic ? 'لا توجد بلاغات نشطة حالياً.' : 'No active reports right now.') : filter === 'Resolved' ? (isArabic ? 'لا توجد بلاغات منجزة بعد.' : 'No resolved reports yet.') : (isArabic ? 'لا توجد بلاغات في السجل.' : 'No reports in the incident log.')}</div>}
              </div>
            </div>
            <div className="telemetry-section">
              <div className="telemetry-section-title">{isArabic ? 'آخر تحديث توضيحي' : 'Last illustrative update'}<span data-testid="text-last-update">{updateTime}</span></div>
              <div className="panel-caption">{isArabic ? 'تقديرات الحشود ومواقع الوحدات محاكاة محلية وليست بيانات تشغيلية مباشرة. البلاغات المرسلة من الزوار مشتركة بين صفحات العرض وتحمل مهلة إنجاز.' : 'Crowd estimates and unit positions are local simulations, not a real operational feed. Guest reports are shared across demo pages and include a resolution deadline.'}</div>
            </div>
          </div>}
        </aside>
        <div className="map-legend-box" aria-label={isArabic ? 'مفتاح الخريطة' : 'Map legend'}><span className="legend-heading">{isArabic ? 'المفتاح' : 'Legend'}</span><div className="ops-legend"><span><i className="legend-swatch high" />{isArabic ? 'مرتفع' : 'High'}</span><span><i className="legend-swatch medium" />{isArabic ? 'متوسط' : 'Medium'}</span><span><i className="legend-swatch low" />{isArabic ? 'منخفض' : 'Low'}</span><span><i className="legend-swatch unit" />{isArabic ? 'وحدة' : 'Unit'}</span><span><i className="legend-swatch alert" />{isArabic ? 'بلاغ' : 'Report'}</span></div></div>
        <div className="map-footer-note">{isArabic ? 'خريطة OpenStreetMap · جميع مؤشرات الحشود ومواقع الوحدات محاكاة تعليمية وليست تغذية تشغيلية مباشرة' : 'OpenStreetMap base map · crowd metrics and unit positions are educational simulations, not a real operational feed'}</div>
      </main>
    )}
  </div>;
}
