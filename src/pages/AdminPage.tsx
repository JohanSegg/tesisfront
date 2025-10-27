// src/pages/AdminPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexto/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type Trabajador = {
  trabajador_id: number;
  nombre: string;
  username: string;
  role_id: number | null;
};

const ROLES = {
  USUARIO: 1,
  ADMIN: 2,
  JEFE: 3,
} as const;

const roleName = (r: number | null) =>
  r === ROLES.ADMIN ? "Administrador" : r === ROLES.JEFE ? "Jefe" : "Usuario";

const AdminPage: React.FC = () => {
  const { trabajadorId } = useAuth();
  const navigate = useNavigate();

  // estados
const [me, setMe] = useState<Trabajador | null>(null); // <— ahora SÍ usamos "me"
  const [roleFilter, setRoleFilter] = useState<number | "all">("all");
  const [usuarios, setUsuarios] = useState<Trabajador[]>([]);
  const [jefes, setJefes] = useState<Trabajador[]>([]);
  const [usuariosSinJefe, setUsuariosSinJefe] = useState<Trabajador[]>([]);
  const [selectedJefeId, setSelectedJefeId] = useState<number | null>(null);
  const [marcados, setMarcados] = useState<Set<number>>(new Set()); // seleccion múltiple
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
    const [subListRefresh, setSubListRefresh] = useState(0);

    const esAdmin = (u?: Trabajador | null) => (u?.role_id ?? ROLES.USUARIO) === ROLES.ADMIN;
    // const esJefe = (u?: Trabajador | null) => (u?.role_id ?? ROLES.USUARIO) === ROLES.JEFE;

// Modal de confirmación genérico
    const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    message: string;
    onConfirm: null | (() => void);
    confirmLabel?: string;
    title?: string;
    disableConfirm?: boolean;
    }>({ open: false, message: "", onConfirm: null });

    // Modal de información/éxito (cuando la CP exige "mostrar un modal con el mensaje")
    const [infoModal, setInfoModal] = useState<{ open: boolean; message: string; title?: string }>({
    open: false,
    message: ""
    });

  // helper header (guard simple)
  const adminHeaders = {
    "Content-Type": "application/json",
    "X-Role-Id": "2",
  };
const puedeVerBotonJefe = (u: Trabajador) => {
  // No mostrar si es admin, ni si es el propio admin logueado
  if (esAdmin(u)) return false;
  if (me && u.trabajador_id === me.trabajador_id) return false;
  return true;
};

const Modal: React.FC<{
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  disableConfirm?: boolean;
}> = ({ open, title, message, confirmLabel = "Confirmar", cancelLabel = "Cancelar", onConfirm, onCancel, disableConfirm }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-5">
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        <p className="text-gray-700 mb-4 whitespace-pre-line">{message}</p>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" onClick={onCancel}> {cancelLabel} </button>
          <button
            className={`px-4 py-2 rounded ${disableConfirm ? "bg-gray-300" : "bg-blue-600 hover:bg-blue-700"} text-white`}
            disabled={disableConfirm}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};


  // cargar "yo"
  useEffect(() => {
    const loadMe = async () => {
      if (!trabajadorId) return;
      const r = await fetch(`${API_BASE_URL}/trabajadores/${trabajadorId}/basic`);
      if (!r.ok) return;
      const u: Trabajador = await r.json();
      setMe(u);
      if (u.role_id !== ROLES.ADMIN) {
        navigate("/dashboard"); // no admin => fuera
      }
    };
    loadMe();
  }, [trabajadorId, navigate]);

  // fetch listas
  const fetchUsuarios = async () => {
    setLoading(true);
    setErr(null);
    try {
      const query = roleFilter === "all" ? "" : `?role_id=${roleFilter}`;
      const res = await fetch(`${API_BASE_URL}/admin/usuarios${query}`, {
        headers: adminHeaders,
      });
      if (!res.ok) throw new Error("No se pudo obtener usuarios");
      const data: Trabajador[] = await res.json();
      setUsuarios(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const fetchJefes = async () => {
    const r = await fetch(`${API_BASE_URL}/admin/jefes`, { headers: adminHeaders });
    if (r.ok) setJefes(await r.json());
  };

const fetchUsuariosSinJefe = async () => {
  const r = await fetch(`${API_BASE_URL}/admin/usuarios/sin-jefe`, { headers: adminHeaders });
  if (r.ok) {
    const raw: Trabajador[] = await r.json();
    // Solo rol USUARIO y no yo
    const filtrados = raw.filter(u =>
      (u.role_id ?? ROLES.USUARIO) === ROLES.USUARIO &&
      (!me || u.trabajador_id !== me.trabajador_id)
    );
    setUsuariosSinJefe(filtrados);
  }
};

    useEffect(() => {
    fetchJefes();
    }, []);

    // cuando cambie "me", re-filtra “sin-jefe”
    useEffect(() => {
    fetchUsuariosSinJefe();
    }, [me]);

  // acciones
  const actualizarRol = async (id: number, newRole: number) => {
  setMsg(null); setErr(null);

  // buscamos al target en cache
  const target = usuarios.find(x => x.trabajador_id === id);

  // Regla 1: No promover a Jefe a un Admin
  if (newRole === ROLES.JEFE && target && esAdmin(target)) {
    setErr("No puedes convertir a un Administrador en Jefe.");
    return;
  }
  // Regla 2: No puedes convertirte a ti mismo en Jefe
  if (newRole === ROLES.JEFE && me && id === me.trabajador_id) {
    setErr("No puedes asignarte el rol de Jefe a ti mismo.");
    return;
  }

  // (opcional) si no quieres permitir degradar/ascender admins en absoluto,
  // bloquea cualquier cambio si el target es admin:
  // if (target && esAdmin(target) && newRole !== ROLES.ADMIN) {
  //   setErr("No se permite cambiar el rol de un Administrador desde el panel.");
  //   return;
  // }

  const r = await fetch(`${API_BASE_URL}/admin/usuarios/${id}/rol`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({ role_id: newRole }),
  });
  const data = await r.json();
  if (!r.ok) {
    setErr(data?.detail || "Error al actualizar rol");
  } else {
    setMsg(data?.message || "Rol modificado con éxito.");
    fetchUsuarios();
    fetchJefes();
    fetchUsuariosSinJefe();
  }
};

  const eliminarUsuario = async (id: number) => {
  setConfirmModal({
    open: true,
    title: "Confirmación",
    message: "¿Está seguro de eliminar el usuario? Esta acción es irreversible.",
    confirmLabel: "Aceptar",
    onConfirm: async () => {
      setConfirmModal({ open: false, message: "", onConfirm: null });
      setMsg(null); setErr(null);
      const r = await fetch(`${API_BASE_URL}/admin/usuarios/${id}`, {
        method: "DELETE",
        headers: adminHeaders,
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        setErr(data?.detail || "No se pudo eliminar el usuario");
      } else {
        await fetchUsuarios();
        await fetchJefes();
        await fetchUsuariosSinJefe();
        // CP050: modal con mensaje exacto
        setInfoModal({ open: true, message: "Usuario eliminado exitosamente." });
      }
    }
  });
};

  const toggleMarcado = (id: number) => {
    const s = new Set(marcados);
    if (s.has(id)) s.delete(id); else s.add(id);
    setMarcados(s);
  };

  const asignarSubordinados = async () => {
    if (!selectedJefeId) return;
    if (marcados.size === 0) return;
    setMsg(null); setErr(null);

    const payload = {
      jefe_id: selectedJefeId,
      subordinado_ids: Array.from(marcados),
    };
    const r = await fetch(`${API_BASE_URL}/admin/asignaciones`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!r.ok) {
      setErr(data?.detail || "Error asignando subordinados");
    } else {
      setMsg(data?.message || "Asignación registrada exitosamente.");
      setMarcados(new Set());
      fetchUsuariosSinJefe();
    }
  };

//   const eliminarAsignacion = async (jefeId: number, subId: number) => {
//     if (!confirm("¿Eliminar esta asignación?")) return;
//     setMsg(null); setErr(null);
//     const r = await fetch(`${API_BASE_URL}/admin/asignaciones`, {
//       method: "DELETE",
//       headers: adminHeaders,
//       body: JSON.stringify({ jefe_id: jefeId, subordinado_id: subId }),
//     });
//     const data = await r.json();
//     if (!r.ok) {
//       setErr(data?.detail || "Error al eliminar asignación");
//     } else {
//       setMsg(data?.message || "Asignación eliminada correctamente.");
//       // si borras una asignación, ese usuario pasa a "sin jefe"
//       fetchUsuariosSinJefe();
//     }
//   };

  // UI
  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
<aside className="w-64 bg-gray-800 p-6 flex flex-col justify-between shadow-lg">
      <div>
        {/* Logo/encabezado como en Dashboard */}
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

        {/* Menú: igual que Dashboard */}
        <nav className="space-y-4">
          {/* <button
            onClick={() => navigate('/recording')}
            className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition duration-200"
          >
            <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Historial
          </button> */}

          {/* Si quieres link al Admin (opcional) */}
          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center p-3 text-lg font-medium text-gray-200 hover:bg-gray-700 rounded-lg transition duration-200"
          >
            <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18" />
            </svg>
            Admin
          </button>
        </nav>
      </div>

      <button
        onClick={() => navigate('/login')}
        className="w-full flex items-center justify-center p-3 mt-8 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition duration-200"
      >
        <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-10a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Cerrar Sesión
      </button>
    </aside>
      <main className="flex-1 p-6 overflow-auto bg-gray-100 text-gray-900">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Administración de Usuarios</h1>
          <p className="text-sm text-gray-600">Solo visible para Administradores</p>
        </header>

        {/* mensajes */}
        {msg && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{msg}</div>}
        {err && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">Error: {err}</div>}

        {/* BLOQUE 1: Gestión de roles y usuarios */}
        <section className="bg-white p-4 rounded-lg shadow mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-end mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Filtrar por rol</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="all">Todos</option>
                <option value={ROLES.USUARIO}>Usuario</option>
                <option value={ROLES.JEFE}>Jefe</option>
                <option value={ROLES.ADMIN}>Administrador</option>
              </select>
            </div>
            <button onClick={fetchUsuarios}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2">ID</th>
                  <th className="p-2">Nombre</th>
                  <th className="p-2">Usuario</th>
                  <th className="p-2">Rol</th>
                  <th className="p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.trabajador_id} className="border-b">
                    <td className="p-2">{u.trabajador_id}</td>
                    <td className="p-2">{u.nombre}</td>
                    <td className="p-2">{u.username}</td>
                    <td className="p-2">{roleName(u.role_id ?? 1)}</td>
                    <td className="p-2 space-x-2">
  {puedeVerBotonJefe(u) && (
    u.role_id === ROLES.JEFE ? (
      <button
        className="px-3 py-1 rounded bg-yellow-600 text-white hover:bg-yellow-700"
        onClick={() => {
  setConfirmModal({
    open: true,
    title: "Confirmación",
    message: "¿Desea quitar el rol de jefe al usuario seleccionado?",
    confirmLabel: "Aceptar",
    onConfirm: async () => {
      setConfirmModal({ open: false, message: "", onConfirm: null });
      await actualizarRol(u.trabajador_id, ROLES.USUARIO);
      // Forzar copy exacto (CP047)
      setMsg(null);
      setInfoModal({ open: true, message: "Rol modificado con éxito." });
    }
  });
}}

        title="Quitar rol de Jefe"
      >
        Quitar Jefe
      </button>
    ) : (
      <button
        className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
onClick={() => {
  setConfirmModal({
    open: true,
    title: "Confirmación",
    message: "¿Desea hacer jefe al usuario seleccionado?",
    confirmLabel: "Aceptar",
    onConfirm: async () => {
      setConfirmModal({ open: false, message: "", onConfirm: null });
      await actualizarRol(u.trabajador_id, ROLES.JEFE);
      // Forzar copy exacto de éxito (CP046), independientemente del backend
      setMsg(null);
      setInfoModal({ open: true, message: "Rol asignado con éxito." });
    }
  });
}}
        title="Asignar rol de Jefe"
      >
        Hacer Jefe
      </button>
    )
  )}

  <button
    className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
    onClick={() => eliminarUsuario(u.trabajador_id)}
  >
    Eliminar
  </button>
</td>

                  </tr>
                ))}
                {usuarios.length === 0 && (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-500">Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* BLOQUE 2: Asignaciones Jefe - Subordinados */}
        <section className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Asignaciones</h2>

          {/* seleccionar jefe */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Selecciona un Jefe</label>
            <select
              value={selectedJefeId ?? ""}
              onChange={(e) => setSelectedJefeId(Number(e.target.value))}
              className="border rounded px-3 py-2 w-full"
            >
              <option value="">-- Elige --</option>
              {jefes.map(j => (
                <option key={j.trabajador_id} value={j.trabajador_id}>{j.nombre} (#{j.trabajador_id})</option>
              ))}
            </select>
          </div>

          {/* dos columnas: sin-jefe y acciones asignar; y lista rápida para eliminar asignaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded p-3">
              <h3 className="font-medium mb-2">Usuarios sin jefe</h3>
              <div className="max-h-72 overflow-auto space-y-2">
                {usuariosSinJefe.map(u => (
                  <label key={u.trabajador_id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={marcados.has(u.trabajador_id)}
                      onChange={() => toggleMarcado(u.trabajador_id)}
                    />
                    <span>{u.nombre} – <span className="text-gray-500 text-xs">{u.username}</span></span>
                  </label>
                ))}
                {usuariosSinJefe.length === 0 && (
                  <p className="text-gray-500">No hay usuarios disponibles.</p>
                )}
              </div>
              {selectedJefeId && (
  <button
    disabled={marcados.size === 0}
    onClick={() => {
      // CP053: confirmar en modal, con Confirmar habilitado solo si hay marcados
      setConfirmModal({
        open: true,
        title: "Confirmación",
        message: `¿Desea asignar ${marcados.size} colaborador(es) al jefe seleccionado?`,
        confirmLabel: "Confirmar",
        disableConfirm: marcados.size === 0,
        onConfirm: async () => {
        setSubListRefresh((x) => x + 1); // refrescar lista de subordinados del jefe

          setConfirmModal({ open: false, message: "", onConfirm: null });
          await asignarSubordinados(); // hará el setMsg correcto
          // CP052: además del setMsg (CP053), muestra explícitamente el copy del HU
          setInfoModal({
            open: true,
            message: "Colaborador asignado correctamente."
          });
        }
      });
    }}
    className="mt-3 px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-300"
  >
    Agregar colaborador
  </button>
)}

            </div>

            <div className="border rounded p-3">
  <h3 className="font-medium mb-2">Subordinados del jefe seleccionado</h3>

  {!selectedJefeId && (
    <p className="text-gray-500">Selecciona un jefe para ver sus subordinados.</p>
  )}

  {selectedJefeId && (
    <ListaSubordinados
      jefeId={selectedJefeId}
      refreshSignal={subListRefresh}
      onQuitar={(subId) => {
        // CP051: modal de confirmación con el copy exacto
        setConfirmModal({
          open: true,
          title: "Confirmación",
          message: "¿Desea remover a este usuario del jefe seleccionado?",
          confirmLabel: "Aceptar",
          onConfirm: async () => {
            setConfirmModal({ open: false, message: "", onConfirm: null });

            // Llamada directa al endpoint (sin confirm() nativo)
            setMsg(null); setErr(null);
            const r = await fetch(`${API_BASE_URL}/admin/asignaciones`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json", "X-Role-Id": "2" },
              body: JSON.stringify({ jefe_id: selectedJefeId, subordinado_id: subId }),
            });
            const data = await r.json();

            if (!r.ok) {
              setErr(data?.detail || "Error al eliminar asignación");
            } else {
              // CP051: mensaje exacto en modal
              setInfoModal({ open: true, message: "Usuario removido del jefe actual con exito" });
              // refrescar ambos lados
              setSubListRefresh((x) => x + 1);
              fetchUsuariosSinJefe();
            }
          }
        });
      }}
    />
  )}
</div>

          </div>
        </section>

        
      </main>
      <Modal
  open={confirmModal.open}
  title={confirmModal.title}
  message={confirmModal.message}
  confirmLabel={confirmModal.confirmLabel || "Confirmar"}
  disableConfirm={confirmModal.disableConfirm}
  onCancel={() => setConfirmModal({ open: false, message: "", onConfirm: null })}
  onConfirm={confirmModal.onConfirm || (() => setConfirmModal({ open: false, message: "", onConfirm: null }))}
/>

<Modal
  open={infoModal.open}
  title={infoModal.title || "Información"}
  message={infoModal.message}
  confirmLabel="Aceptar"
  onCancel={() => setInfoModal({ open: false, message: "" })}
  onConfirm={() => setInfoModal({ open: false, message: "" })}
/>

    </div>
    
  );
};

// const EliminarAsignacionForm: React.FC<{ onEliminar: (jefeId: number, subId: number) => void }> = ({ onEliminar }) => {
//   const [jefeId, setJefeId] = useState<string>("");
//   const [subId, setSubId] = useState<string>("");

//   return (
//     <div className="flex gap-2 items-end">
//       <div className="flex-1">
//         <label className="block text-sm font-medium mb-1">ID Jefe</label>
//         <input className="border rounded px-3 py-2 w-full" value={jefeId} onChange={(e)=>setJefeId(e.target.value)} />
//       </div>
//       <div className="flex-1">
//         <label className="block text-sm font-medium mb-1">ID Subordinado</label>
//         <input className="border rounded px-3 py-2 w-full" value={subId} onChange={(e)=>setSubId(e.target.value)} />
//       </div>
//       <button
//         className="px-4 py-2 bg-red-600 text-white rounded"
//         onClick={() => jefeId && subId && onEliminar(Number(jefeId), Number(subId))}
//       >
//         Quitar
//       </button>
//     </div>
//   );
// };

const ListaSubordinados: React.FC<{
  jefeId: number;
  onQuitar: (subId: number) => void;
  refreshSignal?: number; // <— NUEVO
}> = ({ jefeId, onQuitar, refreshSignal }) => {
  const [items, setItems] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API_BASE_URL}/jefes/${jefeId}/subordinados/`);
        const data: Trabajador[] = await r.json();
        setItems(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [jefeId, refreshSignal]); // <— agrega refreshSignal aquí

  if (loading) return <p className="text-gray-500">Cargando...</p>;
  if (items.length === 0) return <p className="text-gray-500">No hay subordinados.</p>;

  return (
    <ul className="divide-y">
      {items.map(s => (
        <li key={s.trabajador_id} className="flex items-center justify-between py-2">
          <div>
            <span className="font-medium">{s.nombre}</span>{" "}
            <span className="text-xs text-gray-500">@{s.username}</span>
          </div>
          <button
            className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center"
            title="Quitar de este jefe"
            onClick={() => onQuitar(s.trabajador_id)}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
};



export default AdminPage;
