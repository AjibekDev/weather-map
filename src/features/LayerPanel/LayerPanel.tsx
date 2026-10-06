import type { LayerDefinition, LayerStyle } from '@/domain/types';
import { LAYERS } from '@/layers/registry';
import { toggleLayer } from '@/store/actions';
import { useActiveLayerIds, useLayerStatus } from '@/store/hooks';

export function LayerPanel() {
  const activeIds = useActiveLayerIds();

  return (
    <section className="panel">
      <h2 className="panel__title">Слои</h2>
      <ul className="layer-list">
        {LAYERS.map((layer) => (
          <LayerRow key={layer.id} layer={layer} active={activeIds.includes(layer.id)} />
        ))}
      </ul>
    </section>
  );
}

function LayerRow({ layer, active }: { layer: LayerDefinition; active: boolean }) {
  const { loading, error } = useLayerStatus(layer.id);

  return (
    <li className="layer-row">
      <label className="layer-row__head">
        <input type="checkbox" checked={active} onChange={() => toggleLayer(layer.id)} />
        <span className="layer-row__title">{layer.title}</span>
        <span className="layer-row__unit">{layer.unit}</span>
        {active && loading && <span className="spinner" role="status" aria-label="Загрузка" />}
      </label>
      {active && <Legend style={layer.style} />}
      {error && <p className="layer-row__error">Ошибка загрузки: {error}</p>}
    </li>
  );
}

function Legend({ style }: { style: LayerStyle }) {
  const [min, max] = style.domain;
  const gradient = style.colorStops
    .map(([value, color]) => `${color} ${((value - min) / (max - min)) * 100}%`)
    .join(', ');

  return (
    <div className="legend">
      <div
        className="legend__bar"
        style={{ background: `linear-gradient(to right, ${gradient})` }}
      />
      <div className="legend__labels">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
