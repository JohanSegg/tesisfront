import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useSettings } from '../contexto/SettingsContext'; // NEW

// ---------- Tipos e interfaces del cuestionario ----------
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

// ---------- UI auxiliar ----------
const RangeInput: React.FC<{ label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, value, onChange }) => (
  <div className="mb-4">
    <label className="block text-gray-300 text-sm font-bold mb-2">{label}: <span className="text-indigo-400 font-extrabold">{value}</span></label>
    <input type="range" min="1" max="5" value={value} onChange={onChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
  </div>
);

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
    await onSubmit(formData);
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg mx-4 text-white animate-fade-in-up">
        <h2 className="text-2xl font-bold mb-4 text-center text-indigo-400">Cuestionario Post-Sesión</h2>
        <p className="text-center text-gray-400 mb-6">Por favor, completa el siguiente formulario sobre tu percepción durante la sesión que acaba de finalizar (ID: {sessionId}).</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="descripcion_trabajo" className="block text-gray-300 text-sm font-bold mb-2">Describe brevemente la tarea que estabas realizando:</label>
            <textarea id="descripcion_trabajo" name="descripcion_trabajo" value={formData.descripcion_trabajo} onChange={handleChange} rows={3} className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:shadow-outline border-gray-600" />
          </div>
          <RangeInput label="Nivel de Sensación Emocional (Estrés)" value={formData.nivel_de_sensacion_estres || 1} onChange={(e) => handleChange({ ...e, target: { ...e.target, name: 'nivel_de_sensacion_estres' } as any })} />
          <RangeInput label="Molestias Físicas Visuales" value={formData.molestias_fisicas_visual || 1} onChange={(e) => handleChange({ ...e, target: { ...e.target, name: 'molestias_fisicas_visual' } as any })} />
          <RangeInput label="Otras Molestias Físicas" value={formData.molestias_fisicas_otros || 1} onChange={(e) => handleChange({ ...e, target: { ...e.target, name: 'molestias_fisicas_otros' } as any })} />
          <RangeInput label="Dificultad de Concentración" value={formData.dificultad_concentracion || 1} onChange={(e) => handleChange({ ...e, target: { ...e.target, name: 'dificultad_concentracion' } as any })} />
          <div className="flex items-center justify-end mt-6 gap-4">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded">Omitir</button>
            <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded disabled:bg-indigo-400">
              {isSubmitting ? 'Enviando...' : 'Enviar Cuestionario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------- Recording Page ----------
const RecordingPage: React.FC = () => {
  const { isLoggedIn, trabajadorId, logout } = useAuth();
  const navigate = useNavigate();
  const { defaultDurationKey, showResults } = useSettings(); // NEW
  
  const MARGIN = 0.01;     // 15% de margen alrededor del rostro
  const MIN_SIDE = 120;    // descarta recortes muy pequeños

  // UI y modales
  const [isCuestionarioModalOpen, setIsCuestionarioModalOpen] = useState(false);
  const [sessionToFinalizeId, setSessionToFinalizeId] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Media + IA
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Cargando modelos de detección facial...');
  const [resultAreaContent, setResultAreaContent] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const currentSessionIdRef = useRef<number | null>(null);

  // Pausa
  const [isRecordingPaused, setIsRecordingPaused] = useState<boolean>(false);
  const isRecordingPausedRef = useRef(false);
  const pauseStartedAtRef = useRef<number | null>(null); // NEW

  useEffect(() => {
    isRecordingPausedRef.current = isRecordingPaused;
  }, [isRecordingPaused]);

  // Inactividad / duración
  const TEN_MIN_MS = 10 * 60 * 1000;
  // const TEN_MIN_MS = 10 * 1000;
  const lastPredictAtRef = useRef<number | null>(null); // NEW: marca el último /predict exitoso
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null); // NEW: límite de sesión por duración
  const inactivityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null); // NEW: chequeo periódico de reglas CP018/CP019
  const [selectedDurationKey, setSelectedDurationKey] = useState<'auto' | '20m' | '1h' | '2h' | '4h'>('auto'); // NEW

  // Streams e intervalos
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const BACKEND_CUESTIONARIO_URL = `${API_BASE_URL}/cuestionarios/`;
  const BACKEND_PREDICT_URL = `${API_BASE_URL}/predict/`;
  const BACKEND_START_SESSION_URL = `${API_BASE_URL}/sessions/start/`;

  const ANALYSIS_INTERVAL = 1000;
  const DETECTION_INTERVAL = 100;
  const MODEL_URL = '/models';

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const detectionIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const analysisIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const latestDetectionRef = useRef<faceapi.FaceDetection | null>(null);

  const detectionOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.6 });

  useEffect(() => { currentSessionIdRef.current = currentSessionId; }, [currentSessionId]);

  // ---------- Carga de modelos ----------
  const loadModels = useCallback(async () => {
    try {
      setStatusMessage('Cargando modelos de detección facial...');
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setStatusMessage('Modelos cargados. Presiona "Iniciar Cámara" para comenzar.');
      setModelsLoaded(true);
    } catch (error: any) {
      console.error('Error al cargar modelos de face-api.js:', error);
      setStatusMessage(`Error al cargar modelos: ${error.message}. Asegúrate de que los modelos estén en la carpeta public/models.`);
      setModelsLoaded(false);
    }
  }, []);

  // ---------- Utilidad: limpiar todo ----------
  const clearSessionTimersAndGuards = useCallback(() => {
    if (sessionTimerRef.current) { clearTimeout(sessionTimerRef.current); sessionTimerRef.current = null; }
    if (inactivityCheckIntervalRef.current) { clearInterval(inactivityCheckIntervalRef.current); inactivityCheckIntervalRef.current = null; }
    lastPredictAtRef.current = null;
    pauseStartedAtRef.current = null;
  }, []);

  const stopAllMediaAndIntervals = useCallback(() => {
    // Limpia watchers y timers nuevos
    clearSessionTimersAndGuards(); // NEW

    if (detectionIntervalIdRef.current !== null) {
      clearInterval(detectionIntervalIdRef.current);
      detectionIntervalIdRef.current = null;
    }
    if (analysisIntervalIdRef.current !== null) {
      clearInterval(analysisIntervalIdRef.current);
      analysisIntervalIdRef.current = null;
      setIsAnalyzing(false);
    }
    if (mediaStreamRef.current) {
      const tracks = mediaStreamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      mediaStreamRef.current = null;
    }
    if (canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context && canvasRef.current) {
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        context.fillStyle = '#000';
        context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    setIsCameraActive(false);
    setIsRecordingPaused(false);
    setStatusMessage('Cámara y Análisis detenidos.');
    setResultAreaContent('');
  }, [clearSessionTimersAndGuards]);

  // ---------- Finalizar sesión con razón (abre cuestionario como tu botón) ----------
  const finalizeSession = useCallback(async (reason: 'NO_DETECTIONS' | 'PAUSE_TIMEOUT' | 'SESSION_DURATION', meta?: { cp: string; us: string; msg: string }) => {
    const sid = currentSessionIdRef.current;
    if (sid != null) {
      // Opcional: si tienes endpoint para marcar finalización con razón, puedes habilitar esto
      try {
        console.log(reason);
        // Ejemplo: PUT /sessions/{id}/finish/  (ajusta si tu API usa otra ruta)
        // await fetch(`${API_BASE_URL}/sessions/${sid}/finish/`, {
        //   method: 'PUT',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ reason, ...meta }),
        // }).catch(() => {}); // fail-safe
      } catch (e) {
        console.warn('No se pudo notificar razón de finalización al backend. Continuando con cierre local...');
      }
    }
    // Mismo flujo que tu botón "Terminar Grabación"
    if (sid != null) {
      setSessionToFinalizeId(sid);
      setIsCuestionarioModalOpen(true);
    }
    stopAllMediaAndIntervals();
    setStatusMessage(meta?.msg || 'Sesión finalizada.');
  }, [API_BASE_URL, stopAllMediaAndIntervals]);

  // ---------- Detener (tu flujo original) ----------
  const stopDetectionAndAnalysis = useCallback(async () => {
    if (currentSessionId !== null) {
      setSessionToFinalizeId(currentSessionId);
      setIsCuestionarioModalOpen(true);
    }
    stopAllMediaAndIntervals();
  }, [currentSessionId, stopAllMediaAndIntervals]);

  // ---------- Envío cuestionario ----------
  const handleCuestionarioSubmit = useCallback(async (formData: CuestionarioFormData) => {
    if (!formData.sesion_id) {
      console.error("No hay ID de sesión para enviar el cuestionario.");
      setStatusMessage("Error: No se pudo enviar el cuestionario por falta de ID de sesión.");
      return;
    }
    try {
      const response = await fetch(BACKEND_CUESTIONARIO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al enviar el cuestionario.');
      }
      setStatusMessage("Cuestionario registrado. ¡Gracias!");
    } catch (error: any) {
      console.error("Error al enviar el cuestionario:", error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setIsCuestionarioModalOpen(false);
      setSessionToFinalizeId(null);
      setCurrentSessionId(null);
    }
  }, [BACKEND_CUESTIONARIO_URL]);

  const handleCloseModal = () => {
    setIsCuestionarioModalOpen(false);
    setSessionToFinalizeId(null);
    setCurrentSessionId(null);
    setStatusMessage("Cuestionario omitido.");
  };

  // ---------- Detección ----------
  const runDetection = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!modelsLoaded) return;
    if (!video || !canvas || video.paused || !video.srcObject) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // limpiamos y espejamos: dibujamos el video -> canvas (espejado)
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.scale(-1, 1);
    context.drawImage(video, canvas.width * -1, 0, canvas.width, canvas.height);
    context.restore();

    try {
      // detectamos sobre el CANVAS (ya espejado)
      const detections = await faceapi.detectAllFaces(canvas, detectionOptions);
      const resized = faceapi.resizeResults(detections, { width: canvas.width, height: canvas.height });

      // dibujado (opcional)
      faceapi.draw.drawDetections(canvas, resized);

      // descarta caras pegadas a los bordes
      const BORDER = 10; // px
      const valid = resized.filter(d => {
        const b = d.box;
        return b.x > BORDER && b.y > BORDER &&
              b.x + b.width  < canvas.width  - BORDER &&
              b.y + b.height < canvas.height - BORDER;
      });

      latestDetectionRef.current = valid.length ? valid[0] : null;
      if (!latestDetectionRef.current) setStatusMessage('Buscando rostro...');
    } catch (error: any) {
      console.error('Error durante la detección facial:', error);
      setStatusMessage(`Error en detección: ${error.message}`);
      latestDetectionRef.current = null;
    }
  }, [detectionOptions, modelsLoaded]);


  // ---------- Análisis y /predict ----------
  const analyzeDetectedFace = useCallback(async (sessionId: number) => {
    if (!latestDetectionRef.current || isAnalyzing || !modelsLoaded || isRecordingPausedRef.current) return;

    setIsAnalyzing(true);
    const canvas = canvasRef.current;
    if (!canvas) { setIsAnalyzing(false); return; }

    const box = latestDetectionRef.current.box;
    const { x, y, width, height } = box;

    // margen alrededor del rostro
    const marginX = Math.floor(width * MARGIN);
    const marginY = Math.floor(height * MARGIN);

    // expandimos y "clamp" dentro del canvas
    let sx = Math.max(0, Math.floor(x - marginX));
    let sy = Math.max(0, Math.floor(y - marginY));
    let sw = Math.min(canvas.width  - sx, Math.floor(width  + 2 * marginX));
    let sh = Math.min(canvas.height - sy, Math.floor(height + 2 * marginY));

    // cuadrado centrado para consistencia del dataset
    const side = Math.max(sw, sh);
    if (side < MIN_SIDE) { // demasiado pequeño => no enviamos
      setIsAnalyzing(false);
      return;
    }
    const cx = sx + sw / 2;
    const cy = sy + sh / 2;
    sx = Math.max(0, Math.floor(cx - side / 2));
    sy = Math.max(0, Math.floor(cy - side / 2));
    sw = Math.min(side, canvas.width  - sx);
    sh = Math.min(side, canvas.height - sy);

    // recorte DESDE EL CANVAS (ya espejado). ¡No usar video aquí!
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sw;
    tempCanvas.height = sh;
    const tctx = tempCanvas.getContext('2d');
    if (!tctx) { setIsAnalyzing(false); return; }

    tctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

    tempCanvas.toBlob(async (blob) => {
      if (!blob) { setStatusMessage('Error interno: No se pudo procesar el frame para enviar.'); setIsAnalyzing(false); return; }

      const formData = new FormData();
      formData.append('file', blob, 'face_image.png');
      formData.append('sesion_id', sessionId.toString());
      formData.append('ancho_rostro_px', Math.round(sw).toString());

      try {
        const response = await fetch(BACKEND_PREDICT_URL, { method: 'POST', body: formData });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
          throw new Error(`Error del servidor: ${response.status} - ${errorData.detail || response.statusText}`);
        }

        const result = await response.json();

        // marca último predict OK (para tu guardia de inactividad)
        lastPredictAtRef.current = Date.now();

        if (showResults) {
          setResultAreaContent(`
            <p><strong>Predicción:</strong> ${result.prediction}</p>
            <p><strong>Confianza:</strong> ${Number(result.confidence).toFixed(4)}</p>
            <p><strong>ID de Lectura:</strong> ${result.lectura_estres_id}</p>
          `);
        }

        setStatusMessage('Grabando y Analizando... Rostro detectado.');
      } catch (error: any) {
        console.error('Error al enviar la imagen a /predict/:', error);
        setStatusMessage(`Error de análisis: ${error.message}`);
      } finally {
        setIsAnalyzing(false);
      }
    }, 'image/png');
  }, [isAnalyzing, modelsLoaded, BACKEND_PREDICT_URL, showResults]);

  // ---------- Cámara ----------
  const startCamera = useCallback(async () => {
    if (isCameraActive) return;
    if (!modelsLoaded) {
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

      stream.getVideoTracks()[0].onended = async () => {
        const sid = currentSessionIdRef.current;
        if (sid !== null) {
          try {
            await fetch(`${API_BASE_URL}/sessions/${sid}/cancel/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' } });
          } catch (_) {}
          setCurrentSessionId(null);
        }
        stopAllMediaAndIntervals();
        setStatusMessage('Cámara desconectada. Análisis detenido.');
      };
    } catch (err: any) {
      let errorTraducido = err?.message === 'Permission denied' ? 'Permisos denegados' : 'No se encontró un dispositivo';
      setStatusMessage(`Error al iniciar cámara: ${errorTraducido}. Asegúrate de permitir el acceso.`);
      setIsCameraActive(false);
    }
  }, [modelsLoaded, isCameraActive, stopAllMediaAndIntervals, API_BASE_URL]);

  // ---------- Iniciar grabación (sesión) ----------
  const startRecording = useCallback(async () => {
    if (!isCameraActive) { setStatusMessage('Error: La cámara no está activa. Inicia la cámara primero.'); return; }
    if (analysisIntervalIdRef.current !== null) { setStatusMessage('El análisis ya está en curso.'); return; }
    if (!modelsLoaded) { setStatusMessage('Error: Los modelos de detección facial aún no se han cargado.'); return; }
    if (trabajadorId === null) { setStatusMessage('Error: ID de trabajador no disponible. Redirigiendo al login.'); navigate('/login'); return; }

    setStatusMessage('Iniciando sesión de grabación...');
    try {
      const resp = await fetch(BACKEND_START_SESSION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trabajador_id: trabajadorId }),
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ detail: 'Error desconocido' }));
        throw new Error(`Error al iniciar sesión en backend: ${resp.status} - ${errorData.detail || resp.statusText}`);
      }
      const sessionData = await resp.json();
      setCurrentSessionId(sessionData.sesion_id);
      setStatusMessage('Grabación iniciada. Analizando rostro...');

      const sessionIdForIntervals = sessionData.sesion_id;
      detectionIntervalIdRef.current = setInterval(runDetection, DETECTION_INTERVAL);
      analysisIntervalIdRef.current = setInterval(() => analyzeDetectedFace(sessionIdForIntervals), ANALYSIS_INTERVAL);
      setIsRecordingPaused(false);

      // NEW: configura duración efectiva de la sesión (CP020/CP021)
      const effectiveKey = selectedDurationKey === 'auto' ? defaultDurationKey : selectedDurationKey;
      const durationMap = { '20m': 20 * 60 * 1000, '1h': 60 * 60 * 1000, '2h': 2 * 60 * 60 * 1000, '4h': 4 * 60 * 60 * 1000 } as const;
      const effectiveMs = durationMap[effectiveKey as keyof typeof durationMap];
      if (effectiveMs) {
        sessionTimerRef.current = setTimeout(() => {
          // CP020 si el usuario eligió manual (no 'auto'), CP021 si fue 'auto' (predeterminada)
          const meta = (selectedDurationKey === 'auto')
            ? { cp: 'CP021', us: 'US11', msg: 'Sesión finalizada por alcanzar la duración predeterminada.' }
            : { cp: 'CP020', us: 'US11', msg: 'Sesión finalizada por alcanzar la duración seleccionada.' };
          finalizeSession('SESSION_DURATION', meta);
        }, effectiveMs);
      }

      // NEW: inicia guardas de inactividad (CP018/CP019). Revisa cada 30s.
      inactivityCheckIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const sid = currentSessionIdRef.current;
        if (!sid) return;

        if (isRecordingPausedRef.current) {
          if (pauseStartedAtRef.current && (now - pauseStartedAtRef.current >= TEN_MIN_MS)) {
            finalizeSession('PAUSE_TIMEOUT', { cp: 'CP019', us: 'US10', msg: 'Sesión finalizada por pausa prolongada (10 min).' });
          }
          return;
        }

        // No está en pausa → revisar ausencia de predict
        if (lastPredictAtRef.current === null || (now - (lastPredictAtRef.current || 0) >= TEN_MIN_MS)) {
          finalizeSession('NO_DETECTIONS', { cp: 'CP018', us: 'US10', msg: 'Sesión finalizada por ausencia de detecciones (10 min).' });
        }
      }, 30 * 1000);

      // Al iniciar, aún no hay predict; mantenemos lastPredictAtRef en null para que el guard funcione.
    } catch (err: any) {
      console.error('Error al iniciar la grabación:', err);
      setStatusMessage(`Error al iniciar grabación: ${err.message}.`);
      setResultAreaContent('');
      setCurrentSessionId(null);
    }
  }, [isCameraActive, modelsLoaded, trabajadorId, navigate, BACKEND_START_SESSION_URL, runDetection, selectedDurationKey, defaultDurationKey, analyzeDetectedFace, finalizeSession, TEN_MIN_MS]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { setCountdown(null); startRecording(); return; }
    const timer = setTimeout(() => setCountdown(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, startRecording]);

  // ---------- Pausar/Reanudar ----------
  const togglePauseRecording = useCallback(() => {
    if (currentSessionId === null) {
      setStatusMessage('No hay una sesión de grabación activa para pausar/reanudar.');
      return;
    }
    const newState = !isRecordingPaused;
    setIsRecordingPaused(newState);

    if (newState) {
      // Pausa
      if (analysisIntervalIdRef.current) {
        clearInterval(analysisIntervalIdRef.current);
        analysisIntervalIdRef.current = null;
        setIsAnalyzing(false);
      }
      pauseStartedAtRef.current = Date.now(); // NEW: marca inicio de pausa (CP019)
      setStatusMessage('Grabación pausada.');
    } else {
      // Reanudar
      pauseStartedAtRef.current = null; // NEW
      if (detectionIntervalIdRef.current === null) detectionIntervalIdRef.current = setInterval(runDetection, DETECTION_INTERVAL);
      if (analysisIntervalIdRef.current === null) {
        analysisIntervalIdRef.current = setInterval(() => {
          if (currentSessionIdRef.current !== null) analyzeDetectedFace(currentSessionIdRef.current);
        }, ANALYSIS_INTERVAL);
      }
      setStatusMessage('Grabación reanudada. Analizando rostro...');
    }
  }, [currentSessionId, isRecordingPaused, runDetection, analyzeDetectedFace]);

  // ---------- Hooks de ciclo de vida ----------
  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    loadModels();
    return () => { stopAllMediaAndIntervals(); };
  }, [isLoggedIn, navigate, loadModels, stopAllMediaAndIntervals]);

  useEffect(() => {
    const handleResize = () => {
      if (videoRef.current && canvasRef.current && videoRef.current.videoWidth > 0) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); };
  }, []);

  const handleLogout = useCallback(() => {
    stopDetectionAndAnalysis();
    logout();
    navigate('/login');
  }, [logout, navigate, stopDetectionAndAnalysis]);

  // ---------- UI ----------
  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 p-6 flex flex-col justify-between shadow-lg">
        <div>
          <div className="mb-10 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-500 mx-auto" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1.5-12c.828 0 1.5-.672 1.5-1.5S11.328 5 10.5 5 9 5.672 9 6.5s.672 1.5 1.5 1.5zm3 0c.828 0 1.5-.672 1.5-1.5S14.328 5 13.5 5 12 5.672 12 6.5s.672 1.5 1.5 1.5zm-3 6c-.828 0-1.5.672-1.5 1.5s.672 1.5 1.5 1.5 1.5-.672 1.5-1.5-.672-1.5-1.5-1.5zm3 0c-.828 0-1.5.672-1.5 1.5s.672 1.5 1.5 1.5 1.5-.672 1.5-1.5-.672-1.5-1.5-1.5z"/>
            </svg>
            <h2 className="text-xl font-semibold text-gray-50 mt-2">Stress Detection App</h2>
          </div>

          <nav className="space-y-4">
            <button onClick={() => navigate('/recording')} className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition">
              <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Grabar
            </button>
            <button onClick={() => navigate('/dashboard')} className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition">
              <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              Estadísticas
            </button>
            <button onClick={() => navigate('/historial')} className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition">
              <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Historial
            </button>
            <button onClick={() => navigate('/settings')} className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition">
              <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.827 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.827 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.827-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756.426-1.756 2.924 0 3.35a1.724 1.724 0 001.066 2.573c-.94 1.543-.827 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configuración
            </button>
            <button onClick={() => navigate('/profile')} className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition">
              <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Perfil
            </button>
          </nav>
        </div>

        <button onClick={handleLogout} className="w-full flex items-center justify-center p-3 mt-8 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition">
          <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-10a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar Sesión
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-4xl font-extrabold text-white mb-6 text-center">Detector de Estrés Facial Automático</h1>

        {/* Estado */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-inner mb-6 text-center">
          <p id="statusMessage" className={`text-lg font-medium ${statusMessage.includes('Error') ? 'text-red-400' : 'text-blue-400'}`}>{statusMessage}</p>
          {isCameraActive && currentSessionId !== null && !isRecordingPaused && (
            <p className="text-green-400 mt-2 font-semibold">¡Grabando y Analizando Datos! ID de Sesión: {currentSessionId}</p>
          )}
          {isRecordingPaused && currentSessionId !== null && (
            <p className="text-yellow-400 mt-2 font-semibold">Grabación Pausada. ID de Sesión: {currentSessionId}</p>
          )}
        </div>

        {/* Video */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl flex flex-col items-center">
          <div className="relative w-full max-w-2xl bg-black rounded-lg overflow-hidden border border-gray-700 shadow-2xl">
            <video id="videoFeed" ref={videoRef} autoPlay muted className="hidden"></video>
            <canvas id="displayCanvas" ref={canvasRef} className="w-full h-auto block transform scale-x-[-1]"></canvas>
            {!isCameraActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70">
                <span className="text-gray-400 text-xl">Cámara Inactiva</span>
              </div>
            )}
          </div>

          {/* Controles */}
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <button
              onClick={isCameraActive ? stopAllMediaAndIntervals : startCamera}
              disabled={!modelsLoaded}
              className={`px-6 py-3 rounded-lg font-semibold shadow-md transition
                ${isCameraActive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
                ${!modelsLoaded ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isCameraActive ? 'Apagar Cámara' : 'Encender Cámara'}
            </button>

            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={!isCameraActive || currentSessionId !== null || !modelsLoaded}
              className={`px-6 py-3 rounded-lg font-semibold shadow-md transition
                ${isCameraActive && currentSessionId === null && modelsLoaded ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 cursor-not-allowed'}`}
            >
              Iniciar Grabación
            </button>

            <button
              onClick={togglePauseRecording}
              disabled={currentSessionId === null || !isCameraActive}
              className={`px-6 py-3 rounded-lg font-semibold shadow-md transition
                ${currentSessionId !== null && isCameraActive ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-600 cursor-not-allowed'}`}
            >
              {isRecordingPaused ? 'Reanudar Grabación' : 'Pausar Grabación'}
            </button>

            <button
              onClick={stopDetectionAndAnalysis}
              disabled={currentSessionId === null}
              className={`px-6 py-3 rounded-lg font-semibold shadow-md transition
                ${currentSessionId !== null ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 cursor-not-allowed'}`}
            >
              Terminar Grabación
            </button>
          </div>

          {/* Selector de duración (CP020/CP021) */}
          <div className="mt-4 flex items-center gap-3 flex-wrap justify-center">
            <span className="text-sm text-gray-300">Duración:</span>
            <select
              value={selectedDurationKey}
              onChange={(e) => setSelectedDurationKey(e.target.value as any)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
            >
              <option value="auto">Automática (predeterminada: {defaultDurationKey})</option>
              <option value="20m">20 minutos</option>
              <option value="1h">1 hora</option>
              <option value="2h">2 horas</option>
              <option value="4h">4 horas</option>
            </select>
            {/* <span className="text-xs text-gray-400">(CP020/CP021)</span> */}
          </div>
        </div>

        {/* Resultados (CP036) */}
        {showResults ? (
          <div className="bg-gray-800 p-6 rounded-lg shadow-inner mt-6">
            <h2 className="text-xl font-semibold text-white mb-4">Resultados del Análisis</h2>
            <div id="resultArea" className="bg-gray-700 p-4 rounded text-gray-200 text-sm font-mono whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: resultAreaContent || "Esperando resultados..." }}></div>
          </div>
        ) : (
          <div className="bg-gray-800 p-4 rounded-lg shadow-inner mt-6 text-gray-400 text-sm">
            Panel de resultados oculto por configuración.
          </div>
        )}

        {/* Modal de confirmación */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 shadow-xl max-w-sm w-full text-center">
              <h2 className="text-xl font-bold text-white mb-4">Confirmar inicio</h2>
              <p className="text-gray-300 mb-6">¿Deseas iniciar la grabación?</p>
              <div className="flex justify-center gap-4">
                <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md">No</button>
                <button onClick={() => { setShowConfirmModal(false); setCountdown(3); }} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md">Sí</button>
              </div>
            </div>
          </div>
        )}

        {/* Overlay de conteo regresivo */}
        {countdown !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <h1 className="text-6xl font-extrabold text-white animate-bounce">{countdown}</h1>
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
