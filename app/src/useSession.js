import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'

// Connects to the relay (proxied by Vite at /socket.io) and keeps the shared
// state in sync. `role` is 'display' or 'console'.
export function useSession(role) {
  const socket = useMemo(() => io({ query: { role }, autoConnect: false }), [role])
  const [state, setState] = useState(null)
  const [connected, setConnected] = useState(false)
  const [clients, setClients] = useState({ display: 0, console: 0 })

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

  const send = (cmd) => socket.emit('command', cmd)
  const report = (entry) => socket.emit('report', entry)

  return { state, connected, clients, send, report }
}
