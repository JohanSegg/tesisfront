// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexto/AuthContext'; // Importa AuthProvider
import LoginPage from './pages/LoginPage'; // Páginas de Login, grabación, dashboard e historial
import RecordingPage from './pages/RecordingPage';
import DashboardPage from './pages/DashboardPage';
import HistorialPage from './pages/HistorialPage';
import ProfilePage from './pages/ProfilePage';
import { SettingsProvider } from './contexto/SettingsContext';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';


const App: React.FC = () => {
  return (
    <Router>
      <SettingsProvider>
        <AuthProvider> {/* Envuelve toda la aplicación con AuthProvider */}
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} /> {/**/}
            <Route path="/recording" element={<RecordingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/Historial" element={<HistorialPage />} />
            <Route path="/settings" element={<SettingsPage />} /> {/* NEW */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />

            {/**/}
          </Routes>
        </AuthProvider>
      </SettingsProvider>
    </Router>
  );
};

export default App; // exporta App.tsx como un componente llamado App 
