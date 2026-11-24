import { useEffect, useState } from 'react'
import Overlay from './Overlay.jsx'
import { clips, moments } from './moments.js'
import { useSession } from './useSession.js'

const STAGES = [
  { stage: 'glance', label: 'Glance label', key: 'g' },
  { stage: 'why', label: 'Why card', key: 'w' },
  { stage: 'more', label: 'More card', key: 'm' },
  { stage: 'heads-up', label: 'Heads-up', key: 'h' },
  { stage: 'recap', label: 'Recap', key: 'r' },
]

const PRESETS = [
  { name: 'Back left', x: 30, y: 40 },
  { name: 'Back right', x: 70, y: 40 },
  { name: 'Front left', x: 30, y: 65 },
  { name: 'Front right', x: 70, y: 65 },
  { name: 'Centre', x: 50, y: 55 },
]

// The wizard's screen (laptop). Pick a moment, then fire stages for it.
// Keyboard: 1–4 pick moment, G/W/M/H/R fire a stage, Esc clears, Space play/pause.
export default function Console() {
  const { state, connected, clients, send } = useSession('console')
  const [selected, setSelected] = useState(moments[0].id)

  const fire = (stage) => send({ type: 'stage', stage, momentId: selected })
  const clear = () => send({ type: 'clear' })
  const togglePlay = () => send({ type: 'video', playing: !state?.video.playing })

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return
      const n = Number(e.key)
      if (n >= 1 && n <= moments.length) return setSelected(moments[n - 1].id)
      const s = STAGES.find((s) => s.key === e.key.toLowerCase())
      if (s) return fire(s.stage)
      if (e.key === 'Escape') return clear()
      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Click on the preview to move the label anchor to that point.
  function placeLabel(e) {
    const r = e.currentTarget.getBoundingClientRect()
    send({
      type: 'position',
      position: {
        x: Math.round(((e.clientX - r.left) / r.width) * 100),
        y: Math.round(((e.clientY - r.top) / r.height) * 100),
      },
    })
  }

  if (!state) return <div className="console loading">Connecting to relay…</div>

  return (
    <div className="console">
      <header>
        <h1>Wizard console</h1>
        <span className={`conn ${connected ? 'ok' : 'bad'}`}>
          {connected ? 'Relay connected' : 'Relay offline'}
        </span>
        <span className={`conn ${clients.display > 0 ? 'ok' : 'bad'}`}>
          Displays: {clients.display}
        </span>
      </header>

      <section>
        <h2>Moment</h2>
        <div className="grid">
          {moments.map((m, i) => (
            <button
              key={m.id}
              className={m.id === selected ? 'selected' : ''}
              onClick={() => setSelected(m.id)}
            >
              <kbd>{i + 1}</kbd> {m.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Fire</h2>
        <div className="grid">
          {STAGES.map((s) => (
            <button
              key={s.stage}
              className={`fire ${state.stage === s.stage ? 'live' : ''}`}
              onClick={() => fire(s.stage)}
            >
              <kbd>{s.key.toUpperCase()}</kbd> {s.label}
            </button>
          ))}
          <button className="clear" onClick={clear}>
            <kbd>Esc</kbd> Clear
          </button>
        </div>
      </section>

      <section className="preview-section">
        <h2>Participant sees · click to place label</h2>
        <div className="preview" onClick={placeLabel}>
          <Overlay state={state} />
        </div>
        <div className="row">
          {PRESETS.map((p) => (
            <button key={p.name} onClick={() => send({ type: 'position', position: p })}>
              {p.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Video</h2>
        <div className="row">
          <button
            className={state.video.source !== 'camera' ? 'selected' : ''}
            onClick={() => send({ type: 'video', source: 'clip', playing: false, seekTo: 0 })}
          >
            Filmed clip
          </button>
          <button
            className={state.video.source === 'camera' ? 'selected' : ''}
            onClick={() => send({ type: 'video', source: 'camera' })}
          >
            Live camera
          </button>
        </div>
        {state.video.source === 'camera' ? (
          <p className="note">The display shows its rear camera live. The preview above shows labels only.</p>
        ) : (
        <div className="row">
          <select
            value={state.video.clip}
            onChange={(e) => send({ type: 'video', clip: e.target.value, playing: false, seekTo: 0 })}
          >
            {clips.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button onClick={togglePlay}>
            <kbd>Space</kbd> {state.video.playing ? 'Pause' : 'Play'}
          </button>
          <button onClick={() => send({ type: 'video', seekTo: 0 })}>Restart</button>
        </div>
        )}
      </section>

      <section>
        <button
          className="danger"
          onClick={() => confirm('Reset the session (clears the recap)?') && send({ type: 'reset' })}
        >
          Reset session
        </button>
      </section>
    </div>
  )
}
