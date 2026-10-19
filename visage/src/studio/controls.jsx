import {useId} from 'react';
import {Check} from 'lucide-react';

/**
 * Schema-driven controls. A studio definition lists controls as plain objects:
 *   {type: 'range', key, label, min, max, step}
 *   {type: 'toggle', key, label}
 *   {type: 'swatches', key, label, options: [[color, name]]}
 *   {type: 'color', key, label}
 *   {type: 'choice', key, label, options: [{id, label}], apply?(config, id), isActive?(config, id)}
 *   {type: 'select', key, label, options: [{id, label}]}
 *   {type: 'parts', label, options: [{key, label}]}
 *   {type: 'heading', label}
 *   {type: 'note', text: string | (config, readyInfo) => string}
 *   {type: 'figure', src, alt, caption}
 * Any control may add `when: config => boolean` to show conditionally.
 */

export function Range({label, value, min, max, step = 0.01, onChange}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="st-range">
      <label htmlFor={id}>
        {label}
        <output htmlFor={id}>{Number(value).toFixed(step >= 1 ? 0 : 2)}</output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{'--pct': `${pct}%`}}
        onChange={e => onChange(+e.target.value)}
      />
    </div>
  );
}

export function Toggle({label, checked, onChange}) {
  return (
    <label className="st-toggle">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={!!checked} onChange={e => onChange(e.target.checked)} />
    </label>
  );
}

export function Swatches({label, options, value, onChange}) {
  return (
    <fieldset className="st-field">
      <legend>{label}</legend>
      <div className="st-swatches">
        {options.map(([color, name]) => {
          const chosen = value?.toLowerCase() === color.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              title={name}
              aria-label={name}
              aria-pressed={chosen}
              style={{'--swatch': color}}
              onClick={() => onChange(color)}
            >
              {chosen && <Check size={14} />}
            </button>
          );
        })}
        <label className="st-swatch-custom" title="Custom colour">
          <span className="sr-only">Custom {label.toLowerCase()}</span>
          <input type="color" value={value} onChange={e => onChange(e.target.value)} />
        </label>
      </div>
    </fieldset>
  );
}

export function ColorField({label, value, onChange}) {
  return (
    <label className="st-color">
      <span>{label}</span>
      <code>{value}</code>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

export function Choice({label, options, isActive, onPick}) {
  return (
    <fieldset className="st-field">
      <legend>{label}</legend>
      <div className="st-choice">
        {options.map(o => {
          const active = isActive(o.id);
          return (
            <button key={String(o.id)} type="button" aria-pressed={active} onClick={() => onPick(o.id)}>
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Select({label, value, options, onChange}) {
  return (
    <label className="st-select">
      <span>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ControlList({controls, config, patch, setConfig, readyInfo}) {
  return controls.map((c, i) => {
    if (c.when && !c.when(config)) return null;
    const key = `${c.type}-${c.key || c.label || i}`;
    const set = value => patch(c.key, value);
    switch (c.type) {
      case 'range':
        return <Range key={key} label={c.label} value={config[c.key]} min={c.min} max={c.max} step={c.step} onChange={set} />;
      case 'toggle':
        return <Toggle key={key} label={c.label} checked={config[c.key]} onChange={set} />;
      case 'swatches':
        return <Swatches key={key} label={c.label} options={c.options} value={config[c.key]} onChange={set} />;
      case 'color':
        return <ColorField key={key} label={c.label} value={config[c.key]} onChange={set} />;
      case 'select':
        return <Select key={key} label={c.label} value={config[c.key]} options={c.options} onChange={set} />;
      case 'choice':
        return (
          <Choice
            key={key}
            label={c.label}
            options={c.options}
            isActive={id => (c.isActive ? c.isActive(config, id) : config[c.key] === id)}
            onPick={id => (c.apply ? setConfig(cur => c.apply(cur, id)) : set(id))}
          />
        );
      case 'parts':
        return (
          <fieldset className="st-field" key={key}>
            <legend>{c.label}</legend>
            <div className="st-parts">
              {c.options.map(p => (
                <button key={p.key} type="button" aria-pressed={!!config[p.key]} onClick={() => patch(p.key, !config[p.key])}>
                  {config[p.key] && <Check size={14} />}
                  {p.label}
                </button>
              ))}
            </div>
          </fieldset>
        );
      case 'heading':
        return (
          <h3 key={key} className="st-heading">
            {c.label}
          </h3>
        );
      case 'note':
        return (
          <p key={key} className="st-note">
            {typeof c.text === 'function' ? c.text(config, readyInfo) : c.text}
          </p>
        );
      case 'figure':
        return (
          <figure key={key} className="st-figure">
            <img src={c.src} alt={c.alt} loading="lazy" />
            <figcaption>{c.caption}</figcaption>
          </figure>
        );
      default:
        return null;
    }
  });
}
