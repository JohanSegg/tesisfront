// src/pages/ProfilePage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext'; 

// El tipo de datos no cambia
type ProfileFormData = {
  nombre: string;
  username: string;
  fecha_de_nacimiento?: string;
  genero?: string;
  estado_civil?: string;
  uso_de_anteojos: boolean;
  estudio_y_trabajo?: string;
  horas_trabajo_semanal?: number | string;
  horas_descanso_dia?: number | string;
};

const ProfilePage: React.FC = () => {
  const API_BASE_URL = 'https://tesisback.onrender.com';
//   const API_BASE_URL = 'http://127.0.0.1:8000';
  const navigate = useNavigate();
  const { logout } = useAuth(); // Solo necesitamos logout del contexto ahora

  const [formData, setFormData] = useState<ProfileFormData>({
    nombre: '',
    username: '',
    fecha_de_nacimiento: '',
    genero: '',
    estado_civil: '',
    uso_de_anteojos: false,
    estudio_y_trabajo: '',
    horas_trabajo_semanal: '',
    horas_descanso_dia: '',
  });

  const [isLoading, setIsLoading] = useState(true); // Estado para mostrar "Cargando..."
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- CAMBIO CLAVE: useEffect para cargar datos directamente desde el backend ---
  useEffect(() => {
    const fetchProfileData = async () => {
      const trabajadorId = sessionStorage.getItem('trabajadorId');
      if (!trabajadorId) {
        setErrorMessage("Usuario no identificado. Por favor, inicie sesión.");
        setIsLoading(false);
        return;
      }

      try {
        // Usamos el nuevo endpoint GET /trabajadores/{id}/
        const response = await fetch(`${API_BASE_URL}/trabajadores/${trabajadorId}/`);
        if (!response.ok) {
          throw new Error('No se pudieron cargar los datos del perfil.');
        }
        const userData = await response.json();

        // Poblamos el formulario con los datos recibidos
        setFormData({
          nombre: userData.nombre || '',
          username: userData.username || '',
          fecha_de_nacimiento: userData.fecha_de_nacimiento ? userData.fecha_de_nacimiento.split('T')[0] : '',
          genero: userData.genero || '',
          estado_civil: userData.estado_civil || '',
          uso_de_anteojos: userData.uso_de_anteojos || false,
          estudio_y_trabajo: userData.estudio_y_trabajo || '',
          horas_trabajo_semanal: userData.horas_trabajo_semanal ?? '',
          horas_descanso_dia: userData.horas_descanso_dia ?? '',
        });

      } catch (error: any) {
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, []); // El array vacío [] asegura que esto se ejecute solo una vez cuando el componente se monta.

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trabajadorId = sessionStorage.getItem('trabajadorId');
    if (!trabajadorId) {
        setErrorMessage("No se puede actualizar el perfil sin un ID de usuario.");
        return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    // --- CAMBIO CLAVE: Objeto de actualización más limpio y explícito ---
    // Solo incluimos los campos que el usuario puede editar.
    const dataToUpdate = {
      nombre: formData.nombre,
      fecha_de_nacimiento: formData.fecha_de_nacimiento || null,
      genero: formData.genero || null,
      estado_civil: formData.estado_civil || null,
      uso_de_anteojos: formData.uso_de_anteojos,
      estudio_y_trabajo: formData.estudio_y_trabajo || null,
      horas_trabajo_semanal: formData.horas_trabajo_semanal ? Number(formData.horas_trabajo_semanal) : null,
      horas_descanso_dia: formData.horas_descanso_dia ? Number(formData.horas_descanso_dia) : null,
    };
    
    try {
      // --- CORRECCIÓN: URL corregida de 'trabajdores' a 'trabajadores' ---
      const response = await fetch(`${API_BASE_URL}/trabajadores/${trabajadorId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToUpdate),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al actualizar el perfil.');
      }
      
      setSuccessMessage('¡Perfil actualizado con éxito!');

    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = useCallback(() => {
    // Limpiamos sessionStorage al cerrar sesión para ser consistentes
    sessionStorage.removeItem('trabajadorId');
    sessionStorage.removeItem('username');
    logout();
    navigate('/login');
  }, [logout, navigate]);

  // Mostrar un estado de carga mientras se obtienen los datos
  if (isLoading) {
    return <div className="flex h-screen bg-gray-900 text-gray-100 justify-center items-center">Cargando perfil...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Tu Barra Lateral (Sidebar) no necesita cambios */}
      <aside className="w-64 bg-gray-800 p-6 flex flex-col justify-between shadow-lg">
        <div>
          <div className="mb-10 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-500 mx-auto" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1.5-12c.828 0 1.5-.672 1.5-1.5S11.328 5 10.5 5 9 5.672 9 6.5s.672 1.5 1.5 1.5zm3 0c.828 0 1.5-.672 1.5-1.5S14.328 5 13.5 5 12 5.672 12 6.5s.672 1.5 1.5 1.5zm-3 6c-.828 0-1.5.672-1.5 1.5s.672 1.5 1.5 1.5 1.5-.672 1.5-1.5-.672-1.5-1.5-1.5zm3 0c-.828 0-1.5.672-1.5 1.5s.672 1.5 1.5 1.5 1.5-.672 1.5-1.5-.672-1.5-1.5-1.5z"/></svg>
            <h2 className="text-xl font-semibold text-gray-50 mt-2">Stress Detection App</h2>
          </div>
          <nav className="space-y-4">
            <button onClick={() => navigate('/recording')} className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition duration-200"><svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Grabar</button>
            <button onClick={() => navigate('/dashboard')} className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition duration-200"><svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>Estadísticas</button>
            <button onClick={() => navigate('/historial')} className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition duration-200"><svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Historial</button>
            <button onClick={() => navigate('/settings')} className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition duration-200"><svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.827 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.827 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.827-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.827-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>Configuración</button>
            <button onClick={() => navigate('/profile')} className="w-full flex items-center p-3 text-lg font-medium text-gray-200 bg-gray-700 rounded-lg transition duration-200"><svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>Perfil</button>
          </nav>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center justify-center p-3 mt-8 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition duration-200"><svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-10a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>Cerrar Sesión</button>
      </aside>
      
      {/* El resto del JSX del formulario no necesita cambios */}
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-4xl font-extrabold text-white mb-6">Editar Perfil</h1>
        {successMessage && <div className="bg-green-500 bg-opacity-20 text-green-300 p-4 rounded-lg mb-6 text-center">{successMessage}</div>}
        {errorMessage && <div className="bg-red-500 bg-opacity-20 text-red-400 p-4 rounded-lg mb-6 text-center">{errorMessage}</div>}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-300">Nombre Completo:</label>
                <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} required className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300">Usuario (no editable):</label>
                <input type="text" id="username" name="username" value={formData.username} readOnly className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-600 border border-gray-500 text-gray-400 cursor-not-allowed"/>
              </div>
              <div>
                <label htmlFor="fecha_de_nacimiento" className="block text-sm font-medium text-gray-300">Fecha de Nacimiento:</label>
                <input type="date" id="fecha_de_nacimiento" name="fecha_de_nacimiento" value={formData.fecha_de_nacimiento} onChange={handleInputChange} className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
              <div>
                <label htmlFor="genero" className="block text-sm font-medium text-gray-300">Género:</label>
                <select id="genero" name="genero" value={formData.genero} onChange={handleInputChange} className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Seleccionar</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label htmlFor="estado_civil" className="block text-sm font-medium text-gray-300">Estado Civil:</label>
                <select id="estado_civil" name="estado_civil" value={formData.estado_civil} onChange={handleInputChange} className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Seleccionar</option>
                  <option value="Casado/a">Casado/a</option>
                  <option value="Soltero/a">Soltero/a</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label htmlFor="estudio_y_trabajo" className="block text-sm font-medium text-gray-300">Situación Laboral/Académica:</label>
                <select id="estudio_y_trabajo" name="estudio_y_trabajo" value={formData.estudio_y_trabajo} onChange={handleInputChange} className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Seleccionar</option>
                  <option value="Solo estudio">Solo estudio</option>
                  <option value="Solo trabajo">Solo trabajo</option>
                  <option value="No estudio ni trabajo">No estudio ni trabajo</option>
                  <option value="Ambos">Ambos</option>
                </select>
              </div>
              <div>
                <label htmlFor="horas_trabajo_semanal" className="block text-sm font-medium text-gray-300">Horas de Trabajo a la Semana:</label>
                <input type="number" id="horas_trabajo_semanal" name="horas_trabajo_semanal" value={formData.horas_trabajo_semanal} onChange={handleInputChange} className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
              <div>
                <label htmlFor="horas_descanso_dia" className="block text-sm font-medium text-gray-300">Horas de Descanso al Día:</label>
                <input type="number" id="horas_descanso_dia" name="horas_descanso_dia" value={formData.horas_descanso_dia} onChange={handleInputChange} className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
            </div>
            <div className="flex items-center pt-4">
              <input type="checkbox" id="uso_de_anteojos" name="uso_de_anteojos" checked={formData.uso_de_anteojos} onChange={handleInputChange} className="h-4 w-4 text-indigo-500 focus:ring-indigo-400 border-gray-600 rounded bg-gray-700"/>
              <label htmlFor="uso_de_anteojos" className="ml-2 block text-sm text-gray-300">Uso anteojos</label>
            </div>
            <div className="flex justify-end pt-4">
              <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-200 bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed">
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;