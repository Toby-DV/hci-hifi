import { useEffect, useRef, useState } from 'react'
import { useCameraFeed } from './cameraFeed.js'
import Instructions from './Instructions.jsx'
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

const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }

const clamp = (n) => Math.min(100, Math.max(0, n))

// One line for the header about the (first) connected display.
function displayHealth(clients) {
  if (clients.display === 0) return { ok: false, text: 'No display' }
  if (clients.display > 1) return { ok: false, text: `${clients.display} displays connected` }
  const s = clients.displays?.[0]
  if (!s) return { ok: false, text: 'Display connecting' }
  if (!s.started) return { ok: false, text: 'Display: waiting for tap' }
  if (s.camera === 'error') return { ok: false, text: `Camera error: ${s.error}` }
  if (s.camera === 'starting') return { ok: false, text: 'Camera starting' }
  return { ok: true, text: s.camera === 'on' ? 'Display ready · camera on' : 'Display ready · clip' }
}

// The wizard's screen (laptop). Pick a moment, then fire stages for it.
// Keyboard: 1–4 pick moment, G/W/M/H/R fire a stage, Esc clears, Space play/pause,
// arrows nudge the label (Shift for bigger steps).
export default function Console() {
  const { socket, state, connected, clients, send } = useSession('console')
  const [selected, setSelected] = useState(moments[0].id)

  // The display whose camera is live, if there is one.
  const display = clients.displays?.find((d) => d?.camera === 'on') ?? clients.displays?.[0]
  const feed = useCameraFeed(socket, display?.id, display?.stream)
  const feedRef = useRef(null)
  useEffect(() => {
    if (!feedRef.current) return
    feedRef.current.srcObject = feed
    if (feed) feedRef.current.play().catch(() => {})
  }, [feed])

  // Nothing can be fired behind the instructions, where the participant can't see it.
  const fire = (stage) => {
    if (!state?.intro) send({ type: 'stage', stage, momentId: selected })
  }
  const clear = () => send({ type: 'clear' })

  useEffect(() => {
    document.title = 'Wizard console'
  }, [])

  const togglePlay = () => send({ type: 'video', playing: !state?.video.playing })

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return
      // Leave browser shortcuts alone (Ctrl+R used to fire the recap).
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const arrow = ARROWS[e.key]
      if (arrow && state) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 2
        return send({
          type: 'position',
          position: {
            x: clamp(state.position.x + arrow[0] * step),
            y: clamp(state.position.y + arrow[1] * step),
          },
        })
      }
      if (e.repeat) return // a held key should fire once
      const n = Number(e.key)
      if (n >= 1 && n <= moments.length) return setSelected(moments[n - 1].id)
      const s = STAGES.find((s) => s.key === e.key.toLowerCase())
      if (s) return fire(s.stage)
      if (e.key === 'Escape') return clear()
      if (e.key === ' ' && state?.video.source === 'clip' && e.target.tagName !== 'BUTTON') {
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

  // After a mouse click, drop focus so Space or Enter can't press it again.
  function dropFocus(e) {
    if (e.detail > 0) e.target.closest('button')?.blur()
  }

  if (!state) return <div className="console loading">Connecting to relay…</div>

  const health = displayHealth(clients)
  const aspect = display?.aspect || 16 / 9
  const liveId = ['idle', 'recap'].includes(state.stage) ? null : state.momentId

  return (
    <div className="console" onClick={dropFocus}>
      <header>
        <h1>Wizard console</h1>
        <span className={`conn ${connected ? 'ok' : 'bad'}`}>
          {connected ? 'Relay connected' : 'Relay offline'}
        </span>
        <span className={`conn ${health.ok ? 'ok' : 'bad'}`}>{health.text}</span>
      </header>
      {!connected && (
        <p className="banner">Relay offline. Nothing you press is being sent.</p>
      )}

      <section>
        <h2>Instructions</h2>
        <div className="row">
          <button onClick={() => send({ type: 'intro', show: !state.intro, by: 'wizard' })}>
            {state.intro ? 'Skip instructions' : 'Show instructions'}
          </button>
        </div>
        {state.intro && (
          <p className="note">On the participant’s screen now. You can fire labels once they press Start.</p>
        )}
      </section>

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
              {m.id === liveId ? (
                <span className="tag on">on screen</span>
              ) : (
                state.seen.includes(m.id) && <span className="tag">✓ shown</span>
              )}
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
              disabled={state.intro}
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
        <h2>Participant sees · click to place label, arrows to nudge</h2>
        <div
          className="preview"
          onClick={placeLabel}
          // Same shape as the participant's screen, so labels land where you click.
          style={{ aspectRatio: aspect, width: `min(100%, 720px, ${60 * aspect}vh)` }}
        >
          {feed && <video ref={feedRef} muted playsInline autoPlay />}
          {!feed && state.video.source === 'camera' && (
            <div className="feed-note">
              {display?.camera === 'on' ? 'Connecting to camera…' : 'Camera not on yet'}
            </div>
          )}
          <Overlay state={state} />
          {state.intro && <Instructions />}
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
          <p className="note">The display shows its rear camera live, and the preview above shows the same picture.</p>
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
          onClick={() => confirm('Reset the session? Clears the screen and recap, and shows the instructions again.') && send({ type: 'reset' })}
        >
          Reset session
        </button>
      </section>
    </div>
  )
}
