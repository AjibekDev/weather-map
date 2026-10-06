import { bracketTime } from '@/domain/time';
import { setPlaying, setTime } from '@/store/actions';
import { useIsPlaying, useSelectedTime, useTimeSteps } from '@/store/hooks';
import { formatTime } from '../format';

/** Slider resolution: minutes, so dragging is as smooth as playback. */
const SLIDER_STEP_MS = 60_000;

export function Timeline() {
  const steps = useTimeSteps();
  const time = useSelectedTime();
  const isPlaying = useIsPlaying();

  const first = steps[0];
  const last = steps[steps.length - 1];
  if (first === undefined || last === undefined || !time) return null;

  const { prev, next, ratio } = bracketTime(time, steps);
  const nearest = ratio < 0.5 ? prev : next;
  const position = (t: number) => `${((t - first) / (last - first)) * 100}%`;

  function scrub(value: number) {
    if (isPlaying) setPlaying(false);
    setTime(value);
  }

  return (
    <section className="panel timeline">
      <button
        type="button"
        className="timeline__play"
        onClick={() => setPlaying(!isPlaying)}
        aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>

      <div className="timeline__track">
        <input
          type="range"
          className="timeline__slider"
          min={first}
          max={last}
          step={SLIDER_STEP_MS}
          value={time}
          onChange={(e) => scrub(Number(e.target.value))}
          aria-label="Выбранное время"
        />
        <div className="timeline__ticks">
          {steps.map((t, i) => (
            <button
              key={t}
              type="button"
              className={[
                'timeline__tick',
                t === nearest && 'timeline__tick--active',
                i % 2 === 1 && 'timeline__tick--minor',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ left: position(t) }}
              onClick={() => scrub(t)}
            >
              {formatTime(t)}
            </button>
          ))}
        </div>
      </div>

      <output className="timeline__current">{formatTime(time)}</output>
    </section>
  );
}
