import { useEffect } from 'react';
import { Charts } from './features/Charts/Charts';
import { LayerPanel } from './features/LayerPanel/LayerPanel';
import { Timeline } from './features/Timeline/Timeline';
import { MapView } from './map/MapView';
import { initApp } from './store/actions';
import { initPlayback } from './store/playback';

function App() {
  useEffect(() => {
    initApp();
    return initPlayback();
  }, []);

  return (
    <div className="app">
      <MapView />
      <aside className="sidebar">
        <LayerPanel />
        <Charts />
      </aside>
      <Timeline />
    </div>
  );
}

export default App;
