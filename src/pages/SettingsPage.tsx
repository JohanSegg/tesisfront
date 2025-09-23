import React, { useCallback } from 'react';
import { useSettings, type DurationKey } from '../contexto/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';


const SettingsPage: React.FC = () => {
  const { defaultDurationKey, setDefaultDurationKey, showResults, setShowResults, durationLabel } = useSettings();
  const {trabajadorId, logout } = useAuth();
  const navigate = useNavigate();

  const durations: DurationKey[] = ['20m', '1h', '2h', '4h'];
  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  return (

    <div className="flex h-screen bg-gray-900 text-gray-100">

 <aside className="w-64 bg-gray-800 p-6 flex flex-col justify-between shadow-lg">
            <div>
            <div className="mb-10 text-center">
                <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-yellow-500 mx-auto"
                viewBox="0 0 24 24"
                fill="currentColor"
                >
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1.5-12c.828 0 1.5-.672 1.5-1.5S11.328 5 10.5 5 9 5.672 9 6.5s.672 1.5 1.5 1.5zm3 0c.828 0 1.5-.672 1.5-1.5S14.328 5 13.5 5 12 5.672 12 6.5s.672 1.5 1.5 1.5zm-3 6c-.828 0-1.5.672-1.5 1.5s.672 1.5 1.5 1.5 1.5-.672 1.5-1.5-.672-1.5-1.5-1.5zm3 0c-.828 0-1.5.672-1.5 1.5s.672 1.5 1.5 1.5 1.5-.672 1.5-1.5-.672-1.5-1.5-1.5z"/>
                </svg>
                <h2 className="text-xl font-semibold text-gray-50 mt-2">Stress Detection App</h2>
            </div>
            <nav className="space-y-4">
                <button
                onClick={() => navigate('/recording')} // Asumiendo que esta es tu página de grabación
                className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition duration-200"
                >
                <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {/* Icono de Círculo (Record) */}
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Grabar
                </button>
                <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition duration-200"
                >
                <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                Estadísticas
                </button>
            <button
                onClick={() => navigate('/historial')}
                className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition duration-200"
            >
                <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {/* Icono de Documento con texto (History Log) */}
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Historial
            </button>

                <button
                onClick={() => navigate('/settings')}
                className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition duration-200"
                >
                <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.827 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.827 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.827-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.827-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configuración
                </button>
                <button
                onClick={() => navigate('/profile')}
                className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition duration-200"
                >
                <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Perfil
                </button>
            </nav>        </div>
            <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-3 mt-8 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition duration-200"
            >
            {/* SVG Logout */}
            Cerrar Sesión
            </button>
        </aside>
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
       

      <h1 className="text-3xl font-extrabold mb-6">Configuración</h1>

      <section className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Duración por defecto de las sesiones</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {durations.map((d) => (
            <label key={d} className={`cursor-pointer border rounded px-4 py-3 text-center ${defaultDurationKey === d ? 'border-indigo-400 bg-gray-700' : 'border-gray-600 hover:border-gray-500'}`}>
              <input
                type="radio"
                name="defaultDurationKey"
                className="hidden"
                checked={defaultDurationKey === d}
                onChange={() => setDefaultDurationKey(d)}
              />
              {durationLabel(d)}
            </label>
          ))}
        </div>
        <p className="text-gray-400 mt-3 text-sm">Esta duración se usa cuando en la pantalla de grabación eliges “Automática (predeterminada)”.</p>
      </section>

      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Visualización de resultados </h2>
        <label className="inline-flex items-center gap-3">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={showResults}
            onChange={(e) => setShowResults(e.target.checked)}
          />
          <span>Mostrar panel de resultados debajo del video</span>
        </label>
      </section>
    </div>
    </div>
  );
};

export default SettingsPage;
