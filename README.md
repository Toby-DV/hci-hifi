# Kitchen Chemistry: High fidelity prototype

A high-fidelity prototype of an AR cooking app that explains the food science
happening in the pan. There is no computer vision or speech recognition. A
researcher (the "wizard") watches the cooking, listens to the participant, and
triggers the labels from a laptop.

| Screen | Device | Path | What it does |
| --- | --- | --- | --- |
| Participant display | Phone or tablet, in Chrome | `/display` | Live rear camera (or a filmed clip) with labels on top |
| Wizard console | Laptop | `/console` | Picks moments, shows and hides labels, controls the video |

## Set up

You need Node 20.19+ or 22.12+, and both devices on the same Wi-Fi network.

```sh
npm install
npm run dev
```

This starts the web app (port 5173) and the relay that connects the two screens
(port 3001). Leave it running for the whole session.

The terminal prints a `Network:` address such as `https://192.168.0.83:5173/`.
It can change between networks, so check it each time.

## Before the participant arrives

1. On the laptop, open `https://localhost:5173/console`.
2. On the phone or tablet, open `https://<network-address>:5173/display`.
   Use **https**, because the camera does not work without it.
3. The certificate is self-signed, so each device shows a warning. In Chrome
   choose **Advanced**, then **Proceed**.
4. Turn the phone or tablet sideways, press **Tap to start** and allow the
   camera. The page also tries to go full screen, lock to landscape and keep the
   screen awake.
5. Check the console header says **Relay connected** and **Display ready**.
6. Press **Reset session** so the screen and recap start empty and the
   instructions are showing.
7. Check the camera picture appears in the console preview (press **Skip
   instructions** to see it, then **Show instructions** to bring them back).

Repeat steps 5 and 6 for each participant, then hand over the device. The
participant reads the instructions and presses **Start**. Labels cannot
be fired until they do, or until you press **Skip instructions**.

## Running a session

Choose a moment, then fire a stage for it. Shortcuts work while the console page
has focus.

| Key | Action | When to use it |
| --- | --- | --- |
| `1`–`4` | Select a moment (nothing is shown yet) | Before firing a stage |
| `G` | Glance label | The change is happening in the pan |
| `W` | Why card | The participant says "why?" |
| `M` | More card | The participant says "more" |
| `H` | Heads-up | The change is about to happen |
| `R` | Recap | After cooking |
| `Esc` | Clear | Remove whatever is on screen |
| `Space` | Play or pause | Filmed clips only |
| Arrow keys | Nudge the label (`Shift` for bigger steps) | The label is off target |

- **Placing a label:** click in the preview, or use a preset such as
  **Back left**. The label stays at that point on the *screen*. It does not
  follow the food if the phone or the pan moves, so prop the phone up and
  reposition the label when needed.
- **Preview:** shows the participant's camera with the labels on top, in the shape
  of their screen. It does not show filmed clips. A moment is marked
  **on screen** while it is showing and **✓ shown** once it is in the recap.
- **Recap:** lists only moments shown as a glance label since the last reset.
- **Reset session:** clears the label, its position and the recap, and shows the
  instructions again. It keeps the camera or clip mode, but goes back to the first
  clip.

## Camera and filmed clips

The display starts in **Live camera** mode. Switch under **Video** on the
console. The camera picture is also sent to the console, directly between the
two devices on the local network. The app does not record or save it.

For **Filmed clip** mode, put video files in `public/clips/`. The expected names
are listed in `clips` in `src/moments.js`: `onions.mp4`, `garlic.mp4`, `egg.mp4`
and `sauce.mp4`.

## Session logs

Each time the relay starts it creates `logs/session-<time>.jsonl`, with one
timestamped entry per wizard command, connection and display event. Times are in
UTC.

- Logs do not say which participant they belong to. Restart `npm run dev` between
  participants to get a separate file for each, and note which is whose.
- Saving `server/index.js` restarts the relay, which clears the session, shows the
  instructions and starts a new log, so do not edit it during a session.
- `logs/` is git-ignored, so back the files up separately.

## Changing the content

The moments and their wording are in `src/moments.js`. **The current text is
placeholder:** check every explanation against a food-science source before
testing with participants.

## Troubleshooting

| Problem | Try |
| --- | --- |
| Phone cannot open the page | Check it is on the same Wi-Fi and the address is current. University Wi-Fi may block devices from reaching each other; try a phone hotspot. Check the laptop's firewall. |
| "Camera unavailable" | Use `https://`. In Chrome, tap the icon left of the address, then **Permissions**, allow the camera, then press **Try again** on the display. |
| Preview stuck on "Connecting to camera…" | It retries by itself. If it never connects, the network or laptop firewall is blocking the devices from reaching each other; try a phone hotspot. |
| "Clip not found" | Add the file to `public/clips/`, or switch to **Live camera**. |
| "Reconnecting…" or **Relay offline** | Check `npm run dev` is still running. Console presses are ignored until it reconnects, so press again afterwards. |
| "2 displays connected" | Close the display page on the extra device or tab. |
| Port already in use | Another copy is probably running. Stop it and start again. |

## Code layout

| File | Purpose |
| --- | --- |
| `src/Display.jsx` | Participant display, camera and clips |
| `src/Console.jsx` | Wizard console and shortcuts |
| `src/Overlay.jsx` | Labels, cards and recap, shared by both screens |
| `src/Instructions.jsx` | Instructions shown before the task |
| `src/cameraFeed.js` | Camera picture from the display to the console |
| `src/moments.js` | Moments, wording and clip names |
| `src/useSession.js` | Connection to the relay |
| `server/index.js` | Relay, shared state and logging |
| `vite.config.js` | HTTPS and the proxy to the relay |

Run `npm run lint` to check the code. Use `npm run dev` for sessions:
`npm run build` and `npm run preview` are not set up for running one.
