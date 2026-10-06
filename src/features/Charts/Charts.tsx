import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { bracketTime, lerp } from '@/domain/time';
import type { LayerDefinition, SeriesPoint, Timestamp } from '@/domain/types';
import { LAYERS } from '@/layers/registry';
import { setPlaying, setTime } from '@/store/actions';
import { useActiveLayerIds, useLayerSeries, useSelectedTime } from '@/store/hooks';
import { formatTime, formatValue } from '../format';

/**
 * One small chart per active layer: units differ (°C, m/s, W/m²),
 * so a shared Y axis would flatten everything but insolation.
 */
export function Charts() {
  const activeIds = useActiveLayerIds();
  const layers = LAYERS.filter((layer) => activeIds.includes(layer.id));

  return (
    <section className="panel">
      <h2 className="panel__title">Среднее по области</h2>
      {layers.length === 0 && <p className="muted">Включите слой, чтобы увидеть график</p>}
      {layers.map((layer) => (
        <LayerChart key={layer.id} layer={layer} />
      ))}
    </section>
  );
}

function LayerChart({ layer }: { layer: LayerDefinition }) {
  const series = useLayerSeries(layer.id);
  const time = useSelectedTime();

  if (!series) return <div className="chart chart--loading">Загрузка…</div>;

  const current = valueAt(series, time);
  const color = layer.style.accent;

  // Two-way sync: clicking a point on the chart moves the whole app to that time.
  function selectPoint(index: unknown) {
    const point = series?.[Number(index)];
    if (!point) return;
    setPlaying(false);
    setTime(point.t);
  }

  return (
    <div className="chart">
      <div className="chart__header">
        <span>{layer.title}</span>
        {current !== null && <strong>{formatValue(current, layer.unit)}</strong>}
      </div>
      <ResponsiveContainer width="100%" height={110}>
        <LineChart
          data={series as SeriesPoint[]}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
          onClick={(state) => selectPoint(state.activeTooltipIndex)}
          style={{ cursor: 'pointer' }}
        >
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatTime}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            stroke="var(--grid)"
            minTickGap={24}
          />
          <YAxis
            width={40}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            stroke="var(--grid)"
            domain={['auto', 'auto']}
          />
          <Tooltip
            labelFormatter={(t) => formatTime(Number(t))}
            formatter={(v) => [formatValue(Number(v), layer.unit), layer.title]}
            contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
          <ReferenceLine x={time} stroke="var(--text)" strokeDasharray="3 3" />
          {current !== null && (
            <ReferenceDot x={time} y={current} r={4} fill={color} stroke="var(--text)" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Series value at fractional time — the same interpolation the map uses. */
function valueAt(series: readonly SeriesPoint[], time: Timestamp): number | null {
  if (series.length === 0) return null;
  const steps = series.map((p) => p.t);
  const { prev, next, ratio } = bracketTime(time, steps);
  const a = series[steps.indexOf(prev)]!.value;
  const b = series[steps.indexOf(next)]!.value;
  return lerp(a, b, ratio);
}
