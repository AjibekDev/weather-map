import { createMockSource, windDirectionAt, windSpeedAt } from '@/api/mockApi';
import type { LayerDefinition } from '@/domain/types';
import { DEFAULT_RANGE } from './timeRange';

/** Speed is drawn as circles; `direction` is rendered as arrows by the map controller. */
export const wind: LayerDefinition = {
  id: 'wind',
  title: 'Ветер',
  unit: 'м/с',
  render: 'circle',
  style: {
    domain: [0, 12],
    accent: '#38bdf8',
    arrows: true,
    colorStops: [
      [0, '#e0f3f8'],
      [4, '#7bccc4'],
      [8, '#2b8cbe'],
      [12, '#08589e'],
    ],
  },
  timeRange: DEFAULT_RANGE,
  source: createMockSource({ geometry: 'point', value: windSpeedAt, direction: windDirectionAt }),
};
