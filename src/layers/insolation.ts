import { createMockSource, insolationAt } from '@/api/mockApi';
import type { LayerDefinition } from '@/domain/types';
import { DEFAULT_RANGE } from './timeRange';

export const insolation: LayerDefinition = {
  id: 'insolation',
  title: 'Инсоляция',
  unit: 'Вт/м²',
  render: 'fill',
  style: {
    domain: [0, 900],
    accent: '#facc15',
    colorStops: [
      [0, '#2d004b'],
      [300, '#b2182b'],
      [600, '#fee08b'],
      [900, '#ffffcc'],
    ],
  },
  timeRange: DEFAULT_RANGE,
  source: createMockSource({ geometry: 'polygon', value: insolationAt }),
};
