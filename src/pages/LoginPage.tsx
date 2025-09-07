// src/pages/LoginPage.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type RegisterFormData } from '../contexto/AuthContext'; // Importa RegisterFormData

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showRegisterForm, setShowRegisterForm] = useState<boolean>(false);

// Estados iniciales para el formulario de registro
  const [registerFormData, setRegisterFormData] = useState<RegisterFormData>({
    nombre: '',
    username: '',
    password: '',
    fecha_de_nacimiento: '',
    genero: '',
    estado_civil: '',
    uso_de_anteojos: false,
    estudio_y_trabajo: '',
    horas_trabajo_semanal: '',
    horas_descanso_dia: '',
  });
  const [registerError, setRegisterError] = useState<string>('');
  const [registerSuccess, setRegisterSuccess] = useState<string>('');

  const { login, register } = useAuth();
  const navigate = useNavigate();

 // Manejador (Handler) para el envío del formulario de Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    const success = await login(username, password);
    if (success) {
      setSuccessMessage('Inicio de sesión exitoso. Redirigiendo...');
      navigate('/recording');
    } else {
      setError('Credenciales inválidas. Verifica tu usuario y contraseña.');
    }
  };

// Manejador para el cambio de inputs en el formulario de Registro
  const handleRegisterInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setRegisterFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

// Manejador para el envío del formulario de Registro
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    const dataToSend = {
      ...registerFormData,
      horas_trabajo_semanal: registerFormData.horas_trabajo_semanal === '' ? undefined : Number(registerFormData.horas_trabajo_semanal),
      horas_descanso_dia: registerFormData.horas_descanso_dia === '' ? undefined : Number(registerFormData.horas_descanso_dia),
      fecha_de_nacimiento: registerFormData.fecha_de_nacimiento === '' ? undefined : registerFormData.fecha_de_nacimiento,
    };

    const success = await register(dataToSend as any);
    if (success) {
      setRegisterSuccess('¡Registro exitoso! Ahora puedes iniciar sesión.');
      setRegisterFormData({
        nombre: '', username: '', password: '', fecha_de_nacimiento: '',
        genero: '', estado_civil: '', uso_de_anteojos: false, estudio_y_trabajo: '',
        horas_trabajo_semanal: undefined, horas_descanso_dia: undefined,
      });
      setShowRegisterForm(false);
      setUsername(dataToSend.username);
      setPassword('');
    } else {
      setRegisterError('Error en el registro. El nombre de usuario podría ya existir o los datos son inválidos.');
    }
  };

// PARTE VISUAL
  return (
    <div className="min-h-screen bg-[#1F1F1F] text-gray-200 flex flex-col lg:flex-row items-center justify-center p-4 overflow-hidden relative">
      {/* Fondo abstracto con formas de colores */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute w-[500px] h-[500px] bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob top-[10%] left-[10%]"></div>
        <div className="absolute w-[400px] h-[400px] bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 top-[60%] left-[40%]"></div>
        <div className="absolute w-[600px] h-[600px] bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000 top-[30%] right-[10%]"></div>
      </div>

      {/* Contenedor principal del login */}
      <div className="relative z-10 w-full max-w-7xl h-full flex flex-col lg:flex-row rounded-lg overflow-hidden shadow-2xl">
        {/* Columna izquierda: Formulario de Login/Registro */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12 bg-[#2B2B2B] flex flex-col items-center justify-center min-h-[600px]">
          <div className="flex flex-col items-center mb-8">
            {/* Logo*/}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-yellow-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1.5-12c.828 0 1.5-.672 1.5-1.5S11.328 5 10.5 5 9 5.672 9 6.5s.672 1.5 1.5 1.5zm3 0c.828 0 1.5-.672 1.5-1.5S14.328 5 13.5 5 12 5.672 12 6.5s.672 1.5 1.5 1.5zm-3 6c-.828 0-1.5.672-1.5 1.5s.672 1.5 1.5 1.5 1.5-.672 1.5-1.5-.672-1.5-1.5-1.5zm3 0c-.828 0-1.5.672-1.5 1.5s.672 1.5 1.5 1.5 1.5-.672 1.5-1.5-.672-1.5-1.5-1.5z"/>
            </svg>
            <h2 className="text-3xl font-semibold text-gray-50 mt-4">Bienvenido</h2>
          </div>

          <div className="w-full max-w-sm">

            {/* Formulario de Login */}
            {!showRegisterForm ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-400 sr-only">Usuario</label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Usuario"
                    className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-400 sr-only">Contraseña</label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Contraseña"
                    className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
                {successMessage && <p className="text-green-400 text-sm mt-2 text-center">{successMessage}</p>}

                <button
                  type="submit"
                  className="w-full py-3 mt-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#2B2B2B] focus:ring-purple-500 transition duration-150 ease-in-out"
                >
                  Iniciar Sesión
                </button>

                <div className="flex items-center justify-between mt-4 text-sm">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-gray-400">
                      Recordarme
                    </label>
                  </div>
                  <div className="text-sm text-gray-400">
                    <a href="#" className="font-medium hover:text-purple-500 transition duration-150 ease-in-out" onClick={() => console.log('Forgot password clicked')}>
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>
                </div>

                {/* Enlace para registrarse*/}
                <p className="text-center text-sm text-gray-400 mt-6">
                  ¿No tienes una cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => setShowRegisterForm(true)}
                    className="font-medium text-purple-500 hover:text-purple-600 focus:outline-none focus:underline"
                  >
                    Regístrate aquí
                  </button>
                </p>
              </form>
            ) : (
              // Formulario de Registro
              <form onSubmit={handleRegisterSubmit} className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
                <h2 className="text-xl font-semibold text-gray-50 mb-4 text-center">Crear Cuenta</h2>
                {/* Campos obligatorios */}
                <div>
                  <label htmlFor="register-nombre" className="block text-sm font-medium text-gray-400">Nombre:</label>
                  <input
                    type="text"
                    id="register-nombre"
                    name="nombre"
                    value={registerFormData.nombre}
                    onChange={handleRegisterInputChange}
                    required
                    className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="register-username" className="block text-sm font-medium text-gray-400">Usuario:</label>
                  <input
                    type="text"
                    id="register-username"
                    name="username"
                    value={registerFormData.username}
                    onChange={handleRegisterInputChange}
                    required
                    className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="register-password" className="block text-sm font-medium text-gray-400">Contraseña:</label>
                  <input
                    type="password"
                    id="register-password"
                    name="password"
                    value={registerFormData.password}
                    onChange={handleRegisterInputChange}
                    required
                    className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Campos opcionales */}
                <div>
                  <label htmlFor="register-fecha_de_nacimiento" className="block text-sm font-medium text-gray-400">Fecha de Nacimiento:</label>
                  <input
                    type="date"
                    id="register-fecha_de_nacimiento"
                    name="fecha_de_nacimiento"
                    value={registerFormData.fecha_de_nacimiento || ''}
                    onChange={handleRegisterInputChange}
                    className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="register-genero" className="block text-sm font-medium text-gray-400">Género:</label>
                  <select
                    id="register-genero"
                    name="genero"
                    value={registerFormData.genero || ''}
                    onChange={handleRegisterInputChange}
                    className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="register-estado_civil" className="block text-sm font-medium text-gray-400">Estado Civil:</label>
                 <select
                    id="register-estado_civil"
                    name="estado_civil"
                    value={registerFormData.estado_civil || ''}
                    onChange={handleRegisterInputChange}
                    className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar</option>
                    <option value="Masculino">Casado/a</option>
                    <option value="Femenino">Soltero/a</option>
                    <option value="Otro">Otro</option>
                  </select>
                  {/* <input
                    type="text"
                    id="register-estado_civil"
                    name="estado_civil"
                    value={registerFormData.estado_civil || ''}
                    onChange={handleRegisterInputChange}
                    className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  /> */}
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="register-uso_de_anteojos"
                    name="uso_de_anteojos"
                    checked={registerFormData.uso_de_anteojos}
                    onChange={handleRegisterInputChange}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700"
                  />
                  <label htmlFor="register-uso_de_anteojos" className="ml-2 block text-sm text-gray-400">Uso de Anteojos</label>
                </div>
                <div>
                  <label htmlFor="register-estudio_y_trabajo" className="block text-sm font-medium text-gray-400">Estudio y Trabajo:</label>
                  <select
                    id="register-estudio_y_trabajo"
                    name="estudio_y_trabajo"
                    value={registerFormData.estudio_y_trabajo || ''}
                    onChange={handleRegisterInputChange}
                    className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar</option>
                    <option value="Masculino">Solo estudio</option>
                    <option value="Femenino">Solo trabajo</option>
                    <option value="Femenino">No estudio ni trabajo</option>
                    <option value="Otro">Ambos</option>
                  </select>
                  {/* <input
                    type="text"
                    id="register-estudio_y_trabajo"
                    name="estudio_y_trabajo"
                    value={registerFormData.estudio_y_trabajo || ''}
                    onChange={handleRegisterInputChange}
                    className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  /> */}
                </div>
                <div>
                  <label htmlFor="register-horas_trabajo_semanal" className="block text-sm font-medium text-gray-400">Horas Trabajo Semanal:</label>
                  <input
                    type="number"
                    id="register-horas_trabajo_semanal"
                    name="horas_trabajo_semanal"
                    value={registerFormData.horas_trabajo_semanal === undefined ? '' : registerFormData.horas_trabajo_semanal}
                    onChange={handleRegisterInputChange}
                    className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="register-horas_descanso_dia" className="block text-sm font-medium text-gray-400">Horas Descanso Día:</label>
                  <input
                    type="number"
                    id="register-horas_descanso_dia"
                    name="horas_descanso_dia"
                    value={registerFormData.horas_descanso_dia === undefined ? '' : registerFormData.horas_descanso_dia}
                    onChange={handleRegisterInputChange}
                    className="mt-1 block w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {registerError && <p className="text-red-400 text-sm mt-2 text-center">{registerError}</p>}
                {registerSuccess && <p className="text-green-400 text-sm mt-2 text-center">{registerSuccess}</p>}

                <button
                  type="submit"
                  className="w-full py-3 mt-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#2B2B2B] focus:ring-purple-500 transition duration-150 ease-in-out"
                >
                  Crear Cuenta
                </button>

                {/* Enlace para iniciar sesión si ya se tiene cuenta */}
                <p className="text-center text-sm text-gray-400 mt-6">
                  ¿Ya tienes una cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => setShowRegisterForm(false)}
                    className="font-medium text-purple-500 hover:text-purple-600 focus:outline-none focus:underline"
                  >
                    Inicia sesión aquí
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Columna derecha: Testimonio y fondo dinámico */}
        <div className="hidden lg:flex w-1/2 p-12 bg-gradient-to-br from-indigo-800 via-purple-800 to-pink-800 flex flex-col items-center justify-center relative">

          <div className="relative z-10 p-8 bg-gray-900 bg-opacity-80 rounded-xl shadow-lg border border-gray-700 max-w-md">
            <p className="text-xl italic text-gray-100 leading-relaxed mb-6">
¿Te imaginas una aplicación que monitorea tu estrés en tiempo real y te da el poder de entenderlo con estadísticas claras? Eso es StressScan.            </p>
            <div className="flex items-center">
              {/* Avatar del testimonio*/}
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-50">Carlos Torres</p>
                <p className="text-sm text-gray-400">@carlostorress</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default LoginPage;



