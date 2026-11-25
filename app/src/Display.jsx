import { useEffect, useRef, useState } from 'react'
import { useShareCamera } from './cameraFeed.js'
import Instructions from './Instructions.jsx'
import Overlay from './Overlay.jsx'
import { useSession } from './useSession.js'

// The participant's screen (tablet/phone in Chrome). Shows either a filmed
// cooking clip or the device's live rear camera, full screen, with the overlay
// on top. Controlled entirely from /console.
export default function Display() {
  const { socket, state, connected, send, report, sendStatus } = useSession('display')
  const [started, setStarted] = useState(false)
  const [failedClip, setFailedClip] = useState(null)
  const [cameraError, setCameraError] = useState(null)
  const [cameraStream, setCameraStream] = useState(null) // set once it is playing
  const [attempt, setAttempt] = useState(0) // bump to reopen the camera
  const [aspect, setAspect] = useState(() => window.innerWidth / window.innerHeight)
  const videoRef = useRef(null)
  const cameraRef = useRef(null)

  const video = state?.video
  const useCamera = video?.source === 'camera'

  // Follow the wizard's clip commands.
  useEffect(() => {
    const el = videoRef.current
    if (!el || !video || useCamera) return
    if (video.seekTo != null) el.currentTime = video.seekTo
    if (video.playing) el.play().catch(() => {})
    else el.pause()
  }, [video?.nonce, video?.clip, useCamera]) // eslint-disable-line react-hooks/exhaustive-deps

  // Live camera: open the rear camera while in camera mode, release it after.
  // Waits for "Tap to start" so the permission prompt appears during set-up,
  // not in front of the participant.
  useEffect(() => {
    if (!useCamera || !started) return
    let stream
    let cancelled = false
    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera needs HTTPS. Open this page via https://')
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
        if (cancelled) return stream.getTracks().forEach((t) => t.stop())
        cameraRef.current.srcObject = stream
        // The phone can take the camera away (a call, another app). Reopen it.
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          report({ action: 'camera-lost' })
          if (!document.hidden) setAttempt((n) => n + 1)
        })
        await cameraRef.current.play().catch(() => {})
        if (cancelled) return
        setCameraStream(stream)
        report({ action: 'camera-on' })
      } catch (err) {
        if (!cancelled) {
          setCameraError(err.message || err.name)
          report({ action: 'camera-error', error: err.name })
        }
      }
    })()
    return () => {
      cancelled = true
      setCameraError(null)
      setCameraStream(null)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [useCamera, started, attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  // Coming back from another app or a locked screen: the wake lock is always
  // released, and the camera may have been stopped.
  useEffect(() => {
    if (!started) return
    const onVisible = () => {
      if (document.hidden) return
      navigator.wakeLock?.request('screen').catch(() => {})
      const el = cameraRef.current
      if (!el) return
      const track = el.srcObject?.getVideoTracks()[0]
      if (track && track.readyState === 'ended') setAttempt((n) => n + 1)
      else el.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [started])

  useEffect(() => {
    document.title = 'Kitchen Chemistry'
    const onResize = () => setAspect(window.innerWidth / window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useShareCamera(socket, cameraStream)

  // Tell the console how this display is doing.
  const camera = !useCamera ? 'off' : cameraError ? 'error' : cameraStream ? 'on' : 'starting'
  useEffect(() => {
    if (connected) sendStatus({ started, camera, error: cameraError, aspect, stream: cameraStream?.id })
  }, [connected, started, camera, cameraError, aspect, cameraStream]) // eslint-disable-line react-hooks/exhaustive-deps

  const videoError = video && !useCamera && failedClip === video.clip

  // Chrome needs one user tap before fullscreen and the wake lock are allowed.
  // Do this before the participant arrives.
  async function start() {
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      /* fine on desktop testing */
    }
    try {
      // Android only, and only in full screen.
      await screen.orientation.lock('landscape')
    } catch {
      /* the start screen asks for landscape instead */
    }
    try {
      await navigator.wakeLock?.request('screen')
    } catch {
      /* not critical */
    }
    setStarted(true)
    report({ action: 'display-started' })
  }

  return (
    <div className="display">
      {video && !useCamera && (
        <video
          ref={videoRef}
          key={video.clip}
          src={`/clips/${video.clip}`}
          muted
          playsInline
          loop
          onError={() => setFailedClip(video.clip)}
        />
      )}
      {useCamera && <video ref={cameraRef} muted playsInline autoPlay />}

      {videoError && (
        <div className="video-missing">
          Clip not found: public/clips/{video.clip}
        </div>
      )}
      {useCamera && cameraError && (
        <div className="video-missing">
          <span>Camera unavailable: {cameraError}</span>
          <button onClick={() => setAttempt((n) => n + 1)}>Try again</button>
        </div>
      )}

      <Overlay state={state} />

      {state?.intro && (
        <Instructions onStart={() => send({ type: 'intro', show: false, by: 'participant' })} />
      )}

      {!connected && <div className="offline">Reconnecting…</div>}

      {!started && (
        <button className="start-screen" onClick={start}>
          <span>
            Tap to start
            <small>Turn the screen sideways first</small>
          </span>
        </button>
      )}
    </div>
  )
}
