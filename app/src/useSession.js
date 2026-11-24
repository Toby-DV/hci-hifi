import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'

// Connects to the relay (proxied by Vite at /socket.io) and keeps the shared
// state in sync. `role` is 'display' or 'console'.
export function useSession(role) {
  const socket = useMemo(() => io({ query: { role }, autoConnect: false }), [role])
  const [state, setState] = useState(null)
  const [connected, setConnected] = useState(false)
  const [clients, setClients] = useState({ display: 0, console: 0, displays: [] })

  useEffect(() => {
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('state', setState)
    socket.on('clients', setClients)
    socket.connect()
    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [socket])

  // socket.io queues messages while offline and sends them all on reconnect.
  // A late wizard command is worse than none, so drop them instead.
  const send = (cmd) => {
    if (socket.connected) socket.emit('command', cmd)
  }
  const report = (entry) => socket.emit('report', entry)
  // Live health of this display, shown on the console. Not logged.
  const sendStatus = (status) => {
    if (socket.connected) socket.emit('status', status)
  }

  return { state, connected, clients, send, report, sendStatus }
}
