import { useEffect, useState } from 'react'

// Live view of the participant's camera on the wizard console, over WebRTC.
// The picture goes directly from the display to the console on the local
// network. The relay only passes the two set-up messages (offer and answer);
// nothing is recorded, and no outside servers are used.
//
// The console always starts the connection, so all the retrying is in one place.

const RETRY_MS = 2000
const CONNECT_TIMEOUT_MS = 8000

// Wait until the description contains this device's network addresses, so one
// message each way is enough.
function gathered(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, 2000)
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState !== 'complete') return
      clearTimeout(timer)
      resolve()
    })
  })
}

// Display side: answer any console that asks for the camera.
export function useShareCamera(socket, stream) {
  useEffect(() => {
    if (!stream) return
    const peers = new Map() // console socket id -> connection

    async function onSignal({ from, offer, attempt }) {
      if (!offer) return
      peers.get(from)?.close()
      const pc = new RTCPeerConnection()
      peers.set(from, pc)
      pc.addEventListener('connectionstatechange', () => {
        if (pc.connectionState !== 'failed') return
        pc.close()
        if (peers.get(from) === pc) peers.delete(from)
      })
      try {
        await pc.setRemoteDescription(offer)
        const track = stream.getVideoTracks()[0]
        const sender = pc.addTrack(track, stream)
        await pc.setLocalDescription()
        // A small, modest-rate copy is plenty for the wizard and keeps the
        // participant's own picture smooth and the phone cool.
        const params = sender.getParameters()
        if (params.encodings?.[0]) {
          const height = Math.min(track.getSettings().width, track.getSettings().height)
          Object.assign(params.encodings[0], {
            maxBitrate: 1_500_000,
            maxFramerate: 20,
            scaleResolutionDownBy: Math.max(1, height / 540 || 1),
          })
          await sender.setParameters(params).catch(() => {})
        }
        await gathered(pc)
        if (peers.get(from) !== pc) return
        socket.emit('signal', { to: from, attempt, answer: pc.localDescription })
      } catch (err) {
        console.warn('Could not share camera', err)
        pc.close()
      }
    }

    socket.on('signal', onSignal)
    return () => {
      socket.off('signal', onSignal)
      for (const pc of peers.values()) pc.close()
    }
  }, [socket, stream])
}

// Console side: the stream from the display `displayId`, or null until it is
// really connected (never a frozen last frame). `streamId` changes whenever the
// display reopens its camera.
export function useCameraFeed(socket, displayId, streamId) {
  const [feed, setFeed] = useState(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!displayId || !streamId) return
    const attempt = Math.random().toString(36).slice(2)
    const pc = new RTCPeerConnection()
    let incoming = null
    let timer = null

    function again() {
      setFeed(null)
      clearTimeout(timer)
      timer = setTimeout(() => setRetry((n) => n + 1), RETRY_MS)
    }

    pc.addTransceiver('video', { direction: 'recvonly' })
    pc.addEventListener('track', (e) => {
      incoming = new MediaStream([e.track])
    })
    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'connected') {
        clearTimeout(timer)
        setFeed(incoming)
      } else if (['disconnected', 'failed'].includes(pc.connectionState)) again()
    })

    function onSignal(msg) {
      if (msg.from !== displayId || msg.attempt !== attempt || !msg.answer) return
      pc.setRemoteDescription(msg.answer).catch(again)
    }
    socket.on('signal', onSignal)

    timer = setTimeout(again, CONNECT_TIMEOUT_MS)
    ;(async () => {
      await pc.setLocalDescription()
      await gathered(pc)
      if (pc.signalingState === 'closed' || !socket.connected) return
      socket.emit('signal', { to: displayId, attempt, offer: pc.localDescription })
    })().catch(() => {}) // the timeout above retries

    return () => {
      clearTimeout(timer)
      socket.off('signal', onSignal)
      pc.close()
      setFeed(null)
    }
  }, [socket, displayId, streamId, retry])

  return feed
}
