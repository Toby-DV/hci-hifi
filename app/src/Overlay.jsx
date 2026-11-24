import { momentById, moments } from './moments.js'

// Everything the app draws over the camera/video. Used full size on the
// display and scaled down as the live preview on the console.
export default function Overlay({ state }) {
  if (!state) return null
  const moment = momentById(state.momentId)
  const { stage, position } = state

  return (
    <div className="overlay">
      <div className="status-bar">
        <span className="pill">
          <span className="dot" /> Watching · on this phone
        </span>
        {moment && (stage === 'glance' || stage === 'heads-up') && (
          <span className="pill hint">Say “why?”</span>
        )}
      </div>

      {moment && stage === 'glance' && (
        <Label position={position} title={moment.label} sub={moment.sub} />
      )}

      {moment && stage === 'heads-up' && (
        <Label position={position} title={moment.headsUp} sub="Heads-up" variant="heads-up" />
      )}

      {moment && (stage === 'why' || stage === 'more') && (
        <>
          <Label position={position} title={moment.label} variant="small" />
          <div className="card">
            <div className="card-heard">Heard: “{stage === 'why' ? 'why?' : 'more'}”</div>
            <p>{stage === 'why' ? moment.why : moment.more}</p>
            {stage === 'why' && <div className="card-hint">Say “more” or carry on cooking</div>}
          </div>
        </>
      )}

      {stage === 'recap' && (
        <div className="recap">
          <h2>What happened in your pan</h2>
          {state.seen.length === 0 && <p>Nothing yet.</p>}
          <ol>
            {state.seen.map((id) => {
              const m = momentById(id)
              return (
                <li key={id}>
                  <strong>{m.label}</strong>
                  <span>{m.why}</span>
                </li>
              )
            })}
          </ol>
          <div className="recap-count">
            Seen {state.seen.length} of {moments.length}
          </div>
        </div>
      )}
    </div>
  )
}

function Label({ position, title, sub, variant = '' }) {
  return (
    <div className={`label ${variant}`} style={{ left: `${position.x}%`, top: `${position.y}%` }}>
      <div className="label-box">
        <div className="label-title">{title}</div>
        {sub && <div className="label-sub">{sub}</div>}
      </div>
      <div className="label-stem" />
      <div className="label-pin" />
    </div>
  )
}
