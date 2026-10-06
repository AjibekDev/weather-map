import type { LayerId } from '@/domain/types';
import { selectTimeSteps } from './selectors';
import { useSelector } from './store';

export const useSelectedTime = () => useSelector((s) => s.selectedTime);
export const useIsPlaying = () => useSelector((s) => s.isPlaying);
export const useActiveLayerIds = () => useSelector((s) => s.activeLayerIds);
export const useTimeSteps = () => useSelector((s) => selectTimeSteps(s));

export const useLayerStatus = (layerId: LayerId) =>
  useSelector((s) => ({ loading: s.loading[layerId] ?? false, error: s.errors[layerId] ?? null }));

export const useLayerSeries = (layerId: LayerId) => useSelector((s) => s.series[layerId] ?? null);
