import { createMockSource, temperatureAt } from '@/api/mockApi';
import type { LayerDefinition } from '@/domain/types';
import { DEFAULT_RANGE } from './timeRange';

export const temperature: LayerDefinition = {
  id: 'temperature',
  title: 'Температура',
  unit: '°C',
  render: 'heatmap',
  style: {
    domain: [0, 30],
    accent: '#f97316',
    colorStops: [
      [0, '#2c7bb6'],
      [10, '#abd9e9'],
      [18, '#ffffbf'],
      [24, '#fdae61'],
      [30, '#d7191c'],
    ],
  },
  timeRange: DEFAULT_RANGE,
  source: createMockSource({ geometry: 'point', value: temperatureAt }),
};
