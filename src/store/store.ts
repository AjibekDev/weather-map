import type { Frame, FrameKey, LayerId, SeriesPoint, Timestamp } from '@/domain/types';
import { createVedro } from 'vedro';
// The class is imported from its own module: vedro ships CJS with `exports.default`,
// and the default-import interop breaks in Vite dev ("Vedro is not a constructor").
import { Vedro } from 'vedro/lib/_Vedro';

export interface AppState {
  activeLayerIds: LayerId[];
  selectedTime: Timestamp;
  isPlaying: boolean;
  loading: Record<LayerId, boolean>;
  errors: Record<LayerId, string | null>;
  frames: Record<FrameKey, Frame>;
  series: Record<LayerId, readonly SeriesPoint[]>;
}

const initialState: AppState = {
  activeLayerIds: [],
  selectedTime: 0,
  isPlaying: false,
  loading: {},
  errors: {},
  frames: {},
  series: {},
};

export type AppStore = Vedro<AppState>;

export const store: AppStore = new Vedro<AppState>('app', initialState);
export const { Provider: StoreProvider, useSelector } = createVedro(store);
