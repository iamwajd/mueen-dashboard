import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Activity, BrainCircuit, TrendingUp, Users, Gauge, Info } from 'lucide-react';

interface FlowDataPoint {
  timestamp: string;
  peopleCount: number;
  density: number;
}

interface CrowdFlowChartProps {
  lang?: 'ar' | 'en';
  className?: string;
}

// Generates an initial rolling window of past timestamps and realistic readings
function generateInitialHistory(count = 20): FlowDataPoint[] {
  const points: FlowDataPoint[] = [];
  const now = Date.now();
  let basePeople = 27;

  for (let i = count - 1; i >= 0; i--) {
    const time = new Date(now - i * 2000);
    const ts = time.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    // Random walk bounded between 18 and 38
    basePeople = Math.max(16, Math.min(38, basePeople + (Math.random() - 0.49) * 3));
    const roundedPeople = Math.round(basePeople);
    // Density realistically correlated with people count in ~60m² scene: ~0.25 - 0.65 p/m²
    const densityVal = Number((roundedPeople / 62 + (Math.random() - 0.5) * 0.04).toFixed(2));
    const boundedDensity = Math.max(0.22, Math.min(0.78, densityVal));

    points.push({
      timestamp: ts,
      peopleCount: roundedPeople,
      density: boundedDensity,
    });
  }
  return points;
}

// Heuristic prediction logic inspired by D:\mueen\predictor.py
function calculatePredictorMetrics(series: FlowDataPoint[]) {
  if (series.length < 5) {
    return { level: 'NORMAL', confidence: 95, slope: 0, projectedDensity: 0.42 };
  }
  const densities = series.map((s) => s.density);
  const n = densities.length;
  // Calculate slope over recent window
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += densities[i];
    sumXY += i * densities[i];
    sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
  const lastDensity = densities[n - 1];
  // 60-second projection (similar to PRED_HORIZON_SEC in config.py)
  const projected = Math.max(0.2, Math.min(0.9, lastDensity + slope * 15));

  let level: 'NORMAL' | 'MEDIUM' | 'HIGH' = 'NORMAL';
  if (projected > 0.8) level = 'HIGH';
  else if (projected > 0.6) level = 'MEDIUM';

  const confidence = Math.min(99, Math.max(88, Math.round(96 - Math.abs(slope) * 200)));

  return {
    level,
    confidence,
    slope: Number(slope.toFixed(4)),
    projectedDensity: Number(projected.toFixed(2)),
  };
}

export function CrowdFlowChart({ lang = 'ar', className = '' }: CrowdFlowChartProps) {
  const isArabic = lang === 'ar';
  const [data, setData] = useState<FlowDataPoint[]>(() => generateInitialHistory(22));

  // Dynamic real-time update interval (every 2 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setData((prev) => {
        const last = prev[prev.length - 1];
        const nextTime = new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        // Fluctuating count between 15 and 40 (centered around 26-28)
        const step = (Math.random() - 0.48) * 2.8;
        const nextPeople = Math.max(16, Math.min(38, Math.round((last ? last.peopleCount : 27) + step)));

        // Fluctuating density between 0.2 and 0.8 p/m²
        const densityStep = (Math.random() - 0.5) * 0.05;
        const rawDensity = nextPeople / 62 + densityStep;
        const nextDensity = Number(Math.max(0.22, Math.min(0.78, rawDensity)).toFixed(2));

        const nextPoint: FlowDataPoint = {
          timestamp: nextTime,
          peopleCount: nextPeople,
          density: nextDensity,
        };

        // Maintain rolling window of 24 points
        return [...prev.slice(1), nextPoint];
      });
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  const latest = data[data.length - 1] ?? { peopleCount: 27, density: 0.42, timestamp: '--:--:--' };
  const prediction = useMemo(() => calculatePredictorMetrics(data), [data]);

  return (
    <div
      className={`crowd-flow-card flex flex-col bg-[#111e19]/95 border border-[#2b3a30] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl ${className}`}
      dir={isArabic ? 'rtl' : 'ltr'}
      data-testid="crowd-flow-analysis-chart-card"
    >
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#243329] bg-[#14231d]/90">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#e8f1eb] tracking-wide flex items-center gap-2">
              <span>{isArabic ? 'تدفق الحشود مع الوقت' : 'Crowd Flow Over Time'}</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-[#8ea394] mt-0.5">
              {isArabic
                ? 'تحليل التدفق الحي ومعدل الكثافة المكانية الآنية'
                : 'Real-time dual-axis pedestrian count & crowd density metrics'}
            </p>
          </div>
        </div>

        {/* Legend Badges as specified in the prompt */}
        <div className="flex items-center gap-2 select-none">
          {/* Badge: تعداد الأشخاص (Left Y-Axis) */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#142920] border border-emerald-500/40 text-emerald-300 text-xs shadow-sm"
            title={isArabic ? 'المحور الرأسي الأيسر: تعداد الأشخاص' : 'Left Y-Axis: People Count'}
            data-testid="badge-people-count"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
            <span className="font-semibold text-[11px]">
              {isArabic ? 'تعداد الأشخاص' : 'People Count'}
            </span>
            <span className="font-mono font-bold text-[12px] text-white bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30">
              {latest.peopleCount}
            </span>
          </div>

          {/* Badge: الكثافة (شخص/م²) (Right Y-Axis) */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2b1919] border border-red-500/40 text-red-300 text-xs shadow-sm"
            title={isArabic ? 'المحور الرأسي الأيمن: الكثافة (شخص/م²)' : 'Right Y-Axis: Density (p/m²)'}
            data-testid="badge-density"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_6px_#ef4444]" />
            <span className="font-semibold text-[11px]">
              {isArabic ? 'الكثافة (شخص/م²)' : 'Density (p/m²)'}
            </span>
            <span className="font-mono font-bold text-[12px] text-white bg-red-950/80 px-1.5 py-0.2 rounded border border-red-500/30">
              {latest.density}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="p-3 bg-[#0d1713]/90 relative">
        <div className="w-full h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 12, right: 14, left: 14, bottom: 4 }}
            >
              <defs>
                {/* Gradient for Green Curve (People Count) */}
                <linearGradient id="flowGreenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                {/* Gradient for Orange/Red Curve (Density) */}
                <linearGradient id="flowRedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              {/* Subtle gridlines matching D:\mueen original styling */}
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(106, 151, 192, 0.15)"
                vertical={false}
              />

              {/* X-Axis: Dynamic real-time moving timestamps */}
              <XAxis
                dataKey="timestamp"
                stroke="#6A97C0"
                tick={{ fill: '#8ea394', fontSize: 10, fontFamily: 'monospace' }}
                tickLine={{ stroke: 'rgba(106, 151, 192, 0.2)' }}
                axisLine={{ stroke: 'rgba(106, 151, 192, 0.25)' }}
                minTickGap={20}
              />

              {/* Left Y-Axis: تعداد الأشخاص (Fluctuating green curve between 15 and 40) */}
              <YAxis
                yAxisId="people"
                orientation={isArabic ? 'right' : 'left'}
                domain={[10, 45]}
                stroke="#10b981"
                tick={{ fill: '#10b981', fontSize: 10, fontFamily: 'monospace' }}
                tickLine={{ stroke: 'rgba(16, 185, 129, 0.3)' }}
                axisLine={{ stroke: 'rgba(16, 185, 129, 0.3)' }}
                width={36}
              />

              {/* Right Y-Axis: الكثافة (شخص/م²) (Fluctuating orange/red curve between 0.2 and 0.8) */}
              <YAxis
                yAxisId="density"
                orientation={isArabic ? 'left' : 'right'}
                domain={[0, 1.0]}
                stroke="#ef4444"
                tick={{ fill: '#ef4444', fontSize: 10, fontFamily: 'monospace' }}
                tickLine={{ stroke: 'rgba(239, 68, 68, 0.3)' }}
                axisLine={{ stroke: 'rgba(239, 68, 68, 0.3)' }}
                width={38}
              />

              {/* Custom Dark Theme Tooltip */}
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const peopleVal = payload.find((p) => p.dataKey === 'peopleCount')?.value;
                  const densityVal = payload.find((p) => p.dataKey === 'density')?.value;

                  return (
                    <div
                      className="p-2.5 rounded-xl bg-[#0a1622]/95 border border-[#6A97C0]/30 shadow-2xl backdrop-blur-md text-xs font-sans select-none min-w-[170px]"
                      dir={isArabic ? 'rtl' : 'ltr'}
                    >
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#2b3d4f] text-[#c0d6e8] font-mono text-[11px]">
                        <span>{label}</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-950/90 text-emerald-300 text-[10px] border border-emerald-500/30">
                          {isArabic ? 'مباشر' : 'LIVE'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-emerald-300">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                            <span>{isArabic ? 'تعداد الأشخاص:' : 'People Count:'}</span>
                          </span>
                          <span className="font-mono font-bold text-white">
                            {peopleVal} {isArabic ? 'شخص' : 'p'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-red-300">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                            <span>{isArabic ? 'الكثافة:' : 'Density:'}</span>
                          </span>
                          <span className="font-mono font-bold text-white">
                            {densityVal} {isArabic ? 'شخص/م²' : 'p/m²'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              {/* Left Y-Axis Area (Green Curve) */}
              <Area
                yAxisId="people"
                type="monotone"
                dataKey="peopleCount"
                name={isArabic ? 'تعداد الأشخاص' : 'People Count'}
                stroke="#10b981"
                strokeWidth={2.4}
                fill="url(#flowGreenGradient)"
                dot={false}
                activeDot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#0a1a14' }}
                isAnimationActive={false}
              />

              {/* Right Y-Axis Area (Orange/Red Curve) */}
              <Area
                yAxisId="density"
                type="monotone"
                dataKey="density"
                name={isArabic ? 'الكثافة (شخص/م²)' : 'Density (p/m²)'}
                stroke="#ef4444"
                strokeWidth={2.4}
                fill="url(#flowRedGradient)"
                dot={false}
                activeDot={{ r: 4, stroke: '#ef4444', strokeWidth: 2, fill: '#1a0a0a' }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* AI Predictor Summary Footer referencing D:\mueen\predictor.py */}
        <div className="mt-2.5 pt-2.5 border-t border-[#1e2f25] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#93a89a]">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#172820] text-emerald-300 border border-emerald-500/25 font-mono text-[10px]">
              <BrainCircuit className="w-3 h-3 text-emerald-400" />
              <span>
                {isArabic ? 'تنبؤ الذكاء الاصطناعي (AI Risk Prediction)' : 'AI Risk Prediction'}
              </span>
            </span>
            <span className="font-semibold text-emerald-400">
              {prediction.level}
            </span>
            <span className="text-[#6d8274] font-mono text-[10px]">
              ({prediction.confidence}% {isArabic ? 'ثقة' : 'confidence'})
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px] text-[#8ea394]">
            <span>
              {isArabic ? 'أفق التوقع:' : 'Horizon:'} <strong className="text-white">60s</strong>
            </span>
            <span>
              {isArabic ? 'ميل التدفق:' : 'Slope:'}{' '}
              <strong className={prediction.slope >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {prediction.slope >= 0 ? `+${prediction.slope}` : prediction.slope} /s
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
