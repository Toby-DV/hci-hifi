import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // HTTPS (self-signed) so the tablet's browser allows camera access over the LAN.
  // Accept the certificate warning once on each device.
  plugins: [react(), basicSsl()],
  server: {
    // Listen on the LAN so the tablet can open https://<laptop-ip>:5173/display
    host: true,
    // Forward the WebSocket traffic to the Node server (server/index.js),
    // so both devices only need to know one address.
    proxy: {
      '/socket.io': { target: 'http://localhost:3001', ws: true },
    },
  },
})
