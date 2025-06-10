// src/App.tsx (Ejemplo)
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexto/AuthContext'; // Importa tu AuthProvider
import LoginPage from './pages/LoginPage';
import RecordingPage from './pages/RecordingPage'; // Tu página de grabación
import DashboardPage from './pages/DashboardPage';
// Importa otros componentes/páginas según sea necesario

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider> {/* Envuelve toda tu aplicación con AuthProvider */}
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} /> {/* Puedes tener /login también */}
          <Route path="/recording" element={<RecordingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          {/* Agrega otras rutas aquí */}
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
