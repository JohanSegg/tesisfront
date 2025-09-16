// src/pages/DashboardPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../contexto/AuthContext'; 


// Definición de Tipos de Datos de la API
interface ResumenMensual {
  trabajador_id: number;
  month: number;
  year: number;
  tiempo_total_grabacion_mes_segundos: number;
  tiempo_promedio_grabacion_por_dia_activo_segundos: number | null;
  nivel_estres_promedio_mensual: number | null;
  numero_total_sesiones_mes: number;
  promedio_sesiones_por_dia_activo: number | null;
  dias_con_actividad: number;
}

interface ResumenDiario {
  fecha: string; // La API devuelve 'YYYY-MM-DD'
  porcentaje_estres_promedio: number | null;
  duracion_total_grabacion_segundos: number | null;
  numero_sesiones: number;
}

// --- Formatear segundos a HH:MM:SS ---
const formatSecondsToHHMMSS = (totalSeconds: number | null | undefined): string => {
  if (totalSeconds == null || totalSeconds < 0) {
    return '00:00:00';
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};


// --- Constantes ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// const API_BASE_URL = 'https://tesisback.onrender.com'; //'http://127.0.0.1:8000' si es que es local
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i); // Últimos 5 años
const months = [
  { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' }, { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' }, { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
];

const DashboardPage: React.FC = () => {
  const { trabajadorId } = useAuth();
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const [overallData, setOverallData] = useState<ResumenMensual | null>(null);
  const [dailyData, setDailyData] = useState<ResumenDiario[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trabajadorId) {
      setError("ID de trabajador no disponible. Por favor, inicie sesión.");
      setOverallData(null);
      setDailyData([]);
      return;
    }
    if (!selectedMonth || !selectedYear) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Obtiene todos los datos (mensualmente)
        const overallResponse = await fetch(
          `${API_BASE_URL}/trabajadores/${trabajadorId}/sesiones/summary/monthly/overall/?month=${selectedMonth}&year=${selectedYear}`
        );
        if (!overallResponse.ok) {
          const errorData = await overallResponse.json();
          throw new Error(`Error obteniendo resumen mensual: ${errorData.detail || overallResponse.statusText}`);
        }
        const overallResult: ResumenMensual = await overallResponse.json();
        setOverallData(overallResult);

        // Obtiene datos diarios
        const dailyResponse = await fetch(
          `${API_BASE_URL}/trabajadores/${trabajadorId}/sesiones/summary/monthly/daily-aggregated/?month=${selectedMonth}&year=${selectedYear}`
        );
        if (!dailyResponse.ok) {
          const errorData = await dailyResponse.json();
          throw new Error(`Error obteniendo datos diarios: ${errorData.detail || dailyResponse.statusText}`);
        }
        const dailyResult: ResumenDiario[] = await dailyResponse.json();
        setDailyData(dailyResult);

      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Ocurrió un error desconocido.');
        }
        setOverallData(null);
        setDailyData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [trabajadorId, selectedMonth, selectedYear]);

  // Memoriza los graficos que evitan renderizados innecesarios
  const chartData = useMemo(() => {
    return dailyData.map(day => ({
      fecha: new Date(day.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }), // Formato DD/MM
      'Estrés Promedio (%)': day.porcentaje_estres_promedio != null ? parseFloat(day.porcentaje_estres_promedio.toFixed(2)) : null,
      'Duración Grabación (seg)': day.duracion_total_grabacion_segundos,
      'Nº Sesiones': day.numero_sesiones,
    })).sort((a, b) => new Date(a.fecha.split('/').reverse().join('-')).getTime() - new Date(b.fecha.split('/').reverse().join('-')).getTime()); // Establece un orden
  }, [dailyData]);


  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(parseInt(event.target.value, 10));
  };

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(event.target.value, 10));
  };
  const handleLogout = useCallback(() => {
    // stopDetectionAndAnalysis();
    // logout();
    navigate('/login');
  }, [ navigate]);
  
  // PARTE VISUAL
  return (
    <div className="flex h-screen bg-gray-900 text-gray-100"> {/* Estilo base similar a RecordingPage */}
    <aside className="w-64 bg-gray-800 p-6 flex flex-col justify-between shadow-lg">
        <div>
          {/* Logo */}
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

          {/*Menu de navegacion */}
         <nav className="space-y-4">
          <button
              onClick={() => navigate('/recording')} // 1. Pagina de grabación
              className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition duration-200"
            >
              <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {/* Icono de grabacion */}
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Grabar
            </button>
            <button
              onClick={() => navigate('/dashboard')} // 2. Dashboard propiamente dicho :P
              className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition duration-200"
            >
              <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              Estadísticas
            </button>
           <button
            onClick={() => navigate('/historial')} // 3. Historial
            className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition duration-200"
          >
            <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {/* Icono de historial */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Historial
          </button>

            <button
              onClick={() => navigate('/settings')} // 4. Configuracion
              className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition duration-200"
            >
              <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.827 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.827 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.827-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.827-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configuración
            </button>
            <button
              onClick={() => navigate('/profile')} // 5. Perfil
              className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition duration-200"
            >
              <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Perfil
            </button>
          </nav>
        </div>

        {/* Boton Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center p-3 mt-8 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition duration-200"
        >
          <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-10a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar Sesión
        </button>
      </aside>
      
      {/* --- CONTENIDO PRINCIPAL DEL DASHBOARD --- */}
      <main className="flex-1 p-4 md:p-8 overflow-auto bg-gray-100"> {/* Fondo claro para el contenido */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Estadísticas Mensuales de Estrés Facial</h1>
        </header>

        {/* a. Filtros */}
        <div className="mb-6 p-4 bg-white shadow rounded-lg flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1 w-full sm:w-auto">
          <label htmlFor="month-select" className="block text-sm font-medium text-gray-700 mb-1">
            Mes:
          </label>
          <select
            id="month-select"
            value={selectedMonth}
            onChange={handleMonthChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base text-black border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 w-full sm:w-auto">
          <label htmlFor="year-select" className="block text-sm font-medium text-gray-700 mb-1">
            Año:
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={handleYearChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base text-black border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
          >
            {years.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        </div>

        {/* b. Mensajes de Estado y Contenido */}
        {loading && <p className="text-center text-xl text-gray-600 p-10">Cargando datos, por favor espere...</p>}
        
        {!loading && error && <p className="text-center text-red-600 bg-red-100 p-4 rounded-md shadow">Error: {error}</p>}
        
        {!loading && !error && !trabajadorId && (
          <div className="flex items-center justify-center h-full">
            <p className="text-center text-orange-600 bg-orange-100 p-6 rounded-md shadow-lg text-lg">
              ID de trabajador no disponible. Por favor, <strong>inicie sesión</strong> para ver las estadísticas.
            </p>
          </div>
        )}

        {!loading && !error && trabajadorId && (
          <>
            {overallData ? (
              <>
                {/* c. Cards de Resumen Mensual */}
                <section className="mb-8">
                   <h2 className="text-2xl font-semibold text-gray-700 mb-4">Resumen del Mes ({months.find(m=>m.value === selectedMonth)?.label} {selectedYear})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <h3 className="text-lg font-medium text-indigo-600">Nivel de Estrés Promedio</h3>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {overallData.nivel_estres_promedio_mensual != null 
                    ? `${overallData.nivel_estres_promedio_mensual.toFixed(2)}%` 
                    : 'N/A'}
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <h3 className="text-lg font-medium text-indigo-600">Tiempo Total de Grabación</h3>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {formatSecondsToHHMMSS(overallData.tiempo_total_grabacion_mes_segundos)}
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <h3 className="text-lg font-medium text-indigo-600">Nº Total de Sesiones</h3>
                <p className="text-3xl font-bold text-gray-800 mt-2">{overallData.numero_total_sesiones_mes}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <h3 className="text-lg font-medium text-indigo-600">Días con Actividad</h3>
                <p className="text-3xl font-bold text-gray-800 mt-2">{overallData.dias_con_actividad}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <h3 className="text-lg font-medium text-indigo-600">Grabación Prom./Día Activo</h3>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {formatSecondsToHHMMSS(overallData.tiempo_promedio_grabacion_por_dia_activo_segundos)}
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <h3 className="text-lg font-medium text-indigo-600">Sesiones Prom./Día Activo</h3>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {overallData.promedio_sesiones_por_dia_activo != null 
                    ? overallData.promedio_sesiones_por_dia_activo.toFixed(1) 
                    : 'N/A'}
                </p>
              </div>
            </div>
                </section>

                {/* d. Gráfico de Líneas Diario */}
                {dailyData.length > 0 ? (
                  <section className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-semibold text-gray-700 mb-6">Tendencia Diaria de Estrés</h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 12, fill: '#4A5568' }} /> {/*Eje X*/}
                  <YAxis yAxisId="left" 
                         label={{ value: 'Estrés (%)', angle: -90, position: 'insideLeft', fill: '#4A5568', dy:40, fontSize: 14 }} 
                         tick={{ fontSize: 12, fill: '#4A5568' }} 
                         domain={[0, 100]} 
                  />{/*Eje y*/}
                  <YAxis yAxisId="right" 
                         orientation="right" 
                         label={{ value: 'Nº Sesiones', angle: -90, position: 'insideRight', fill: '#4A5568', dx: -10, fontSize: 14 }} 
                         tick={{ fontSize: 12, fill: '#4A5568' }} 
                         allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', borderColor: '#cbd5e0' }}
                    itemStyle={{ color: '#4A5568' }}
                    labelStyle={{ color: '#2D3748', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="Estrés Promedio (%)" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 6 }} dot={{r:3}} />
                  <Line yAxisId="right" type="monotone" dataKey="Nº Sesiones" stroke="#82ca9d" strokeWidth={2} dot={{r:3}} />
                </LineChart>
              </ResponsiveContainer>
                  </section>
                ) : (
                  <div className="bg-white p-6 rounded-xl shadow-lg text-center text-gray-500 mt-4">
                    No hay datos de tendencia diaria disponibles para el período seleccionado.
                  </div>
                )}
              </>
            ) : (
               !loading && !error && ( // Si no se cargaron datos y no hay error mostrar lo siguiente
                <div className="flex items-center justify-center h-3/4">
                    <div className="bg-white p-10 rounded-xl shadow-lg text-center text-gray-500">
                        <h3 className="text-xl font-semibold mb-2">Sin Datos</h3>
                        <p>No se encontraron datos generales para el período seleccionado.</p>
                        <p className="text-sm mt-1">Intente con otro mes o año.</p>
                    </div>
                </div>
               )
            )}
          </>
        )}
      </main>
    </div>
  );

};

export default DashboardPage;
