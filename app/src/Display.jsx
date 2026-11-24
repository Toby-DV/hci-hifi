import { useEffect, useRef, useState } from 'react'
import Overlay from './Overlay.jsx'
import { useSession } from './useSession.js'

// The participant's screen (tablet/phone in Chrome). Shows either a filmed
// cooking clip or the device's live rear camera, full screen, with the overlay
// on top. Controlled entirely from /console.
export default function Display() {
  const { state, connected, report } = useSession('display')
  const [started, setStarted] = useState(false)
  const [failedClip, setFailedClip] = useState(null)
  const [cameraError, setCameraError] = useState(null)
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
        await cameraRef.current.play().catch(() => {})
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
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [useCamera, started]) // eslint-disable-line react-hooks/exhaustive-deps

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
        <div className="video-missing">Camera unavailable: {cameraError}</div>
      )}

      <Overlay state={state} />

      {!connected && <div className="offline">Reconnecting…</div>}

      {!started && (
        <button className="start-screen" onClick={start}>
          Tap to start
        </button>
      )}
    </div>
  )
}
