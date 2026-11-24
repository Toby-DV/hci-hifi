// Relay between the wizard console and the participant display.
// The console sends commands, the server updates one shared state object and
// broadcasts it, so a display that reconnects always shows the right thing.
// Every command is also appended to logs/session-<time>.jsonl for analysis.

import { createServer } from 'node:http'
import { mkdirSync, appendFileSync } from 'node:fs'
import { Server } from 'socket.io'

const PORT = 3001

const initialState = () => ({
  stage: 'idle', // idle | glance | why | more | heads-up | recap
  momentId: null, // which moment the label/card is about
  position: { x: 50, y: 55 }, // label anchor, % of the display
  seen: [], // moment ids shown this session, for the recap
  video: { source: 'camera', clip: 'onions.mp4', playing: false, seekTo: null, nonce: 0 },
})

let state = initialState()

mkdirSync('logs', { recursive: true })
const logFile = `logs/session-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`
const log = (entry) =>
  appendFileSync(logFile, JSON.stringify({ t: new Date().toISOString(), ...entry }) + '\n')

function apply(cmd) {
  switch (cmd.type) {
    case 'stage': {
      const momentId = cmd.momentId ?? state.momentId
      const seen =
        momentId && cmd.stage === 'glance' && !state.seen.includes(momentId)
          ? [...state.seen, momentId]
          : state.seen
      return { ...state, stage: cmd.stage, momentId, seen }
    }
    case 'clear':
      return { ...state, stage: 'idle' }
    case 'position':
      return { ...state, position: cmd.position }
    case 'video':
      return {
        ...state,
        video: {
          ...state.video,
          ...(cmd.source !== undefined && { source: cmd.source }), // 'clip' | 'camera'
          ...(cmd.clip !== undefined && { clip: cmd.clip }),
          ...(cmd.playing !== undefined && { playing: cmd.playing }),
          // nonce makes repeated seeks to the same time still register
          seekTo: cmd.seekTo ?? null,
          nonce: state.video.nonce + 1,
        },
      }
    case 'reset': {
      // Keep the camera/clip choice so a reset between participants doesn't change it.
      const fresh = initialState()
      return { ...fresh, video: { ...fresh.video, source: state.video.source } }
    }
    default:
      return state
  }
}

const http = createServer()
const io = new Server(http)

function broadcastClients() {
  const counts = { display: 0, console: 0 }
  for (const s of io.sockets.sockets.values()) counts[s.data.role] = (counts[s.data.role] ?? 0) + 1
  io.emit('clients', counts)
}

io.on('connection', (socket) => {
  socket.data.role = socket.handshake.query.role ?? 'unknown'
  log({ event: 'connect', role: socket.data.role })
  socket.emit('state', state)
  broadcastClients()

  socket.on('command', (cmd) => {
    state = apply(cmd)
    log({ event: 'command', ...cmd })
    io.emit('state', state)
  })

  // The display reports participant taps etc. here (e.g. "tapped start").
  socket.on('report', (entry) => log({ event: 'report', role: socket.data.role, ...entry }))

  socket.on('disconnect', () => {
    log({ event: 'disconnect', role: socket.data.role })
    broadcastClients()
  })
})

http.listen(PORT, () => {
  console.log(`Wizard relay on :${PORT}, logging to ${logFile}`)
})
