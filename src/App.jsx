import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SpectrumBackground from './components/SpectrumBackground';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SearchPage from './pages/SearchPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import MatchPage from './pages/MatchPage';
import './App.css';

function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand" onClick={close}>MusicSearch</Link>

      {/* Desktop links */}
      <div className="nav-links nav-links--desktop">
        {user ? (
          <>
            <Link to="/">Search</Link>
            <Link to="/match">Match</Link>
            {user.role === 'admin' && <Link to="/admin">Upload</Link>}
            <Link to="/profile">Profile</Link>
            <button className="btn-link" onClick={logout}>Sign Out</button>
          </>
        ) : (
          <>
            <Link to="/login">Sign In</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>

      {/* Hamburger button — mobile only */}
      <button
        className={`hamburger ${open ? 'hamburger--open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>

      {/* Mobile drawer */}
      <div className={`nav-drawer ${open ? 'nav-drawer--open' : ''}`}>
        {user ? (
          <>
            <Link to="/" onClick={close}>Search</Link>
            <Link to="/match" onClick={close}>Match</Link>
            {user.role === 'admin' && <Link to="/admin" onClick={close}>Upload</Link>}
            <Link to="/profile" onClick={close}>Profile</Link>
            <button className="btn-link" onClick={() => { logout(); close(); }}>Sign Out</button>
          </>
        ) : (
          <>
            <Link to="/login" onClick={close}>Sign In</Link>
            <Link to="/register" onClick={close}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

function AppRoutes() {
  return (
    <>
      <SpectrumBackground />
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={<ProtectedRoute><SearchPage /></ProtectedRoute>}
          />
          <Route
            path="/admin"
            element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>}
          />
          <Route
            path="/profile"
            element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
          />
          <Route
            path="/match"
            element={<ProtectedRoute><MatchPage /></ProtectedRoute>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
