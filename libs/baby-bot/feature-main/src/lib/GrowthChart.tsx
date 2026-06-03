import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGrowthChart } from '@acme/baby-bot-data-access';
import { Skeleton } from '@acme/baby-bot-ui';
import type { GrowthChartResponse, WhoPercentileRow } from '@acme/baby-bot-domain';
import styles from './GrowthChart.module.css';

type Metric = 'weight' | 'height' | 'head';

const TABS: { value: Metric; label: string; unit: string }[] = [
  { value: 'weight', label: 'Вес', unit: 'кг' },
  { value: 'height', label: 'Рост', unit: 'см' },
  { value: 'head', label: 'Окр. головы', unit: 'см' },
];

const PERCENTILE_COLORS: { key: keyof WhoPercentileRow; label: string; color: string; dash?: string }[] = [
  { key: 'p3', label: 'P3', color: '#ef4444', dash: '6,3' },
  { key: 'p15', label: 'P15', color: '#f97316' },
  { key: 'p50', label: 'P50', color: '#22c55e' },
  { key: 'p85', label: 'P85', color: '#f97316' },
  { key: 'p97', label: 'P97', color: '#ef4444', dash: '6,3' },
];

const DATE_FMT = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDate = (iso: string) => DATE_FMT.format(new Date(`${iso}T00:00:00`));

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.4375;
function ageMonthsFloat(birthDate: string, date: string): number {
  return (new Date(`${date}T00:00:00`).getTime() - new Date(`${birthDate}T00:00:00`).getTime()) / MS_PER_MONTH;
}

function metricValue(dp: GrowthChartResponse['data_points'][number], metric: Metric): number | null {
  if (metric === 'weight') return dp.weight_kg;
  if (metric === 'height') return dp.height_cm;
  return dp.head_circumference_cm;
}

function percentileRows(res: GrowthChartResponse, metric: Metric): WhoPercentileRow[] {
  if (metric === 'weight') return res.percentiles.weightForAge;
  if (metric === 'height') return res.percentiles.heightForAge;
  return res.percentiles.headCircumferenceForAge;
}

interface ChartPoint {
  x: number;
  y: number;
  date: string;
}
interface ChartLine {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  dash?: string;
  label: string;
}

function GrowthSvgChart({
  childPoints,
  percentileLines,
  maxMonth,
  yMin,
  yMax,
  unit,
}: {
  childPoints: ChartPoint[];
  percentileLines: ChartLine[];
  maxMonth: number;
  yMin: number;
  yMax: number;
  unit: string;
}) {
  const pad = { top: 20, right: 16, bottom: 36, left: 48 };
  const svgW = 600;
  const svgH = 320;
  const chartW = svgW - pad.left - pad.right;
  const chartH = svgH - pad.top - pad.bottom;

  const xScale = (x: number) => pad.left + (x / maxMonth) * chartW;
  const yScale = (y: number) => pad.top + chartH - ((y - yMin) / (yMax - yMin)) * chartH;

  const yTicks = 5;
  const yStep = (yMax - yMin) / yTicks;
  const yGrid = Array.from({ length: yTicks + 1 }, (_, i) => yMin + yStep * i);
  const xTicks =
    maxMonth <= 12
      ? Array.from({ length: Math.min(maxMonth, 12) + 1 }, (_, i) => i)
      : [0, 3, 6, 9, 12, 18, 24, 30, 36].filter((m) => m <= maxMonth);

  const toPath = (points: { x: number; y: number }[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.x).toFixed(1)},${yScale(p.y).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className={styles.svg}>
      {yGrid.map((v) => (
        <g key={v}>
          <line x1={pad.left} y1={yScale(v)} x2={svgW - pad.right} y2={yScale(v)} stroke="#e5e7eb" strokeWidth={1} />
          <text x={pad.left - 6} y={yScale(v) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      {xTicks.map((m) => (
        <g key={m}>
          <line x1={xScale(m)} y1={pad.top} x2={xScale(m)} y2={svgH - pad.bottom} stroke="#e5e7eb" strokeWidth={1} />
          <text x={xScale(m)} y={svgH - pad.bottom + 16} textAnchor="middle" fontSize={10} fill="#9ca3af">
            {m}
          </text>
        </g>
      ))}
      <text x={pad.left + chartW / 2} y={svgH - 4} textAnchor="middle" fontSize={11} fill="#6b7280">
        мес
      </text>
      <text
        x={14}
        y={pad.top + chartH / 2}
        textAnchor="middle"
        fontSize={11}
        fill="#6b7280"
        transform={`rotate(-90,14,${pad.top + chartH / 2})`}
      >
        {unit}
      </text>
      {percentileLines.map((line) => (
        <path
          key={line.label}
          d={toPath(line.points)}
          fill="none"
          stroke={line.color}
          strokeWidth={line.width}
          strokeDasharray={line.dash || 'none'}
          opacity={0.5}
        />
      ))}
      {childPoints.length > 1 && (
        <path d={toPath(childPoints)} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinejoin="round" />
      )}
      {childPoints.map((p, i) => (
        <circle key={i} cx={xScale(p.x)} cy={yScale(p.y)} r={4} fill="#3b82f6" stroke="white" strokeWidth={2} />
      ))}
    </svg>
  );
}

export function GrowthChart() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Metric>('weight');
  const { data, isLoading } = useGrowthChart();

  const chart = useMemo(() => {
    if (!data) return null;
    const rows = percentileRows(data, tab);
    const todayStr = new Date().toISOString().slice(0, 10);
    const maxMonth = Math.min(36, Math.max(ageMonthsFloat(data.child.birth_date, todayStr), 12));

    const childPoints: ChartPoint[] = data.data_points
      .map((dp) => {
        const val = metricValue(dp, tab);
        if (val == null) return null;
        const x = ageMonthsFloat(data.child.birth_date, dp.date);
        if (x < 0) return null;
        return { x, y: val, date: dp.date };
      })
      .filter((p): p is ChartPoint => p !== null);

    const allY = childPoints.map((p) => p.y);
    for (const row of rows) if (row.month <= maxMonth) allY.push(row.p3, row.p50, row.p97);
    const yMin = allY.length ? Math.floor(Math.min(...allY) * 2) / 2 - 1 : 0;
    const yMax = allY.length ? Math.ceil(Math.max(...allY) * 2) / 2 + 1 : 10;

    const percentileLines: ChartLine[] = PERCENTILE_COLORS.map((pc) => ({
      points: rows.filter((r) => r.month <= maxMonth).map((r) => ({ x: r.month, y: r[pc.key] as number })),
      color: pc.color,
      width: pc.key === 'p50' ? 1.8 : 1,
      dash: pc.dash,
      label: pc.label,
    }));

    return { childPoints, percentileLines, maxMonth, yMin, yMax };
  }, [data, tab]);

  const unit = TABS.find((t) => t.value === tab)?.unit ?? '';

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button type="button" className={styles.back} onClick={() => navigate(-1)}>
          ← Назад
        </button>
        <h1 className={styles.title}>Графики роста</h1>
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`${styles.tab} ${tab === t.value ? styles.tabActive : ''}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading || !data || !chart ? (
        <div className={styles.body}>
          <Skeleton height={240} />
        </div>
      ) : (
        <div className={styles.body}>
          {data.child.gender && (
            <p className={styles.meta}>
              Пол: {data.child.gender === 'male' ? 'мальчик' : 'девочка'} · Дата рождения: {fmtDate(data.child.birth_date)}
            </p>
          )}

          <div className={styles.chartCard}>
            <GrowthSvgChart
              childPoints={chart.childPoints}
              percentileLines={chart.percentileLines}
              maxMonth={chart.maxMonth}
              yMin={chart.yMin}
              yMax={chart.yMax}
              unit={unit}
            />
          </div>

          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={styles.legendLine} style={{ borderTopColor: '#3b82f6', borderTopStyle: 'solid' }} /> Ребёнок
            </span>
            {PERCENTILE_COLORS.map((pc) => (
              <span key={pc.label} className={styles.legendItem}>
                <span
                  className={styles.legendLine}
                  style={{ borderTopColor: pc.color, borderTopStyle: pc.dash ? 'dashed' : 'solid' }}
                />
                {pc.label}
              </span>
            ))}
          </div>

          {chart.childPoints.length === 0 ? (
            <p className={styles.empty}>Нет данных для отображения</p>
          ) : (
            <div className={styles.table}>
              <h3 className={styles.tableTitle}>Данные</h3>
              {chart.childPoints.map((p, i) => (
                <div key={i} className={styles.tableRow}>
                  <span className={styles.tableDate}>{fmtDate(p.date)}</span>
                  <span className={styles.tableValue}>
                    {p.y.toFixed(1)} {unit}
                  </span>
                  <span className={styles.tableAge}>{p.x.toFixed(1)} мес</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
