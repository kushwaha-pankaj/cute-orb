import {useCallback, useEffect, useState} from 'react';
import {
  SlidersHorizontal,
  Download,
  RotateCcw,
  Maximize2,
  ArrowUpRight,
  Pause,
  Play,
  Check,
  Code2,
  Eye,
  Smile,
  Hand,
  Footprints,
} from 'lucide-react';
import GreenBlob from './GreenBlob';
import {SHEET_EXPRESSIONS, applyExpressionToConfig, getExpression} from './blobExpressions';

const blobDefaults = applyExpressionToConfig(
  {
    scale: 1,
    yaw: 0,
    bodyColor: '#4BCB6F',
    studio: '#6FB882',
    floor: '#62A874',
    showFloor: true,
    ambient: 0.55,
    keyLight: 2.1,
    fillLight: 0.85,
    rimLight: 0.7,
    exposure: 1.05,
    motion: true,
    autoRotate: false,
    spinSpeed: 1.2,
    bobAmount: 0.035,
    bobSpeed: 1.4,
    autoBlink: true,
    showEyes: true,
    showMouth: true,
    showTongue: true,
    showArms: true,
    showFeet: true,
    showBumps: true,
  },
  'happy',
);

const bodySwatches = [
  ['#4BCB6F', 'Apple'],
  ['#34A853', 'Emerald'],
  ['#7BE07A', 'Lime'],
  ['#2E8B57', 'Sea'],
  ['#A8E063', 'Chartreuse'],
];

const studioSwatches = [
  ['#6FB882', 'Sage'],
  ['#8AD28A', 'Mint'],
  ['#5FA872', 'Moss'],
  ['#B8E0C0', 'Pale'],
  ['#3D7A52', 'Forest'],
];

export default function GreenBlobStudio({theme, focus, setFocus, onNotice}) {
  const [config, setConfig] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('greenblob-config-v1') || '{}');
      // Migrate older saves that lacked mouthStyle / face sync
      const merged = {...blobDefaults, ...saved};
      if (!saved.mouthStyle) {
        return applyExpressionToConfig(merged, 'happy');
      }
      return merged;
    } catch {
      return {...blobDefaults};
    }
  });
  const [tab, setTab] = useState('look');
  const [expression, setExpression] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('greenblob-config-v1') || '{}');
      return saved.mouthStyle ? 'happy' : 'happy';
    } catch {
      return 'happy';
    }
  });
  const [readyInfo, setReadyInfo] = useState(null);

  useEffect(() => {
    localStorage.setItem('greenblob-config-v1', JSON.stringify(config));
  }, [config]);

  const patch = (key, value) =>
    setConfig((c) => {
      const next = {...c, [key]: value};
      // Mouth open slider implies an open mouth style
      if (key === 'mouthOpen' && value > 0.05 && c.mouthStyle === 'smile') {
        next.mouthStyle = 'open';
      }
      // Closing mouth fully can settle into smile line
      if (key === 'mouthOpen' && value <= 0.02 && c.mouthStyle === 'open') {
        next.mouthStyle = 'smile';
      }
      return next;
    });
  const onReady = useCallback((info) => setReadyInfo(info), []);

  const applyExpression = (id) => {
    setExpression(id);
    setConfig((c) => applyExpressionToConfig(c, id));
  };

  const range = (key, label, min, max, step = 0.01) => (
    <label className="range" key={key}>
      <span>
        {label}
        <output>{Number(config[key]).toFixed(2)}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={config[key]}
        onChange={(e) => patch(key, +e.target.value)}
      />
    </label>
  );

  const toggle = (key, label) => (
    <label className="toggle" key={key}>
      <span>{label}</span>
      <input type="checkbox" checked={!!config[key]} onChange={(e) => patch(key, e.target.checked)} />
    </label>
  );

  function download() {
    const blob = new Blob([JSON.stringify({version: 1, expression, ...config}, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'greenblob.config.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onNotice?.('Green Blob configuration exported.');
  }

  const caption = getExpression(expression).caption;

  return (
    <>
      <section className="intro flex justify-between items-end">
        <div>
          <div className="eyebrow">CUTE ORB MASCOT</div>
          <h1>
            Meet the green blob.
            <br />
            <span>Fully 3D.</span>
          </h1>
          <p>Loaded from Blender as GLB. Orbit, customise parts, expressions, and studio light.</p>
        </div>
        <div className="edition">
          EXPERIMENT 002
          <span>glTF / Green Blob mascot</span>
        </div>
      </section>

      <div className="workspace blob-workspace">
        <section className={`stage blob-stage ${theme === 'light' ? 'blob-stage-light' : ''}`}>
          <div className="stage-top">
            <span>
              <i className={`status ${expression}`} />
              {expression.toUpperCase()} <b>•</b> GLTF
            </span>
            <div>
              <button
                title="Toggle animation"
                aria-label="Toggle animation"
                onClick={() => patch('motion', !config.motion)}
              >
                {config.motion ? <Pause size={15} /> : <Play size={15} />}
              </button>
              <button title="Focus mode" aria-label="Focus mode" onClick={() => setFocus(!focus)}>
                <Maximize2 size={15} />
              </button>
            </div>
          </div>

          <GreenBlob config={config} onError={onNotice} onReady={onReady} />

          <div className="stage-caption">
            <h2>{caption}</h2>
            <p>
              Drag to orbit <span>·</span> Scroll to zoom <span>·</span> Toggle parts in the panel
            </p>
          </div>

          <div className="stage-bottom">
            <span>
              <span className="tiny-dot" /> THREE.JS · GREEN_BLOB.GLB
            </span>
            <button onClick={() => patch('autoRotate', !config.autoRotate)}>
              {config.autoRotate ? 'Stop spin' : 'Auto spin'}
            </button>
          </div>
        </section>

        <aside>
          <div className="panel-title">
            <div>
              <SlidersHorizontal size={16} />
              <h2>Customise blob</h2>
            </div>
            <div className="panel-actions">
              <button title="Export config" aria-label="Export config" onClick={download}>
                <Download size={14} />
              </button>
              <button
                title="Reset settings"
                aria-label="Reset settings"
                onClick={() => {
                  setConfig({...blobDefaults});
                  setExpression('happy');
                  onNotice?.('Green Blob defaults restored.');
                }}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          <div className="tabs">
            <button className={tab === 'look' ? 'selected' : ''} onClick={() => setTab('look')}>
              Look
            </button>
            <button className={tab === 'parts' ? 'selected' : ''} onClick={() => setTab('parts')}>
              Parts
            </button>
            <button className={tab === 'studio' ? 'selected' : ''} onClick={() => setTab('studio')}>
              Studio
            </button>
          </div>

          {tab === 'look' && (
            <>
              <div className="control-heading">
                BODY COLOUR <span>01</span>
              </div>
              <div className="swatches">
                {bodySwatches.map(([color, name]) => (
                  <button
                    key={color}
                    title={name}
                    aria-label={name}
                    className={config.bodyColor === color ? 'chosen' : ''}
                    style={{'--swatch': color}}
                    onClick={() => patch('bodyColor', color)}
                  >
                    {config.bodyColor === color && <Check size={13} />}
                  </button>
                ))}
                <input
                  type="color"
                  aria-label="Custom body colour"
                  value={config.bodyColor}
                  onChange={(e) => patch('bodyColor', e.target.value)}
                />
              </div>

              <div className="control-heading">
                FACE <span>02</span>
              </div>
              <div className="form-switch" style={{marginBottom: 14}}>
                {[
                  ['open', 'Open'],
                  ['smile', 'Smile'],
                  ['o', 'O'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    className={config.mouthStyle === id ? 'active' : ''}
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        mouthStyle: id,
                        mouthOpen: id === 'smile' ? 0 : id === 'o' ? 0.55 : Math.max(c.mouthOpen, 1),
                      }))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {range('mouthOpen', 'Mouth open', 0, 1)}
              {range('blink', 'Eyes closed', 0, 1)}
              {range('lookX', 'Eyes look L → R', -1, 1)}
              {range('lookY', 'Eyes look down → up', -1, 1)}
              {range('scale', 'Scale', 0.55, 1.45)}
              {range('yaw', 'Yaw', -45, 45, 1)}
              {toggle('autoBlink', 'Auto blink')}
              {toggle('motion', 'Idle bob')}

              <div className="control-heading">
                MOTION <span>03</span>
              </div>
              {range('bobAmount', 'Bob amount', 0, 0.12)}
              {range('bobSpeed', 'Bob speed', 0.2, 3)}
              {toggle('autoRotate', 'Auto rotate')}
              {config.autoRotate && range('spinSpeed', 'Spin speed', 0.2, 4)}
            </>
          )}

          {tab === 'parts' && (
            <>
              <div className="control-heading">
                ELEMENTS <span>01</span>
              </div>
              <div className="part-grid">
                <button
                  className={config.showEyes ? 'part-on' : ''}
                  onClick={() => patch('showEyes', !config.showEyes)}
                >
                  <Eye size={15} /> Eyes
                </button>
                <button
                  className={config.showMouth ? 'part-on' : ''}
                  onClick={() => patch('showMouth', !config.showMouth)}
                >
                  <Smile size={15} /> Mouth
                </button>
                <button
                  className={config.showTongue ? 'part-on' : ''}
                  onClick={() => patch('showTongue', !config.showTongue)}
                >
                  Tongue
                </button>
                <button
                  className={config.showArms ? 'part-on' : ''}
                  onClick={() => patch('showArms', !config.showArms)}
                >
                  <Hand size={15} /> Arms
                </button>
                <button
                  className={config.showFeet ? 'part-on' : ''}
                  onClick={() => patch('showFeet', !config.showFeet)}
                >
                  <Footprints size={15} /> Feet
                </button>
                <button
                  className={config.showBumps ? 'part-on' : ''}
                  onClick={() => patch('showBumps', !config.showBumps)}
                >
                  Bumps
                </button>
              </div>
              <p className="helper">Toggle mesh groups exported from Blender (`GEO_*`).</p>
              {readyInfo && (
                <p className="helper">
                  Loaded {readyInfo.meshes?.length || 0} meshes
                  {readyInfo.morphs?.length ? ` · morphs: ${readyInfo.morphs.join(', ')}` : ''}.
                </p>
              )}
            </>
          )}

          {tab === 'studio' && (
            <>
              <div className="control-heading">
                BACKDROP <span>01</span>
              </div>
              <div className="swatches">
                {studioSwatches.map(([color, name]) => (
                  <button
                    key={color}
                    title={name}
                    aria-label={name}
                    className={config.studio === color ? 'chosen' : ''}
                    style={{'--swatch': color}}
                    onClick={() => patch('studio', color)}
                  >
                    {config.studio === color && <Check size={13} />}
                  </button>
                ))}
                <input
                  type="color"
                  aria-label="Custom studio colour"
                  value={config.studio}
                  onChange={(e) => patch('studio', e.target.value)}
                />
              </div>
              {toggle('showFloor', 'Show floor')}
              {config.showFloor && (
                <label className="range">
                  <span>
                    Floor colour
                    <output>{config.floor}</output>
                  </span>
                  <input
                    type="color"
                    value={config.floor}
                    onChange={(e) => patch('floor', e.target.value)}
                    style={{width: '100%', height: 28, marginTop: 10, border: 0, background: 'none'}}
                  />
                </label>
              )}

              <div className="control-heading">
                LIGHTS <span>02</span>
              </div>
              {range('ambient', 'Ambient', 0, 1.5)}
              {range('keyLight', 'Key light', 0, 4)}
              {range('fillLight', 'Fill light', 0, 2.5)}
              {range('rimLight', 'Rim light', 0, 2.5)}
              {range('exposure', 'Exposure', 0.5, 1.8)}
            </>
          )}

          <div className="panel-note">
            <Code2 size={15} />
            <span>
              Separate from Experiment 001. Asset: <code>public/green_blob.glb</code>
            </span>
          </div>
        </aside>
      </div>

      <section className="state-bar blob-expr-bar">
        <div className="state-heading">
          <span className="eyebrow">EXPRESSIONS</span>
          <span>From the technical sheet strip.</span>
        </div>
        <div className="state-buttons blob-expr-buttons">
          {SHEET_EXPRESSIONS.map((expr, i) => (
            <button
              className={expression === expr.id ? 'active' : ''}
              key={expr.id}
              onClick={() => applyExpression(expr.id)}
            >
              <span className="state-symbol">{expr.symbol}</span>
              {expr.label}
              <small>0{i + 1}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="lower">
        <span>Green Blob · 8 sheet expressions · OrbitControls</span>
        <a className="export" href="/green_blob.glb" download>
          <Download size={14} /> Download GLB <ArrowUpRight size={13} />
        </a>
      </div>
    </>
  );
}
