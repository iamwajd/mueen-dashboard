import { useMemo, useState, type FormEvent, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'wouter';
import {
  Activity, AlertTriangle, ArrowDownLeft, ArrowUpRight, Check, ChevronRight,
  Clock3, FileText, Search, Shield, ShieldCheck, Users, Waves, X,
} from 'lucide-react';
import { type Incident, type IncidentType, type StaffMember, useSecurityData } from '../lib/security-data';
import { LocationPickerMap } from '../components/location-picker-map';

export type Language = 'en' | 'ar';
const copy = {
  en: {
    overview: 'Operations overview', staff: 'Staff & dispatch', dashboard: 'Dashboard', personnel: 'Personnel',
    report: 'Guest report', demo: 'SIMULATION · DEMONSTRATION DATA', command: 'SECURITY OPERATIONS',
    monitoring: 'Haram safety coordination', overviewDesc: 'A calm, shared picture for coordinated response.',
    crowd: 'Crowd density', active: 'Active incidents', risk: 'Overall risk', availability: 'Staff available',
    simulated: 'Demonstration estimate', openCases: 'Open cases requiring attention', stable: 'Elevated · manageable',
    onDuty: 'of 124 on-duty personnel', zoneMap: 'Haram zone heatmap', mapHint: 'Simulated crowd density · not a live map',
    prediction: 'Prediction summary', predText: 'Demonstration trend suggests denser footfall around King Fahd Gate over the next 20 minutes. Consider keeping the eastern approach clear.',
    recent: 'Recent incidents', activity: 'Operations activity', viewStaff: 'Open staff directory',
    assigned: 'Assigned', available: 'Available', unavailable: 'Unavailable', dispatch: 'Dispatch',
    findStaff: 'Find personnel', allStatus: 'All availability', selectStaff: 'Select a staff member',
    staffTitle: 'Personnel & dispatch', staffDesc: 'Find available teams and coordinate incident response.',
    search: 'Search by name, role, ID or location', allIncidents: 'Select an open incident',
    staffDetails: 'Personnel details', choosePerson: 'Select a team member to view details and dispatch.',
    role: 'Role', location: 'Location', assignment: 'Current assignment', staffId: 'Personnel ID',
    dispatchTo: 'Dispatch to incident', assignNow: 'Assign personnel', assignedTo: 'Assigned to',
    noIncidents: 'No open incidents to dispatch.', noStaff: 'No personnel match these filters.',
    type: 'Incident', locationLabel: 'Location', status: 'Status', time: 'Time reported',
    reportTitle: 'Report a safety concern', reportDesc: 'Share what you see so the on-site team can respond. This is a demonstration reporting form.',
    reportFormTitle: 'Incident details', formNote: 'Please provide a clear location. No personal information is required.',
    incidentType: 'What is happening?', required: 'Required', selectType: 'Choose an incident type',
    congestion: 'Congestion', medical: 'Medical emergency', fall: 'Fall', obstruction: 'Obstruction', other: 'Other',
    locationPlaceholder: 'e.g. King Fahd Gate, eastern courtyard', description: 'Additional details',
    optional: 'Optional', descriptionHint: 'Share helpful details, without names or sensitive personal information.',
    submit: 'Send incident report', privacy: 'Your report is stored only in this browser demonstration. For urgent assistance, contact on-site security directly.',
    confirmation: 'Report received', confirmationText: 'Your report has been added to the local demonstration incident log for the operations team.',
    reference: 'Reference', another: 'Submit another report', chooseLocation: 'Enter a location to continue.',
    selectIncidentError: 'Choose an incident type to continue.', noReports: 'No incidents have been reported yet.',
    schematic: 'SIMULATED HEATMAP', high: 'High', moderate: 'Moderate', low: 'Lower', liveData: 'Illustrative values only. No live CCTV, GPS, or operational data is connected.',
  },
  ar: {
    overview: 'نظرة عامة على العمليات', staff: 'الأفراد والتوجيه', dashboard: 'لوحة العمليات', personnel: 'الأفراد',
    report: 'بلاغ زائر', demo: 'محاكاة · بيانات توضيحية', command: 'العمليات الأمنية',
    monitoring: 'تنسيق السلامة في الحرم', overviewDesc: 'صورة موحدة وهادئة للاستجابة المنسقة.',
    crowd: 'كثافة الحشود', active: 'البلاغات النشطة', risk: 'مستوى المخاطر', availability: 'الأفراد المتاحون',
    simulated: 'تقدير توضيحي', openCases: 'بلاغات مفتوحة تتطلب المتابعة', stable: 'مرتفع · قابل للإدارة',
    onDuty: 'من أصل ١٢٤ فرداً في المناوبة', zoneMap: 'خريطة كثافة الحشود في الحرم', mapHint: 'كثافة الحشود محاكاة · ليست خريطة مباشرة',
    prediction: 'ملخص التوقعات', predText: 'يشير الاتجاه التوضيحي إلى زيادة الحركة قرب بوابة الملك فهد خلال العشرين دقيقة القادمة. يُنصح بإبقاء المدخل الشرقي خالياً.',
    recent: 'البلاغات الأخيرة', activity: 'نشاط العمليات', viewStaff: 'فتح دليل الأفراد',
    assigned: 'مكلّف', available: 'متاح', unavailable: 'غير متاح', dispatch: 'توجيه',
    findStaff: 'البحث عن الأفراد', allStatus: 'جميع الحالات', selectStaff: 'اختر أحد الأفراد',
    staffTitle: 'الأفراد والتوجيه', staffDesc: 'اعثر على الفرق المتاحة ونسّق الاستجابة للبلاغات.',
    search: 'البحث بالاسم أو الدور أو الرقم أو الموقع', allIncidents: 'اختر بلاغاً مفتوحاً',
    staffDetails: 'تفاصيل الفرد', choosePerson: 'اختر أحد أفراد الفريق لعرض التفاصيل والتوجيه.',
    role: 'الدور', location: 'الموقع', assignment: 'المهمة الحالية', staffId: 'الرقم الوظيفي',
    dispatchTo: 'توجيه إلى بلاغ', assignNow: 'توجيه الفرد', assignedTo: 'مكلّف إلى',
    noIncidents: 'لا توجد بلاغات مفتوحة للتوجيه.', noStaff: 'لا يوجد أفراد مطابقون لهذه المرشحات.',
    type: 'البلاغ', locationLabel: 'الموقع', status: 'الحالة', time: 'وقت البلاغ',
    reportTitle: 'الإبلاغ عن ملاحظة تتعلق بالسلامة', reportDesc: 'شارك ما تراه ليتمكن الفريق الميداني من الاستجابة. هذا نموذج بلاغ توضيحي.',
    reportFormTitle: 'تفاصيل البلاغ', formNote: 'يرجى تحديد الموقع بوضوح. لا حاجة إلى تقديم معلومات شخصية.',
    incidentType: 'ما الذي يحدث؟', required: 'مطلوب', selectType: 'اختر نوع البلاغ',
    congestion: 'ازدحام', medical: 'حالة طبية طارئة', fall: 'سقوط', obstruction: 'عائق', other: 'أخرى',
    locationPlaceholder: 'مثال: بوابة الملك فهد، الساحة الشرقية', description: 'تفاصيل إضافية',
    optional: 'اختياري', descriptionHint: 'أضف تفاصيل مفيدة دون أسماء أو معلومات شخصية حساسة.',
    submit: 'إرسال البلاغ', privacy: 'يُحفظ البلاغ في هذا المتصفح ضمن العرض التوضيحي فقط. للحالات العاجلة، تواصل مباشرة مع الأمن الميداني.',
    confirmation: 'تم استلام البلاغ', confirmationText: 'أُضيف بلاغك إلى سجل البلاغات المحلي التوضيحي لفريق العمليات.',
    reference: 'المرجع', another: 'إرسال بلاغ آخر', chooseLocation: 'أدخل الموقع للمتابعة.',
    selectIncidentError: 'اختر نوع البلاغ للمتابعة.', noReports: 'لا توجد بلاغات حتى الآن.',
    schematic: 'خريطة حرارية توضيحية', high: 'مرتفع', moderate: 'متوسط', low: 'منخفض', liveData: 'قيم توضيحية فقط. لا توجد كاميرات أو GPS أو بيانات تشغيلية مباشرة.',
  },
};

const incidentTypeLabel = (type: IncidentType, lang: Language) => {
  const labels: Record<IncidentType, keyof typeof copy.en> = { Congestion: 'congestion', 'Medical emergency': 'medical', Fall: 'fall', Obstruction: 'obstruction', Other: 'other' };
  return copy[lang][labels[type]];
};
const incidentTitle = (item: Incident, lang: Language) => `${incidentTypeLabel(item.type, lang)} · ${item.location}`;
const statusLabel = (status: string, lang: Language) => status === 'Available' ? copy[lang].available : status === 'Assigned' ? copy[lang].assigned : copy[lang].unavailable;

export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="brand"><div className="brand-mark" data-testid="img-brand-mark"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M40 90 L80 65 L100 50 L120 65 L160 90" stroke="#064E3B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M100 50 V75" stroke="#064E3B" strokeWidth="5" strokeLinecap="round"/>
    <path d="M75 68 V85" stroke="#064E3B" strokeWidth="4" strokeLinecap="round"/>
    <path d="M125 68 V85" stroke="#064E3B" strokeWidth="4" strokeLinecap="round"/>
    <path d="M30 100 C60 135, 140 135, 170 100" stroke="#064E3B" strokeWidth="7" strokeLinecap="round"/>
    <path d="M30 100 C60 65, 140 65, 170 100" stroke="#064E3B" strokeWidth="7" strokeLinecap="round"/>
    <circle cx="100" cy="100" r="32" stroke="#064E3B" strokeWidth="4"/>
    <polygon points="100,70 126,85 126,115 100,130 74,115 74,85" stroke="#E5DFD3" strokeWidth="3" fill="none"/>
    <rect x="88" y="88" width="24" height="24" rx="2" fill="#064E3B"/>
    <path d="M88 94 H112" stroke="#E5DFD3" strokeWidth="3"/>
  </svg></div><div><div className="brand-title">MUEEN</div>{!compact && <div className="brand-sub">HARAM SAFETY SUPPORT</div>}</div></div>;
}

function NavLinks({ lang, active }: { lang: Language; active: 'dashboard' | 'staff' }) {
  const t = copy[lang];
  return <>
    <Link href="/dashboard" className={`nav-link ${active === 'dashboard' ? 'active' : ''}`} data-testid="link-dashboard"><Activity />{t.dashboard}</Link>
    <Link href="/staff" className={`nav-link ${active === 'staff' ? 'active' : ''}`} data-testid="link-staff"><Users />{t.personnel}</Link>
  </>;
}

function StaffShell({ lang, setLang, active, children }: { lang: Language; setLang: (lang: Language) => void; active: 'dashboard' | 'staff'; children: ReactNode }) {
  const t = copy[lang];
  return <div className="app-shell" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <aside className="sidebar"><Brand /><div className="nav-label">{t.command}</div><nav className="nav-links"><NavLinks lang={lang} active={active} /></nav>
      <div className="side-note"><strong>{lang === 'ar' ? 'تنبيه المحاكاة' : 'Demonstration mode'}</strong>{t.liveData}</div>
    </aside>
    <div className="main-column">
      <header className="topbar"><div className="top-label">{t.monitoring}</div><div className="top-actions"><span className="demo-pill">{t.demo}</span><button className="lang-button" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} data-testid="button-language">{lang === 'en' ? 'العربية' : 'English'}</button></div></header>
      <main className="workspace">{children}</main>
      <nav className="mobile-nav"><NavLinks lang={lang} active={active} /></nav>
    </div>
  </div>;
}

function Header({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle?: string; children?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1>{subtitle && <p className="page-subtitle">{subtitle}</p>}</div>{children}</div>;
}
const zoneNames = (lang: Language) => lang === 'ar'
  ? ['بوابة الملك فهد', 'الساحة الشرقية', 'أجياد', 'بوابة الملك عبدالعزيز']
  : ['King Fahd Gate', 'Eastern Courtyard', 'Ajyad', 'King Abdulaziz Gate'];

export function Dashboard({ lang, setLang }: { lang: Language; setLang: (lang: Language) => void }) {
  const t = copy[lang];
  const { incidents, staff } = useSecurityData();
  const openIncidents = incidents.filter((item) => item.status === 'Open');
  const available = staff.filter((person) => person.status === 'Available').length;
  const zones = zoneNames(lang);
  return <StaffShell lang={lang} setLang={setLang} active="dashboard">
    <Header eyebrow={t.command} title={t.overview} subtitle={t.overviewDesc}>
      <div className="small-caps">{new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · 10:46</div>
    </Header>
    <div className="metrics">
      <div className="metric" style={{ '--metric-color': '#68b5a6' } as CSSProperties}><div className="metric-label"><Waves className="metric-icon" />{t.crowd}</div><div className="metric-value">68<span style={{ fontSize: 14, color: '#94a5ad' }}>%</span></div><div className="metric-detail">{t.simulated}</div></div>
      <div className="metric" style={{ '--metric-color': '#d8a759' } as CSSProperties}><div className="metric-label"><AlertTriangle className="metric-icon" />{t.active}</div><div className="metric-value">{openIncidents.length + incidents.filter((i) => i.status === 'Assigned').length}</div><div className="metric-detail">{openIncidents.length} {t.openCases}</div></div>
      <div className="metric" style={{ '--metric-color': '#d78a6f' } as CSSProperties}><div className="metric-label"><ShieldCheck className="metric-icon" />{t.risk}</div><div className="metric-value" style={{ fontSize: 21 }}>{t.stable}</div><div className="metric-detail">{t.simulated}</div></div>
      <div className="metric" style={{ '--metric-color': '#71b8a6' } as CSSProperties}><div className="metric-label"><Users className="metric-icon" />{t.availability}</div><div className="metric-value">{available}</div><div className="metric-detail">{t.onDuty}</div></div>
    </div>
    <div className="content-grid">
      <section className="panel">
        <div className="panel-head"><div><div className="panel-title">{t.zoneMap}</div><div className="panel-caption">{t.mapHint}</div></div><span className="demo-pill">{t.schematic}</span></div>
        <div className="panel-body"><div className="map-wrap"><div className="map-north">N ↑</div>
          <div className="map-canvas">
            <svg className="heatmap-plan" viewBox="0 0 800 360" role="img" aria-label={lang === 'ar' ? 'خريطة حرارية توضيحية لكثافة الحشود في مناطق الحرم' : 'Simulated crowd-density heatmap of Haram zones'}>
              <defs>
                <radialGradient id="heat-high"><stop offset="0%" stopColor="#f26b55" stopOpacity=".88" /><stop offset="43%" stopColor="#e69a50" stopOpacity=".58" /><stop offset="100%" stopColor="#d98b4e" stopOpacity="0" /></radialGradient>
                <radialGradient id="heat-mid"><stop offset="0%" stopColor="#efbd58" stopOpacity=".8" /><stop offset="58%" stopColor="#dfaa4e" stopOpacity=".44" /><stop offset="100%" stopColor="#d5a958" stopOpacity="0" /></radialGradient>
                <radialGradient id="heat-low"><stop offset="0%" stopColor="#62b9a2" stopOpacity=".67" /><stop offset="60%" stopColor="#51a58f" stopOpacity=".34" /><stop offset="100%" stopColor="#51a58f" stopOpacity="0" /></radialGradient>
              </defs>
              <path d="M115 99 Q129 58 193 45 L607 45 Q670 58 685 99 L685 261 Q670 302 607 315 L193 315 Q129 302 115 261 Z" fill="#1a2c35" stroke="#62766f" strokeOpacity=".68" strokeWidth="2" />
              <path d="M145 115 Q158 82 211 70 L589 70 Q642 82 655 115 L655 245 Q642 278 589 290 L211 290 Q158 278 145 245 Z" fill="#20343a" stroke="#465c59" strokeWidth="1.5" />
              <ellipse cx="194" cy="111" rx="150" ry="88" fill="url(#heat-high)" />
              <ellipse cx="606" cy="111" rx="139" ry="84" fill="url(#heat-mid)" />
              <ellipse cx="188" cy="268" rx="126" ry="76" fill="url(#heat-low)" />
              <ellipse cx="613" cy="267" rx="132" ry="75" fill="url(#heat-low)" />
              <path d="M159 130 H278 M522 130 H641 M159 230 H278 M522 230 H641" stroke="#91a59b" strokeOpacity=".35" strokeWidth="2" strokeDasharray="5 7" />
              <ellipse cx="400" cy="180" rx="169" ry="120" fill="none" stroke="#8ca19a" strokeOpacity=".48" strokeWidth="2" />
              <ellipse cx="400" cy="180" rx="143" ry="101" fill="none" stroke="#91a59b" strokeOpacity=".35" strokeWidth="1.5" />
              <ellipse cx="400" cy="180" rx="117" ry="82" fill="#17302e" stroke="#9cb4a6" strokeOpacity=".67" strokeWidth="2" />
              <ellipse cx="400" cy="180" rx="92" ry="63" fill="none" stroke="#76938a" strokeOpacity=".44" strokeWidth="1.5" />
              <rect x="389" y="169" width="22" height="22" rx="1.5" transform="rotate(45 400 180)" fill="#11191c" stroke="#c1a56e" strokeWidth="2" />
              <path d="M391 175 H409" stroke="#c1a56e" strokeWidth="1.5" />
              <circle cx="194" cy="111" r="5" fill="#f18a64" stroke="#f8cf9b" strokeWidth="2" />
              <circle cx="606" cy="111" r="5" fill="#e6b957" stroke="#f8e1a7" strokeWidth="2" />
              <circle cx="188" cy="268" r="5" fill="#62b9a2" stroke="#b2e1d1" strokeWidth="2" />
              <circle cx="613" cy="267" r="5" fill="#62b9a2" stroke="#b2e1d1" strokeWidth="2" />
            </svg>
            <span className="zone risk-high z1">{zones[0]} · {t.high}</span><span className="zone risk-mid z2">{zones[1]} · {t.moderate}</span>
            <span className="zone risk-low z3">{zones[2]} · {t.low}</span><span className="zone risk-low z4">{zones[3]} · {t.low}</span>
          </div></div>
          <div className="map-legend"><span className="small-caps">{t.liveData}</span><div className="legend-items"><span className="legend-item"><i className="dot red" />{t.high}</span><span className="legend-item"><i className="dot amber" />{t.moderate}</span><span className="legend-item"><i className="dot" />{t.low}</span></div></div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><div className="panel-title">{t.prediction}</div><div className="panel-caption">{lang === 'ar' ? 'تقدير قصير المدى · بيانات توضيحية' : 'Short-range estimate · demonstration data'}</div></div><Activity size={15} color="#7cb9aa" /></div>
        <div className="panel-body"><div className="prediction"><strong>{lang === 'ar' ? 'الاتجاه المتوقع · ٢٠ دقيقة' : 'Expected trend · next 20 min'}</strong>{t.predText}</div>
          <div style={{ marginTop: 15 }}><div className="panel-title" style={{ fontSize: 11, marginBottom: 3 }}>{t.recent}</div>
            {incidents.slice(0, 3).map((item) => <div className="signal-line" key={item.id} data-testid={`incident-row-${item.id}`}><div className="signal-icon"><AlertTriangle /></div><div className="signal-copy"><strong>{incidentTitle(item, lang)}</strong><span>{item.id} · {item.createdAt}</span></div><span className={`risk-tag ${item.type === 'Medical emergency' || item.type === 'Fall' ? 'high' : item.type === 'Congestion' ? 'medium' : 'low'}`}>{item.status === 'Open' ? t.dispatch : t.assigned}</span></div>)}
            {!incidents.length && <div className="empty-state">{t.noReports}</div>}
          </div>
          <Link href="/staff" className="button secondary" style={{ marginTop: 12 }} data-testid="link-open-staff"><Users />{t.viewStaff}<ChevronRight /></Link>
        </div>
      </section>
    </div>
    <section className="panel" style={{ marginTop: 14 }}><div className="panel-head"><div><div className="panel-title">{t.activity}</div><div className="panel-caption">{lang === 'ar' ? 'آخر تحديث محلي' : 'Latest local activity'}</div></div><Clock3 size={15} color="#91a4ac" /></div>
      <div className="panel-body" style={{ paddingTop: 6, paddingBottom: 6 }}>
        {incidents.slice(0, 3).map((item) => <div className="activity-row" key={`act-${item.id}`}><i className="activity-dot" /><div className="activity-text">{item.reportedBy === 'Guest' ? (lang === 'ar' ? 'بلاغ زائر جديد' : 'New guest report') : (lang === 'ar' ? 'بلاغ أُضيف إلى سجل العمليات' : 'Incident logged by operations')} · {incidentTitle(item, lang)}<small>{item.id}{item.assignedStaff ? ` · ${t.assignedTo} ${item.assignedStaff}` : ''}</small></div><span className="activity-time">{item.createdAt}</span></div>)}
      </div>
    </section>
  </StaffShell>;
}

export function StaffPage({ lang, setLang }: { lang: Language; setLang: (lang: Language) => void }) {
  const t = copy[lang];
  const { incidents, staff, assignIncident } = useSecurityData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(staff[0]?.id ?? '');
  const [incidentId, setIncidentId] = useState('');
  const [feedback, setFeedback] = useState('');
  const selected = staff.find((item) => item.id === selectedId) ?? staff[0];
  const openIncidents = incidents.filter((item) => item.status === 'Open');
  const filtered = useMemo(() => staff.filter((person) => {
    const matchesText = `${person.name} ${person.id} ${person.role} ${person.location}`.toLowerCase().includes(search.toLowerCase());
    return matchesText && (filter === 'All' || person.status === filter);
  }), [staff, search, filter]);
  const dispatch = () => {
    if (!selected || !incidentId) return;
    const ok = assignIncident(incidentId, selected.id);
    setFeedback(ok ? (lang === 'ar' ? 'تم توجيه الفرد إلى البلاغ.' : 'Personnel assigned to the incident.') : (lang === 'ar' ? 'تعذر إتمام التوجيه. تحقق من حالة الفرد.' : 'Unable to dispatch. Check personnel availability.'));
    if (ok) setIncidentId('');
  };
  return <StaffShell lang={lang} setLang={setLang} active="staff">
    <Header eyebrow={t.command} title={t.staffTitle} subtitle={t.staffDesc}>
      <Link href="/report" className="button secondary" data-testid="link-guest-report"><FileText />{t.report}</Link>
    </Header>
    <div className="staff-layout">
      <section className="panel"><div className="panel-head"><div><div className="panel-title">{t.personnel} <span style={{ color: '#81929d', fontWeight: 400 }}>· {filtered.length}</span></div><div className="panel-caption">{t.findStaff}</div></div></div>
        <div className="panel-body">
          <div className="toolbar" style={{ marginBottom: 13 }}>
            <div className="search-field" style={{ flex: 1 }}><Search /><input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.search} data-testid="input-staff-search" /></div>
            <select className="select filter-select" value={filter} onChange={(e) => setFilter(e.target.value)} data-testid="filter-staff-status"><option value="All">{t.allStatus}</option><option value="Available">{t.available}</option><option value="Assigned">{t.assigned}</option><option value="Unavailable">{t.unavailable}</option></select>
          </div>
          <div className="table-scroll"><table className="staff-table"><thead><tr><th>{t.personnel}</th><th>{t.role}</th><th>{t.status}</th><th>{t.location}</th></tr></thead><tbody>
            {filtered.map((person) => <tr key={person.id} className={selected?.id === person.id ? 'selected' : ''} onClick={() => { setSelectedId(person.id); setFeedback(''); }} data-testid={`row-staff-${person.id}`}>
              <td><div className="staff-name">{person.name}</div><div className="staff-id">{person.id}</div></td><td>{person.role}</td><td><span className={`status-tag ${person.status.toLowerCase()}`}>{statusLabel(person.status, lang)}</span></td><td>{person.location}</td>
            </tr>)}
          </tbody></table>{!filtered.length && <div className="empty-state"><strong>{t.noStaff}</strong>{t.search}</div>}</div>
        </div>
      </section>
      <aside className="panel details">
        <div className="panel-head"><div><div className="panel-title">{t.staffDetails}</div><div className="panel-caption">{t.choosePerson}</div></div><Users size={15} color="#90bdb1" /></div>
        {selected ? <>
          <div className="detail-person"><div className="initials">{selected.name.split(' ').slice(0, 2).map((n) => n[0]).join('')}</div><div><h3>{selected.name}</h3><p>{selected.role}</p></div></div>
          <div className="detail-list">
            <div className="detail-item"><span>{t.staffId}</span><strong>{selected.id}</strong></div>
            <div className="detail-item"><span>{t.status}</span><strong><span className={`status-tag ${selected.status.toLowerCase()}`}>{statusLabel(selected.status, lang)}</span></strong></div>
            <div className="detail-item"><span>{t.location}</span><strong>{selected.location}</strong></div>
            <div className="detail-item"><span>{t.assignment}</span><strong>{selected.assignment}</strong></div>
          </div>
          <div className="dispatch-box"><h4>{t.dispatchTo}</h4>
            <select className="select" value={incidentId} onChange={(e) => setIncidentId(e.target.value)} data-testid="select-dispatch-incident"><option value="">{t.allIncidents}</option>{openIncidents.map((item) => <option key={item.id} value={item.id}>{item.id} · {incidentTypeLabel(item.type, lang)} · {item.location}</option>)}</select>
            {feedback && <div className="notice" role="status" style={{ marginBottom: 9 }}>{feedback}</div>}
            <button className="button" style={{ width: '100%' }} disabled={selected.status !== 'Available' || !incidentId} onClick={dispatch} data-testid="button-assign-staff"><ArrowUpRight />{t.assignNow}</button>
            {selected.status !== 'Available' && <div className="panel-caption" style={{ marginTop: 8 }}>{lang === 'ar' ? 'يجب أن يكون الفرد متاحاً للتوجيه.' : 'Personnel must be available to dispatch.'}</div>}
            {!openIncidents.length && <div className="panel-caption" style={{ marginTop: 8 }}>{t.noIncidents}</div>}
          </div>
        </> : <div className="empty-state">{t.choosePerson}</div>}
      </aside>
    </div>
  </StaffShell>;
}

const typeOptions: IncidentType[] = ['Congestion', 'Medical emergency', 'Fall', 'Obstruction', 'Other'];
export function ReportPage({ lang, setLang }: { lang: Language; setLang: (lang: Language) => void }) {
  const t = copy[lang];
  const { addIncident } = useSecurityData();
  const [type, setType] = useState<IncidentType | ''>('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ type?: string; location?: string }>({});
  const [submitted, setSubmitted] = useState<Incident | null>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: { type?: string; location?: string } = {};
    if (!type) nextErrors.type = t.selectIncidentError;
    if (!location.trim()) nextErrors.location = t.chooseLocation;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSubmitted(addIncident({ type: type as IncidentType, location: location.trim(), description: description.trim() }));
  };
  const reset = () => { setSubmitted(null); setType(''); setLocation(''); setDescription(''); setErrors({}); };
  return <div className="report-page" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <header className="report-header"><Brand compact /><div className="top-actions"><span className="demo-pill">{t.demo}</span><button className="lang-button" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} data-testid="button-language">{lang === 'en' ? 'العربية' : 'English'}</button></div></header>
    <main className="report-content">
      <section className="report-intro"><div className="eyebrow">{lang === 'ar' ? 'الحرم المكي · السلامة' : 'AL-MASJID AL-HARAM · SAFETY'}</div><h1 className="page-title">{t.reportTitle}</h1><p className="page-subtitle">{t.reportDesc}</p>
        <div className="report-trust"><span className="shield"><Shield size={17} /></span><p><strong>{lang === 'ar' ? 'مساعدة عملية، دون بيانات شخصية' : 'Practical help, no personal data'}</strong>{t.privacy}</p></div>
      </section>
      <section className="report-form" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {!submitted ? <form onSubmit={submit} noValidate>
          <h2 className="form-title">{t.reportFormTitle}</h2><p className="form-note">{t.formNote}</p>
          <div className="field"><label>{t.incidentType} <span className="required">*</span></label>
            <div className="type-grid" role="group" aria-label={t.incidentType}>{typeOptions.map((option) => <button type="button" key={option} className={`type-choice ${type === option ? 'chosen' : ''}`} aria-pressed={type === option} onClick={() => { setType(option); setErrors((old) => ({ ...old, type: undefined })); }} data-testid={`button-type-${option.toLowerCase().replaceAll(' ', '-')}`}>{incidentTypeLabel(option, lang)}</button>)}</div>
            {errors.type && <div className="error-text" role="alert" data-testid="error-incident-type">{errors.type}</div>}
          </div>
          <div className="field">
            <label htmlFor="report-location">{t.locationLabel} <span className="required">*</span></label>
            <input id="report-location" className="input" value={location} onChange={(e) => { setLocation(e.target.value); setErrors((old) => ({ ...old, location: undefined })); }} placeholder={t.locationPlaceholder} aria-invalid={!!errors.location} data-testid="input-report-location" />
            {errors.location && <div className="error-text" role="alert" data-testid="error-report-location">{errors.location}</div>}
            <LocationPickerMap
              selectedLocationName={location}
              onLocationChange={(newLocation) => {
                setLocation(newLocation);
                setErrors((old) => ({ ...old, location: undefined }));
              }}
              lang={lang}
            />
          </div>
          <div className="field"><label htmlFor="report-description">{t.description} <span style={{ color: '#84949f', fontWeight: 400 }}>· {t.optional}</span></label><textarea id="report-description" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.descriptionHint} data-testid="input-report-description" /></div>
          <button type="submit" className="button submit-report" data-testid="button-submit-report"><ArrowDownLeft />{t.submit}</button>
        </form> : <div className="success-state" role="status" data-testid="report-confirmation">
          <div className="success-mark"><Check size={22} /></div><h2>{t.confirmation}</h2><p>{t.confirmationText}</p><div className="confirmation-id">{t.reference} · {submitted.id}</div><br /><button className="button secondary" onClick={reset} data-testid="button-another-report"><X />{t.another}</button>
        </div>}
      </section>
    </main>
    <footer className="report-footer">{lang === 'ar' ? 'مُعين · نموذج دعم السلامة التوضيحي' : 'MUEEN · Safety support demonstration'}</footer>
  </div>;
}
