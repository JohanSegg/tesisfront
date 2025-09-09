import React, { useState, createContext, useContext, useEffect } from 'react';

// Define la URL base del backend

const API_BASE_URL = 'https://tesisback.onrender.com'; //Para implementacion local: const API_BASE_URL = 'http://127.0.0.1:8000' 

// Define el tipo de datos del registro 
export interface RegisterFormData {
  nombre: string;
  username: string;
  password: string;
  fecha_de_nacimiento?: string;
  genero?: string;
  estado_civil?: string;
  uso_de_anteojos: boolean;
  estudio_y_trabajo?: string;
  horas_trabajo_semanal?: string; // Antes como "Number"
  horas_descanso_dia?: string; // Antes como "Number"
}

// Define el tipo de dato para el contexto de autenticación
interface AuthContextType {
  isLoggedIn: boolean;
  trabajadorId: number | null; // Guarda el ID del trabajador
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (formData: RegisterFormData) => Promise<boolean>; // Función de registro
}

// MECANISMO DE AUTENTICACIÓN Y PERSISTENCIA
// a. Crea el contexto de autenticación
export const AuthContext = createContext<AuthContextType | null>(null);

// b. Hook personalizado para consumir el contexto de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Lanza un error si useAuth se usa fuera de un AuthProvider
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// c. Componente Proveedor de Autenticación
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicializa el estado leyendo de sessionStorage
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const storedLoggedIn = sessionStorage.getItem('isLoggedIn');
    return storedLoggedIn === 'true'; // Convierte a booleano
  });

  const [trabajadorId, setTrabajadorId] = useState<number | null>(() => {
    const storedTrabajadorId = sessionStorage.getItem('trabajadorId');
    return storedTrabajadorId ? parseInt(storedTrabajadorId, 10) : null; // Convierte a número
  });
  const [username, setUsername] = useState<string | null>(() => {
    const storedUserName = sessionStorage.getItem('username');
    return storedUserName; // Convierte a número
  });

  //  d. Sincroniza el estado con sessionStorage cuando hay cambios
  useEffect(() => {
    sessionStorage.setItem('isLoggedIn', String(isLoggedIn));
    if (trabajadorId !== null) {
      sessionStorage.setItem('trabajadorId', String(trabajadorId));
    } else {
      sessionStorage.removeItem('trabajadorId');
    }
  }, [isLoggedIn, trabajadorId]);

  // Función de Login
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/login/`, { // Uso del API del backend
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsLoggedIn(true);
        setUsername(username);
        setTrabajadorId(data.trabajador_id); // Guarda el ID del trabajador recibido del backend
        console.log('Inicio de sesión exitoso. Trabajador ID:', data.trabajador_id);
        return true;
      } else {
        const errorData = await response.json();
        console.error('Error de inicio de sesión:', errorData.detail);
        setIsLoggedIn(false);
        setUsername(null);
        setTrabajadorId(null);
        return false;
      }
    } catch (error) {
      console.error('Error de red al intentar iniciar sesión:', error);
      setIsLoggedIn(false);
      setTrabajadorId(null);
      return false;
    }
  };

  // Función de Registro
  const register = async (formData: RegisterFormData): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/register/`, { // Uso del API del backend
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Registro exitoso:', data);
        return true;
      } else {
        const errorData = await response.json();
        console.error('Error en el registro:', errorData.detail);
        return false;
      }
    } catch (error) {
      console.error('Error de red al intentar registrar:', error);
      return false;
    }
  };

  // Función de Logout
  const logout = () => {
    setIsLoggedIn(false);
    setTrabajadorId(null); // Limpia el ID del trabajador al cerrar sesión
    setUsername(null); // Limpia el ID del trabajador al cerrar sesión
    sessionStorage.removeItem('isLoggedIn'); 
    sessionStorage.removeItem('trabajadorId'); 
  };

  // Proporciona el estado de autenticación y las funciones a los componentes hijos
  const value = { isLoggedIn, trabajadorId, login, logout, register };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
