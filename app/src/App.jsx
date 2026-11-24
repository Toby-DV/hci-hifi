import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import Console from './Console.jsx'
import Display from './Display.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/display" element={<Display />} />
        <Route path="/console" element={<Console />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}

function Home() {
  return (
    <main className="home">
      <h1>Kitchen Chemistry</h1>
      <p>Open each screen on its own device.</p>
      <Link to="/display">Participant display (tablet)</Link>
      <Link to="/console">Wizard console (laptop)</Link>
    </main>
  )
}
