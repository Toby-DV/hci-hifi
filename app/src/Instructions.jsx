// Shown to the participant before the task, and mirrored in the console
// preview (without onStart, so the button does nothing there).
// Follows the session guide. Two things are left out on purpose: the food science
// (it would give away the concept check) and the "why?" / "more" voice commands
// (tasks 2 and 3 test whether people find them).

const STEPS = [
  ['Set up the phone', 'Put it on its stand, or hold it, with the camera facing the pan.'],
  ['Start cooking', 'Turn the heat to low and begin with the onions. Keep stirring throughout.'],
  ['Listen for tasks', 'The researcher will read each one out. They can’t help you with the app.'],
  ['Think aloud', 'Say what you’re looking at, what you expect and anything that surprises you.'],
]

export default function Instructions({ onStart }) {
  return (
    <div className="instructions">
      <div className="instructions-page">
        <h1>Before you start</h1>
        <ol>
          {STEPS.map(([title, text]) => (
            <li key={title}>
              <strong>{title}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <p>
          There are no wrong answers, and you can stop at any time without giving a reason. The
          researcher can see the camera picture, but the app does not record it.
        </p>
        <button type="button" onClick={onStart} tabIndex={onStart ? 0 : -1}>
          Start
        </button>
      </div>
    </div>
  )
}
