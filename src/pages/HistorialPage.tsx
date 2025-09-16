import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext'; // Asegúrate que la ruta sea correcta
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  //  const API_BASE_URL = 'http://127.0.0.1:8000';

// --- Definición de Tipos para los Datos de la API ---
interface Cuestionario {
  cuestionario_id: number;
  sesion_id: number;
  descripcion_trabajo: string | null; // Cambiado a string según el ejemplo
  nivel_de_sensacion_estres: number | null;
  molestias_fisicas_visual: number | null;
  molestias_fisicas_otros: number | null;
  dificultad_concentracion: number | null;
  created_at: string;
  updated_at: string;
}


// Interfaz actualizada para SesionSummary
interface SesionSummary {
  sesion_id: number;
  trabajador_id: number;
  fecha_sesion: string;
  hora_inicio: string;
  hora_fin: string | null;
  estado_grabacion: 'Iniciada' | 'Finalizada';
  duracion_calculada_segundos: number;
  porcentaje_estres: number;
  total_lecturas: number;
  cuestionario: Cuestionario | null; // <-- Campo actualizado
}
const LevelBar: React.FC<{ label: string; level: number | null }> = ({ label, level }) => {
  if (level === null || level < 1 || level > 5) {
    return (
      <div>
        <span className="font-medium text-gray-700">{label}:</span>
        <span className="ml-2 text-gray-500">N/A</span>
      </div>
    );
  }

  const percentage = (level / 5) * 100;
  // Colores basados en el nivel (1-2: verde, 3: amarillo, 4-5: rojo)
  const barColor = level <= 2 ? 'bg-green-500' : level === 3 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={`font-bold   ${barColor.replace('bg-','text-')}`}>{level}/5</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`${barColor} h-2.5 rounded-full`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

// --- Componente para mostrar los detalles del cuestionario ---
const CuestionarioDetails: React.FC<{ cuestionario: Cuestionario }> = ({ cuestionario }) => {
  return (
    <div className="mt-4 pt-4 border-t border-dashed border-gray-300">
      <h5 className="font-semibold text-gray-800 mb-3">Respuestas del Cuestionario</h5>
      <div className="space-y-4 text-sm">
        {cuestionario.descripcion_trabajo && (
           <p className="text-gray-700">
             <strong>Descripción del trabajo:</strong>
             <span className="block mt-1 p-2 bg-gray-100 rounded text-gray-800 italic">"{cuestionario.descripcion_trabajo}"</span>
           </p>
        )}
        <LevelBar label="Sensación Estres" level={cuestionario.nivel_de_sensacion_estres} />
        <LevelBar label="Molestias Visuales" level={cuestionario.molestias_fisicas_visual} />
        <LevelBar label="Otras Molestias Físicas" level={cuestionario.molestias_fisicas_otros} />
        <LevelBar label="Dificultad de Concentración" level={cuestionario.dificultad_concentracion} />
      </div>
    </div>
  );
};

// --- 2. Componente para una tarjeta de sesión individual ---
const SesionCard: React.FC<{
  sesion: SesionSummary;
  onDelete?: (id: number) => void;
}> = ({ sesion, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatSecondsToHHMMSS = (totalSeconds: number): string => {
    if (totalSeconds < 0) return "00:00:00";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <div className="bg-white rounded-lg shadow-md transition-shadow duration-300 hover:shadow-lg">
      {/* --- a. Cabecera --- */}
      <div className="p-4 flex items-center justify-between gap-2">
        <div className="text-gray-800">
          <p className="font-semibold text-base md:text-lg">
            Sesión #{sesion.sesion_id}
          </p>
          <p className="text-sm text-gray-600">
            Duración: {formatSecondsToHHMMSS(sesion.duracion_calculada_segundos)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleExpand}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
          >
            {isExpanded ? "Ver menos" : "Ver más"}
          </button>
          <button
            onClick={() => onDelete && onDelete(sesion.sesion_id)}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* --- Contenido Desplegable --- */}
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          isExpanded ? "max-h-[40rem]" : "max-h-0"
        }`}
      >
        <div className="border-t border-gray-200 px-4 pb-4 pt-3">
          <h4 className="font-semibold text-gray-700 mb-2">Detalles de la Sesión</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p>
              <strong>Estado:</strong>{" "}
              <span
                className={`font-medium ${
                  sesion.estado_grabacion === "Finalizada"
                    ? "text-green-600"
                    : "text-yellow-600"
                }`}
              >
                {sesion.estado_grabacion}
              </span>
            </p>
            <p>
              <strong>Hora de Inicio:</strong>{" "}
              {new Date(sesion.hora_inicio).toLocaleTimeString("es-ES")}
            </p>
            <p>
              <strong>Porcentaje de Estrés:</strong>{" "}
              {sesion.porcentaje_estres.toFixed(2)}%
            </p>
            <p>
              <strong>Total de Lecturas:</strong> {sesion.total_lecturas}
            </p>
          </div>

          {/* Cuestionario */}
          {sesion.cuestionario ? (
            <CuestionarioDetails cuestionario={sesion.cuestionario} />
          ) : (
            <div className="mt-4 pt-4 border-t border-dashed border-gray-300">
              <p className="text-center text-gray-500 italic">
                No hay un cuestionario registrado para esta sesión.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



// 2. SECCION RESTANTE DEL HISTORIAL
// --- a. Componente principal de la pagina de Historial ---
const HistorialPage: React.FC = () => {
  const { trabajadorId } = useAuth();
  const navigate = useNavigate();

  // Estados para los filtros y los datos
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sesiones, setSesiones] = useState<SesionSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [sesionToDelete, setSesionToDelete] = useState<number | null>(null);


  const handleDeleteRequest = (id: number) => {
    setSesionToDelete(id);
    setShowConfirmModal(true);
  };

   const confirmDelete = async () => {
    if (!sesionToDelete) return;

    try {
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/sessions/${sesionToDelete}/delete`;
      const response = await fetch(apiUrl, { method: "DELETE" });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Error al eliminar sesión");
      }

      // Filtrar del estado
      setSesiones((prev) => prev.filter((s) => s.sesion_id !== sesionToDelete));

      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error desconocido");
    }
  };

  // --- b. Logica de fetching (obtencion externa) de datos ---
  const fetchSesiones = useCallback(async (start: string, end: string) => {
    if (!trabajadorId) {
        setError("ID de trabajador no disponible. Por favor, inicie sesión.");
        setLoading(false);
        return;
    }
    setLoading(true);
    setError(null);
    try {
      const apiUrl = `${API_BASE_URL}/trabajadores/${trabajadorId}/sesiones/summary/?start_date=${start}&end_date=${end}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al obtener el historial');
      }
      const data: SesionSummary[] = await response.json();
      setSesiones(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error desconocido.');
      }
      setSesiones([]); // Limpiar datos en caso de error
    } finally {
      setLoading(false);
    }
  }, [trabajadorId]);

  // --- Efecto para la carga inicial (rango del mes actual) ---
  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    
    setStartDate(firstDayOfMonth);
    setEndDate(lastDayOfMonth);
    
    fetchSesiones(firstDayOfMonth, lastDayOfMonth);
  }, [fetchSesiones]);

  // --- Manejador para el botón de búsqueda ---
  const handleSearch = () => {
    if (startDate && endDate) {
      fetchSesiones(startDate, endDate);
    } else {
      setError("Por favor, seleccione una fecha de inicio y una fecha de fin.");
    }
  };
  
  // --- Memoización para agrupar sesiones por fecha ---
  const sesionesAgrupadas = useMemo(() => {
    return sesiones.reduce((acc, sesion) => {
      const fecha = sesion.fecha_sesion;
      if (!acc[fecha]) {
        acc[fecha] = [];
      }
      acc[fecha].push(sesion);
      return acc;
    }, {} as Record<string, SesionSummary[]>);
  }, [sesiones]);

  const handleLogout = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00'); // Asegura que se interprete como local
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* --- Sidebar (Reutilizado del Dashboard) --- */}
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

      {/* --- Contenido Principal del Historial --- */}
      <main className="flex-1 p-4 md:p-8 overflow-auto bg-gray-100">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Historial de Sesiones</h1>
        </header>

        {/* --- Filtros de Fecha --- */}
        <div className="mb-6 p-4 bg-white shadow rounded-lg flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full sm:w-auto">
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio:</label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full pl-3 pr-2 py-2 text-base text-black border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
            />
          </div>
          <div className="flex-1 w-full sm:w-auto">
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin:</label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full pl-3 pr-2 py-2 text-base text-black border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {/* --- Mensajes de Estado y Lista de Sesiones --- */}
        {loading && <p className="text-center text-xl text-gray-600 p-10">Cargando historial...</p>}
        {!loading && error && <p className="text-center text-red-600 bg-red-100 p-4 rounded-md shadow">Error: {error}</p>}
        {!loading && !error && sesiones.length === 0 && (
          <div className="bg-white p-10 rounded-xl shadow-lg text-center text-gray-500">
            <h3 className="text-xl font-semibold mb-2">No se encontraron sesiones</h3>
            <p>No hay registros de sesiones para el rango de fechas seleccionado.</p>
          </div>
        )}

        {!loading && !error && sesiones.length > 0 && (
          <div className="space-y-6">
            {Object.entries(sesionesAgrupadas).map(([fecha, sesionesDelDia]) => (
              <section key={fecha}>
                <h2 className="text-xl font-semibold text-gray-700 border-b border-gray-300 pb-2 mb-4">
                  {formatDateForDisplay(fecha)}
                </h2>
                <div className="space-y-3">
                  {sesionesDelDia.map(sesion => (
                    <SesionCard
                      key={sesion.sesion_id}
                      sesion={sesion}
                      onDelete={handleDeleteRequest}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
         {/* Modal Confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Confirmar eliminación
            </h2>
            <p className="text-gray-600 mb-6">
              ¿Seguro que deseas eliminar esta sesión?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96 text-center">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Sesión eliminada con éxito
            </h2>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      )}
    
      </main>
    </div>
  );
};

export default HistorialPage;
