import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Chat from './pages/Chat'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)

  const handleLogin = (userData) => {
    setUser(userData)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setUser(null)
    setIsAuthenticated(false)
  }

  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col font-sans text-torolalana-text overflow-hidden bg-gray-50 text-slate-900">
        <header className="fixed top-0 left-0 right-0 h-16 bg-torolalana-dark text-white shadow-lg flex items-center z-50">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-bold text-torolalana-dark overflow-hidden shadow-inner transform transition-hover hover:scale-105 duration-200">
                <img src="https://torolalana.gov.mg/static/733d84e479b65c1473368ccdf81c2dd8/landing_page_cover_8e5eca16bf.svg" alt="Logo" className="w-full h-full object-contain p-1.5" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-black tracking-tighter leading-none text-white">TOROLALANA</h1>
                <span className="text-[10px] font-medium text-torolalana-light tracking-[0.2em] uppercase opacity-80">Assistant Administratif</span>
              </div>
            </div>

            {isAuthenticated && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-torolalana-primary flex items-center justify-center text-sm font-bold">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="font-medium hidden sm:block">{user?.name || 'Utilisateur'}</span>
                </div>
                <button onClick={handleLogout} className="text-sm hover:text-torolalana-light border border-transparent hover:border-white px-3 py-1 rounded transition-colors">
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Spacer for fixed header */}
        <div className="h-16 shrink-0"></div>

        <main className="flex-1 flex overflow-hidden">
          <Routes>
            <Route path="/login" element={
              !isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/chat" />
            } />
            <Route path="/chat" element={
              isAuthenticated ? <Chat user={user} /> : <Navigate to="/login" />
            } />
            <Route path="/" element={<Navigate to={isAuthenticated ? "/chat" : "/login"} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
