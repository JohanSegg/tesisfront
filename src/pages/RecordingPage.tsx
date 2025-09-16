// src/pages/RecordingPage.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js'; //Importa faceApi
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext'; // Importa contexto de autenticacion


// 1. SECCION DEL CUESTIONARIO
// --- Interfaz para los datos del formulario del cuestionario ---
interface CuestionarioFormData {
  sesion_id: number;
  descripcion_trabajo?: string;
  nivel_de_sensacion_estres?: number; 
  molestias_fisicas_visual?: number;
  molestias_fisicas_otros?: number;
  dificultad_concentracion?: number;
}

interface CuestionarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: CuestionarioFormData) => void;
  sessionId: number;
}

// --- Componente de rango con etiqueta para los niveles 1-5 ---
const RangeInput: React.FC<{ label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, value, onChange }) => (
  <div className="mb-4">
    <label className="block text-gray-300 text-sm font-bold mb-2">{label}: <span className="text-indigo-400 font-extrabold">{value}</span></label>
    <input
      type="range"
      min="1"
      max="5"
      value={value}
      onChange={onChange}
      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
    />
  </div>
);


// --- Componente del modal del cuestionario (valores por defecto) ---
const CuestionarioModal: React.FC<CuestionarioModalProps> = ({ isOpen, onClose, onSubmit, sessionId }) => {
  const [formData, setFormData] = useState<CuestionarioFormData>({
    sesion_id: sessionId,
    descripcion_trabajo: '',
    nivel_de_sensacion_estres: 3,
    molestias_fisicas_visual: 1,
    molestias_fisicas_otros: 1,
    dificultad_concentracion: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Actualizar el sesion_id si cambia su propiedad
  useEffect(() => {
    setFormData(prev => ({ ...prev, sesion_id: sessionId }));
  }, [sessionId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: e.target.type === 'range' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(formData); // Llama a la función Padre
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  // PARTE VISUAL DEL CUESTIONARIO
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg mx-4 text-white animate-fade-in-up">
        <h2 className="text-2xl font-bold mb-4 text-center text-indigo-400">Cuestionario Post-Sesión</h2>
        <p className="text-center text-gray-400 mb-6">Por favor, completa el siguiente formulario sobre tu percepción durante la sesión que acaba de finalizar (ID: {sessionId}).</p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="descripcion_trabajo" className="block text-gray-300 text-sm font-bold mb-2">
              Describe brevemente la tarea que estabas realizando:
            </label>
            <textarea
              id="descripcion_trabajo"
              name="descripcion_trabajo"
              value={formData.descripcion_trabajo}
              onChange={handleChange}
              rows={3}
              className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:shadow-outline border-gray-600"
            />
          </div>

          <RangeInput label="Nivel de Sensación Emocional (Estrés)" value={formData.nivel_de_sensacion_estres || 1} onChange={(e) => handleChange({ ...e, target: { ...e.target, name: 'nivel_de_sensacion_estres' } })} />
          <RangeInput label="Molestias Físicas Visuales" value={formData.molestias_fisicas_visual || 1} onChange={(e) => handleChange({ ...e, target: { ...e.target, name: 'molestias_fisicas_visual' } })} />
          <RangeInput label="Otras Molestias Físicas" value={formData.molestias_fisicas_otros || 1} onChange={(e) => handleChange({ ...e, target: { ...e.target, name: 'molestias_fisicas_otros' } })} />
          <RangeInput label="Dificultad de Concentración" value={formData.dificultad_concentracion || 1} onChange={(e) => handleChange({ ...e, target: { ...e.target, name: 'dificultad_concentracion' } })} />

          <div className="flex items-center justify-end mt-6 gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
            >
              Omitir
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors disabled:bg-indigo-400"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Cuestionario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 2. SECCION DE LA GRABACION
const RecordingPage: React.FC = () => {
  const { isLoggedIn, trabajadorId, logout } = useAuth();
  const navigate = useNavigate();
  const [isCuestionarioModalOpen, setIsCuestionarioModalOpen] = useState(false);
  const [sessionToFinalizeId, setSessionToFinalizeId] = useState<number | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const currentSessionIdRef = useRef<number | null>(null);



  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Cargando modelos de detección facial...');
  const [resultAreaContent, setResultAreaContent] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false); // Estado para verificar si se esta analizando
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [isRecordingPaused, setIsRecordingPaused] = useState<boolean>(false); // Estado para pausa de grabación
  const isRecordingPausedRef = useRef(false);

  useEffect(() => {
    isRecordingPausedRef.current = isRecordingPaused;
  }, [isRecordingPaused]);

  // Configuration de constantes
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const BACKEND_CUESTIONARIO_URL = `${API_BASE_URL}/cuestionarios/`;
  const BACKEND_PREDICT_URL = `${API_BASE_URL}/predict/`;
  const BACKEND_START_SESSION_URL = `${API_BASE_URL}/sessions/start/`;
  const BACKEND_PAUSE_SESSION_URL = `${API_BASE_URL}/sessions/`; 
  const ANALYSIS_INTERVAL = 1000;
  const DETECTION_INTERVAL = 100;
  const MODEL_URL = '/models';

 const mediaStreamRef = useRef<MediaStream | null>(null);
  const detectionIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const analysisIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const latestDetectionRef = useRef<faceapi.FaceDetection | null>(null);





  const detectionOptions = new faceapi.TinyFaceDetectorOptions({
    inputSize: 224,
    scoreThreshold: 0.5,
  });

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  // --- 1. Funcion que carga los modelos de Face-Api.js ---
  const loadModels = useCallback(async () => {
    try {
      setStatusMessage('Cargando modelos de detección facial...');
      console.log("Intentando cargar modelos desde:", MODEL_URL);
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setStatusMessage('Modelos cargados. Presiona "Iniciar Cámara" para comenzar.');
      setModelsLoaded(true);
    } catch (error: any) {
      console.error('Error al cargar modelos de face-api.js:', error);
      setStatusMessage(`Error al cargar modelos: ${error.message}. Asegúrate de que los modelos estén en la carpeta public/models.`);
      setModelsLoaded(false);
    }
  }, []);

// -- 2. Funcion que detiene todos los medios (Frontend) ---
  const stopAllMediaAndIntervals = useCallback(() => {
    console.log(111);
    if (detectionIntervalIdRef.current !== null) {
      clearInterval(detectionIntervalIdRef.current);
      detectionIntervalIdRef.current = null;
    }
    console.log(222);
    if (analysisIntervalIdRef.current !== null) {
      clearInterval(analysisIntervalIdRef.current);
      analysisIntervalIdRef.current = null;
      setIsAnalyzing(false);
    }
    console.log(333);
    if (mediaStreamRef.current) {
      const tracks = mediaStreamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      mediaStreamRef.current = null;
    }
      console.log(444);

    if (canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        context.fillStyle = '#000';
        context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    setIsCameraActive(false);
    setIsRecordingPaused(false); 
    setStatusMessage('Cámara y Análisis detenidos.');
    setResultAreaContent('');
    console.log('Medios e intervalos detenidos.');
  }, []);

  // --- 3. Funcion que detiene todos los medios (backend) ---
    const stopDetectionAndAnalysis = useCallback(async () => {
    // La sesión (grabacion) se finaliza y se abre el modal
    if (currentSessionId !== null) {
      console.log(`Grabación finalizada. Abriendo cuestionario para la sesión ID: ${currentSessionId}`);
      setSessionToFinalizeId(currentSessionId); // Guarda el ID para el modal
      setIsCuestionarioModalOpen(true); // Abre el modal
    }
    // Llamamos el detenimiento de los procesos del frontend
    stopAllMediaAndIntervals();
    console.log('Detección y Análisis detenidos (frontend).');
  }, [currentSessionId, stopAllMediaAndIntervals]);

  // --- 4. Manejador por si no se encuentra un sesion_id ---
  const handleCuestionarioSubmit = useCallback(async (formData: CuestionarioFormData) => {
    if (!formData.sesion_id) {
      console.error("No hay ID de sesión para enviar el cuestionario.");
      setStatusMessage("Error: No se pudo enviar el cuestionario por falta de ID de sesión.");
      return;
    }
    
    try {
      console.log("Enviando cuestionario al backend:", formData);
      const response = await fetch(BACKEND_CUESTIONARIO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al enviar el cuestionario.');
      }
      
      console.log("Cuestionario enviado con éxito.");
      setStatusMessage("Cuestionario registrado. ¡Gracias!");

    } catch (error: any) {
      console.error("Error al enviar el cuestionario:", error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      // Cierra el modal y limpia el estado sin importar el resultado
      setIsCuestionarioModalOpen(false);
      setSessionToFinalizeId(null);
      setCurrentSessionId(null); // Limpia la sesion activa actual
    }
  }, [BACKEND_CUESTIONARIO_URL]);
  
  // Omitir el cuestionario
  const handleCloseModal = () => {
    setIsCuestionarioModalOpen(false);
    setSessionToFinalizeId(null);
    setCurrentSessionId(null); 
    setStatusMessage("Cuestionario omitido.");
  };


  // --- 5. Funcion que sirve como bucle para la deteccion de rostro ---
  const runDetection = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!modelsLoaded) {
      console.warn('Intentando detección sin modelos cargados.');
      return;
    }

    if (!video || !canvas || video.paused || !video.srcObject) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.scale(-1, 1);
    context.drawImage(video, canvas.width * -1, 0, canvas.width, canvas.height);
    context.restore();

    try {
      const detections = await faceapi.detectAllFaces(canvas, detectionOptions);
      const resizedDetections = faceapi.resizeResults(detections, { width: canvas.width, height: canvas.height });
      faceapi.draw.drawDetections(canvas, resizedDetections);

      latestDetectionRef.current = resizedDetections.length > 0 ? resizedDetections[0] : null;

      if (!latestDetectionRef.current) {
        setStatusMessage('Buscando rostro...');
      }
    } catch (error: any) {
      console.error('Error durante la detección facial:', error);
      setStatusMessage(`Error en detección: ${error.message}`);
      latestDetectionRef.current = null;
    }
  }, [detectionOptions, modelsLoaded]);

  //  --- 6. Funcion que sirve como bucle para analizar el rostro detectado. ---
  //  --- Maneja varios errores ---
  const analyzeDetectedFace = useCallback(async (sessionId: number) => {
    if (!latestDetectionRef.current || isAnalyzing || !modelsLoaded || isRecordingPausedRef.current) {
      console.log('Saltando análisis: ', { sessionId, paused: isRecordingPausedRef.current });
      return;
    }


    setIsAnalyzing(true);
    console.log('Iniciando ciclo de análisis...');

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      console.error('Video o Canvas no disponibles para análisis.');
      setIsAnalyzing(false);
      return;
    }

    const box = latestDetectionRef.current.box;
    const { x, y, width, height } = box;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempContext = tempCanvas.getContext('2d');

    if (!tempContext) {
      console.error('Error al obtener el contexto 2D del canvas temporal.');
      setIsAnalyzing(false);
      return;
    }

    try {
      tempContext.drawImage(video, x, y, width, height, 0, 0, width, height);
    } catch (e: any) {
      console.error('Error al dibujar en el canvas para recorte:', e);
      setIsAnalyzing(false);
      return;
    }

    tempCanvas.toBlob(async (blob) => {
      if (!blob) {
        console.error('Error al crear la imagen Blob.');
        setStatusMessage('Error interno: No se pudo procesar el frame para enviar.');
        setIsAnalyzing(false);
        return;
      }
      console.log('Blob de imagen creado, preparando para enviar a /predict/.');

      const formData = new FormData();
      formData.append('file', blob, 'face_image.png');
      formData.append('sesion_id', sessionId.toString());
      formData.append('ancho_rostro_px', Math.round(width).toString());

      try {
        console.log('Enviando petición POST a:', BACKEND_PREDICT_URL, 'con sesion_id:', sessionId);
        const response = await fetch(BACKEND_PREDICT_URL, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
          throw new Error(`Error del servidor: ${response.status} - ${errorData.detail || response.statusText}`);
        }

        const result = await response.json();
        console.log('Respuesta de /predict/ recibida:', result);
        setResultAreaContent(`
          <p><strong>Predicción:</strong> ${result.prediction}</p>
          <p><strong>Confianza:</strong> ${result.confidence.toFixed(4)}</p>
          <p><strong>ID de Lectura:</strong> ${result.lectura_estres_id}</p>
        `);
        setStatusMessage('Grabando y Analizando... Rostro detectado.');
      } catch (error: any) {
        console.error('Error al enviar la imagen a /predict/:', error);
        setStatusMessage(`Error de análisis: ${error.message}`);
      } finally {
        setIsAnalyzing(false);
      }
    }, 'image/png');
  }, [isAnalyzing, modelsLoaded, isRecordingPaused, BACKEND_PREDICT_URL]);


  // --- 7. Inicializa la camara ---
  const startCamera = useCallback(async () => {
    if (isCameraActive) return; // camara activa
    if (!modelsLoaded) {  // modelo no cargado
      setStatusMessage('Error: Los modelos de detección facial aún no se han cargado. Por favor, espera.');
      return;
    }
    setStatusMessage('Solicitando acceso a la cámara...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current && canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            videoRef.current.play();
            setIsCameraActive(true);
            setStatusMessage('Cámara iniciada. Lista para iniciar análisis.');
          }
        };
      }

      // Manejar fin del stream 
      stream.getVideoTracks()[0].onended = async () => {
        console.log("Stream de cámara finalizado por el usuario o sistema.");
        // Si hay una sesion activa en el backend se marca como "Cancelada"
        if (currentSessionId !== null) {
          try {
            console.log('Intentando cancelar sesión en backend con ID:', currentSessionId);
            const cancelResponse = await fetch(`${API_BASE_URL}/sessions/${currentSessionId}/cancel/`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
            });
            if (cancelResponse.ok) {
              console.log(`Sesión ${currentSessionId} marcada como cancelada.`);
            } else {
              console.error(`Error al cancelar sesión ${currentSessionId} en backend:`, await cancelResponse.json());
            }
          } catch (error) {
            console.error(`Error de red al cancelar sesión ${currentSessionId}:`, error);
          } finally {
            setCurrentSessionId(null); // Limpia el estado de sessionid
          }
        }
        stopAllMediaAndIntervals();
        setStatusMessage('Cámara desconectada. Análisis detenido.');
      };

    } catch (err: any) {
      console.error('Error al iniciar la cámara:', err);
      let errorTraducido = ''
      if(err.message == 'Permission denied')
        {errorTraducido = 'Permisos denegados'}
      else
        {errorTraducido = 'No se encontró un dispositivo'}
      setStatusMessage(`Error al iniciar cámara: ${errorTraducido}. Asegúrate de permitir el acceso.`);
      setIsCameraActive(false);
    }
  }, [modelsLoaded, isCameraActive, stopAllMediaAndIntervals, currentSessionId, API_BASE_URL]);


  // --- 8. Funcion que inicia las "grabaciones/sesiones" y maneja bucles en estas ---
  const startRecording = useCallback(async () => {
    if (!isCameraActive) {
      setStatusMessage('Error: La cámara no está activa. Inicia la cámara primero.');
      return;
    }
    if (analysisIntervalIdRef.current !== null) {
      setStatusMessage('El análisis ya está en curso.');
      return;
    }
    if (!modelsLoaded) {
      setStatusMessage('Error: Los modelos de detección facial aún no se han cargado. Por favor, espera.');
      return;
    }

    if (trabajadorId === null) {
      setStatusMessage('Error: ID de trabajador no disponible. Redirigiendo al login.');
      navigate('/login');
      return;
    }

    setStatusMessage('Iniciando sesión de grabación...');
    try {
      const sessionStartResponse = await fetch(BACKEND_START_SESSION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trabajador_id: trabajadorId }),
      });

      if (!sessionStartResponse.ok) {
        const errorData = await sessionStartResponse.json().catch(() => ({ detail: 'Error desconocido' }));
        throw new Error(`Error al iniciar sesión en backend: ${sessionStartResponse.status} - ${errorData.detail || sessionStartResponse.statusText}`);
      }
      const sessionData = await sessionStartResponse.json();
      setCurrentSessionId(sessionData.sesion_id);
      setStatusMessage('Grabación iniciada. Analizando rostro...');

      const sessionIdForIntervals = sessionData.sesion_id;

      // Usa las funciones que ya estan declaradas arriba
      detectionIntervalIdRef.current = setInterval(runDetection, DETECTION_INTERVAL);
      analysisIntervalIdRef.current = setInterval(() => analyzeDetectedFace(sessionIdForIntervals), ANALYSIS_INTERVAL);
      setIsRecordingPaused(false); 
      console.log(`Grabación iniciada. Detección cada ${DETECTION_INTERVAL}ms, Análisis cada ${ANALYSIS_INTERVAL}ms.`);

    } catch (err: any) {
      console.error('Error al iniciar la grabación:', err);
      setStatusMessage(`Error al iniciar grabación: ${err.message}.`);
      setResultAreaContent('');
      setCurrentSessionId(null);
    }
  }, [isCameraActive, modelsLoaded, trabajadorId, navigate, runDetection, analyzeDetectedFace, BACKEND_START_SESSION_URL]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      startRecording(); // llama a la función original
      return;
    }
    const timer = setTimeout(() => setCountdown(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, startRecording]);
  
  // --- 9. Funcion que cambia estados de pausa y resumen de la grabaciom---
  const togglePauseRecording = useCallback(() => {
    if (currentSessionId === null) {
      setStatusMessage('No hay una sesión de grabación activa para pausar/reanudar.');
      return;
    }

    const newState = !isRecordingPaused;
    setIsRecordingPaused(newState);

    if (newState) {
      // 🔴 Pausar
      if (analysisIntervalIdRef.current) {
        clearInterval(analysisIntervalIdRef.current);
        analysisIntervalIdRef.current = null;
        setIsAnalyzing(false);
      }
      setStatusMessage('Grabación pausada.');
    } else {
      // 🟢 Reanudar
      if (detectionIntervalIdRef.current === null) {
        detectionIntervalIdRef.current = setInterval(runDetection, DETECTION_INTERVAL);
      }
      if (analysisIntervalIdRef.current === null) {
        analysisIntervalIdRef.current = setInterval(() => {
          if (currentSessionIdRef.current !== null) {
            analyzeDetectedFace(currentSessionIdRef.current);
          }
        }, ANALYSIS_INTERVAL);
      }
      setStatusMessage('Grabación reanudada. Analizando rostro...');
    }
  }, [currentSessionId, isRecordingPaused, runDetection, analyzeDetectedFace]);

  // --- Hook para manejar logeo ---
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    loadModels();

    return () => {
      stopAllMediaAndIntervals(); // detiene medios
    };
  }, [isLoggedIn, navigate, loadModels, stopAllMediaAndIntervals]);

  // Ajusta canvas si la ventana cambia de tamaño 
  useEffect(() => {
    const handleResize = () => {
      if (videoRef.current && canvasRef.current && videoRef.current.videoWidth > 0) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleLogout = useCallback(() => {
    stopDetectionAndAnalysis(); // Detener todo antes de cerrar sesión
    logout();
    navigate('/login');
  }, [logout, navigate, stopDetectionAndAnalysis]);



// PARTE VISUAL
  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Barra lateral */}
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
              onClick={() => navigate('/dashboard')} // 2. Dashboard
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

      {/* --- CONTENIDO PRINCIPAL DE GRABACION --- */}
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-4xl font-extrabold text-white mb-6 text-center">Detector de Estrés Facial Automático</h1>

        {/* a. Mensajes informativos y de estatus*/}
        <div className="bg-gray-800 p-4 rounded-lg shadow-inner mb-6 text-center">
          <p id="statusMessage" className={`text-lg font-medium ${statusMessage.includes('Error') ? 'text-red-400' : 'text-blue-400'}`}>
            {statusMessage}
          </p>
          {isCameraActive && currentSessionId !== null && !isRecordingPaused && (
            <p className="text-green-400 mt-2 font-semibold">
              ¡Grabando y Analizando Datos! ID de Sesión: {currentSessionId}
            </p>
          )}
          {isRecordingPaused && currentSessionId !== null && (
            <p className="text-yellow-400 mt-2 font-semibold">
              Grabación Pausada. ID de Sesión: {currentSessionId}
            </p>
          )}
        </div>

        {/* b. Canvas, Camara y sus controles */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl flex flex-col items-center">
          <div className="relative w-full max-w-2xl bg-black rounded-lg overflow-hidden border border-gray-700 shadow-2xl">
            <video id="videoFeed" ref={videoRef} autoPlay muted className="hidden"></video>

            {/*b1. canvas donde se muestra el video*/}
            <canvas id="displayCanvas" ref={canvasRef} className="w-full h-auto block transform scale-x-[-1]"></canvas>
            {/* Placeholder por si la camara no esta activa*/}
            {!isCameraActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70">
                <span className="text-gray-400 text-xl">Cámara Inactiva</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-6">
            {/* b2. Boton para encender/apagar camara */}
            <button
              onClick={isCameraActive ? stopAllMediaAndIntervals : startCamera}
              disabled={!modelsLoaded}
              className={`px-6 py-3 rounded-lg font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-200
                ${isCameraActive ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}
                ${!modelsLoaded ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isCameraActive ? 'Apagar Cámara' : 'Encender Cámara'}
            </button>

            {/* b3. Boton para iniciar grabacion (Análisis) */}
           <button
              onClick={() => setShowConfirmModal(true)}
              disabled={!isCameraActive || currentSessionId !== null || !modelsLoaded}
              className={`px-6 py-3 rounded-lg font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-200
                ${isCameraActive && currentSessionId === null && modelsLoaded ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-gray-600 cursor-not-allowed'}
              `}
            >
              Iniciar Grabación
            </button>

            {/* b4. Boton para pausar o reanudar grabacion */}
            <button
              onClick={togglePauseRecording}
              disabled={currentSessionId === null || !isCameraActive} // Deshabilita si la sesion seson o la  camara estan inactivas
              className={`px-6 py-3 rounded-lg font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-200
                ${currentSessionId !== null && isCameraActive ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500' : 'bg-gray-600 cursor-not-allowed'}
              `}
            >
              {isRecordingPaused ? 'Reanudar Grabación' : 'Pausar Grabación'}
            </button>

            {/* b5. Boton para Terminar grabacion */}
            <button
              onClick={stopDetectionAndAnalysis}
              disabled={currentSessionId === null} // Deshabilita si no hay sesion activa
              className={`px-6 py-3 rounded-lg font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-200
                ${currentSessionId !== null ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500' : 'bg-gray-600 cursor-not-allowed'}
              `}
            >
              Terminar Grabación
            </button>
          </div>
        </div>

        {/* c. Zona de resultados */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-inner mt-6">
          <h2 className="text-xl font-semibold text-white mb-4">Resultados del Análisis</h2>
          <div id="resultArea" className="bg-gray-700 p-4 rounded text-gray-200 text-sm font-mono whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: resultAreaContent || "Esperando resultados..." }}></div>
        </div>
        {/* Modal de confirmación */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 shadow-xl max-w-sm w-full text-center">
              <h2 className="text-xl font-bold text-white mb-4">Confirmar inicio</h2>
              <p className="text-gray-300 mb-6">¿Deseas iniciar la grabación?</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md"
                >
                  No
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setCountdown(3); // inicia conteo
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                >
                  Sí
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Overlay de conteo regresivo */}
        {countdown !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <h1 className="text-6xl font-extrabold text-white animate-bounce">
              {countdown}
            </h1>
          </div>
        )}

      </main>

      <CuestionarioModal
        isOpen={isCuestionarioModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleCuestionarioSubmit}
        sessionId={sessionToFinalizeId || 0}
      />
    </div>
  );
};

export default RecordingPage;
