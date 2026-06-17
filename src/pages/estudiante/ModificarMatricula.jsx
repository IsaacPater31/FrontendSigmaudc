import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { matriculaService } from "../../services/matricula";
import "../../styles/InscribirAsignaturas.css";
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaClock, FaHistory, FaTimes, FaClipboardList } from "react-icons/fa";

const parseJsonArray = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  }
  return [];
};

const formatFechaCorta = (fecha) => {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const etiquetaComponente = (componente) => (componente === "laboratorio" ? "Lab" : "Teo");

const ModificarMatricula = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [validacion, setValidacion] = useState(null);
  const [materiasMatriculadas, setMateriasMatriculadas] = useState([]);
  const [asignaturas, setAsignaturas] = useState([]);
  const [gruposSeleccionados, setGruposSeleccionados] = useState(new Set());
  const [gruposARetirar, setGruposARetirar] = useState(new Set()); // Nuevo: grupos a retirar en la solicitud
  const [horario, setHorario] = useState([]);
  const [conflictos, setConflictos] = useState(new Set());
  const [resumen, setResumen] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [creditosSeleccionados, setCreditosSeleccionados] = useState(0);
  
  // Estado para solicitudes
  const [solicitudPendiente, setSolicitudPendiente] = useState(null);
  const [historialSolicitudes, setHistorialSolicitudes] = useState([]);
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [asignaturasPage, setAsignaturasPage] = useState(1);
  const [paginacionAsignaturas, setPaginacionAsignaturas] = useState({
    page: 1,
    page_size: 25,
    total_items: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  });

  // Mostrar/ocultar horario y ocultar horas vacías
  const [showHorario, setShowHorario] = useState(true);
  const [hideEmptyHours, setHideEmptyHours] = useState(false);

  // Días de la semana (incluye domingo para coherencia)
  const diasSemana = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
  
  const estadoLabels = {
    activa: "Activa",
    cursada: "Aprobada",
    pendiente_repeticion: "Pendiente repetición",
    obligatoria_repeticion: "Repetición obligatoria",
  };

  const formatEstado = (estado) => estadoLabels[estado] || estado || "Desconocido";

  const openDialog = (title, body, onClose) => {
    setDialog({ title, body, onClose });
  };

  const closeDialog = () => {
    if (!dialog) return;
    const callback = dialog.onClose;
    setDialog(null);
    if (callback) {
      callback();
    }
  };

  const getErrorReason = (error, fallback) => {
    if (typeof error?.userMessage === "string" && error.userMessage.trim()) {
      return error.userMessage;
    }
    let reason = fallback;
    if (error?.response?.data) {
      if (error.response.data.razon) {
        reason = error.response.data.razon;
      } else if (error.response.data.error) {
        reason = error.response.data.error;
      } else if (typeof error.response.data === 'string') {
        reason = error.response.data;
      }
    } else if (error?.message) {
      reason = error.message;
    }
    return reason;
  };

  // Horas del día (7am - 10pm)
  const horas = Array.from({ length: 16 }, (_, i) => 7 + i);

  const normalizeAsignaturasFromAPI = (asignaturasRaw = []) => {
    return (asignaturasRaw || []).map((asignatura) => ({
      ...asignatura,
      grupos: (asignatura.grupos || []).map((grupo) => {
        const cupoMaximo = Math.max(Number(grupo.cupo_max || 0), 0);
        const cupoDisponible = Math.min(Math.max(Number(grupo.cupo_disponible || 0), 0), cupoMaximo);
        return {
          ...grupo,
          cupo_max: cupoMaximo,
          cupo_disponible: cupoDisponible,
        };
      }),
    }));
  };

  const reconciliarSeleccionConOferta = (asignaturasOferta = []) => {
    const gruposDisponibles = new Set(
      asignaturasOferta.flatMap((a) => (a.grupos || []).map((g) => g.id))
    );

    setGruposSeleccionados((prev) => {
      const next = new Set(Array.from(prev).filter((gid) => gruposDisponibles.has(gid)));
      let nuevosCreditos = 0;
      asignaturasOferta.forEach((a) => {
        if (a.grupos?.some((g) => next.has(g.id))) {
          nuevosCreditos += a.creditos || 0;
        }
      });
      setCreditosSeleccionados(nuevosCreditos);
      return next;
    });

    setConflictos((prev) => new Set(Array.from(prev).filter((gid) => gruposDisponibles.has(gid))));
  };

  useEffect(() => {
    if (!historialAbierto) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setHistorialAbierto(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [historialAbierto]);

  useEffect(() => {
    validarYcargar();
  }, [asignaturasPage]);

  const cargarDatosModificaciones = async (page = 1) => {
    const datos = await matriculaService.getModificacionesData({
      materias_page: 1,
      materias_page_size: 100,
      asignaturas_page: page,
      asignaturas_page_size: 25,
    });
    setMateriasMatriculadas(datos.materias_matriculadas || []);
    const ofertaNormalizada = normalizeAsignaturasFromAPI(datos.asignaturas_disponibles || []);
    setAsignaturas(ofertaNormalizada);
    setPaginacionAsignaturas(
      datos.paginacion_asignaturas || {
        page: page,
        page_size: 25,
        total_items: ofertaNormalizada.length,
        total_pages: 1,
        has_next: false,
        has_prev: page > 1,
      }
    );
    reconciliarSeleccionConOferta(ofertaNormalizada);
    setResumen({
      periodo: datos.periodo,
      creditos: datos.creditos,
      estadoEstudiante: datos.estado_estudiante,
      semestreEstudiante: datos.semestre_estudiante,
    });
    actualizarHorarioDesdeMatriculadas(datos.materias_matriculadas || []);
    return datos;
  };

  useEffect(() => {
    const unsubscribe = matriculaService.subscribeModificacionesEvents({
      onMessage: async (event) => {
        if (event?.event_type !== "solicitud_actualizada" && event?.event_type !== "cupos_actualizados") {
          return;
        }
        await cargarSolicitudes();
        try {
          await cargarDatosModificaciones(asignaturasPage);
        } catch (error) {
          // Silenciar para no interrumpir la UX si el stream notifica un cambio no aplicable.
          console.log("No se pudo refrescar datos de modificaciones tras evento:", error?.message || error);
        }
      },
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!validacion?.puedeModificar) return;
    cargarDatosModificaciones(asignaturasPage).catch((error) => {
      console.log("No se pudo cambiar de página de asignaturas:", error?.message || error);
    });
  }, [asignaturasPage]);

  const validarYcargar = async () => {
    try {
      setLoading(true);
      
      // Validar modificaciones usando el endpoint del backend
      const validacionData = await matriculaService.validarModificaciones();
      
      if (!validacionData.puede_modificar) {
        const razon = validacionData.razon || "No puedes realizar modificaciones en este momento.";
        setValidacion({
          puedeModificar: false,
          razon,
        });
        setLoading(false);
        return;
      }

      // Si pasa las validaciones, cargar datos
      setValidacion({ puedeModificar: true });

      try {
        const datos = await cargarDatosModificaciones(asignaturasPage);
        
        if (datos.error) {
          setValidacion({
            puedeModificar: false,
            razon: datos.error,
          });
          setLoading(false);
          return;
        }
        
        // Cargar solicitudes del estudiante
        await cargarSolicitudes();

      } catch (error) {
        const razonCarga = getErrorReason(error, "No pudimos cargar los datos de modificaciones en este momento.");
        if (error?.response?.data?.error) {
          setValidacion({
            puedeModificar: false,
            razon: error.response.data.error,
          });
        } else {
          openDialog("Error al cargar", razonCarga);
          setMateriasMatriculadas([]);
          setAsignaturas([]);
          setResumen(null);
        }
      }
    } catch (error) {
      console.error("Error validando modificaciones:", error);
      const razonError = getErrorReason(error, "Error al validar los requisitos de modificaciones.");
      setValidacion({
        puedeModificar: false,
        razon: razonError,
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar solicitudes del estudiante
  const cargarSolicitudes = async () => {
    try {
      const response = await matriculaService.getSolicitudesModificacion();
      const solicitudes = Array.isArray(response)
        ? response
        : Array.isArray(response?.solicitudes)
          ? response.solicitudes
          : [];
      
      // Buscar solicitud pendiente
      const pendiente = solicitudes.find(s => s.estado === 'pendiente');
      setSolicitudPendiente(pendiente || null);
      
      // Historial completo de solicitudes procesadas (no pendientes)
      setHistorialSolicitudes(
        solicitudes.filter(s => s.estado !== 'pendiente')
      );
    } catch (error) {
      // Silenciar el error si el endpoint no existe aún
      console.log("Solicitudes no disponibles aún:", error.message);
      setSolicitudPendiente(null);
      setHistorialSolicitudes([]);
    }
  };

  const actualizarHorarioDesdeMatriculadas = (materias) => {
    const nuevoHorario = materias.map((mat) => ({
      grupoId: mat.grupo_id,
      asignatura: mat.nombre,
      codigo: mat.codigo,
      grupoCodigo: mat.grupo_codigo,
      docente: mat.docente,
      horarios: mat.horarios || [],
    }));
    setHorario(nuevoHorario);
  };

  const verificarConflictoEntreSeleccionados = (grupoId, horariosGrupo) => {
    for (const grupoSelId of gruposSeleccionados) {
      if (grupoSelId === grupoId) continue;
      const grupoSel = encontrarGrupoPorId(grupoSelId);
      if (!grupoSel) continue;

      for (const horarioSel of grupoSel.horarios || []) {
        for (const horarioNuevo of horariosGrupo) {
          if (
            horarioSel.dia === horarioNuevo.dia &&
            haySolapamiento(horarioSel.hora_inicio, horarioSel.hora_fin, horarioNuevo.hora_inicio, horarioNuevo.hora_fin)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const encontrarGrupoPorId = (grupoId) => {
    for (const asignatura of asignaturas) {
      const grupo = asignatura.grupos?.find((g) => g.id === grupoId);
      if (grupo) return grupo;
    }
    return null;
  };

  const haySolapamiento = (inicio1, fin1, inicio2, fin2) => {
    const [h1, m1] = inicio1.split(':').map(Number);
    const [h2, m2] = fin1.split(':').map(Number);
    const [h3, m3] = inicio2.split(':').map(Number);
    const [h4, m4] = fin2.split(':').map(Number);
    
    const inicio1Min = h1 * 60 + m1;
    const fin1Min = h2 * 60 + m2;
    const inicio2Min = h3 * 60 + m3;
    const fin2Min = h4 * 60 + m4;
    
    return !(fin1Min <= inicio2Min || fin2Min <= inicio1Min);
  };

  // Modificado: toggleGrupo ahora solo marca para la solicitud
  const toggleGrupo = (grupoId, asignatura) => {
    if (asignatura.estado === "cursada") {
      return;
    }

    const semestreEstudiante = resumen?.semestreEstudiante ?? 0;
    if (Number(asignatura.semestre) <= semestreEstudiante) {
      openDialog(
        "Semestre no permitido",
        "En modificaciones solo puedes agregar asignaturas de semestres superiores al tuyo. Para materias de tu semestre o anteriores, usa la opción de retiro si ya están matriculadas."
      );
      return;
    }

    const grupo = asignatura.grupos?.find((g) => g.id === grupoId);
    if (!grupo) return;

    const otroGrupoSeleccionado = asignatura.grupos?.find(
      (g) => g.id !== grupoId && gruposSeleccionados.has(g.id)
    );
    if (otroGrupoSeleccionado && !gruposSeleccionados.has(grupoId)) {
      openDialog(
        "Grupo duplicado",
        "Solo puedes seleccionar un grupo por asignatura. Deselecciona el grupo actual antes de elegir otro."
      );
      return;
    }

    // Verificar cupo
    if (grupo.cupo_disponible <= 0) {
      openDialog("Sin cupo", "Este grupo ya no tiene cupos disponibles en este momento.");
      return;
    }

    if (gruposSeleccionados.has(grupoId)) {
      const nuevosSeleccionados = new Set(gruposSeleccionados);
      nuevosSeleccionados.delete(grupoId);
      setGruposSeleccionados(nuevosSeleccionados);
      actualizarHorario(nuevosSeleccionados);
      setCreditosSeleccionados((prev) => Math.max(prev - asignatura.creditos, 0));
    } else {
      // Verificar conflicto antes de marcar
      if (verificarConflictoEntreSeleccionados(grupoId, grupo.horarios || [])) {
        setConflictos(new Set([...conflictos, grupoId]));
        openDialog("Conflicto de horario", "Este grupo choca con otra asignatura que ya seleccionaste.");
        return;
      }

      const creditosDisponibles = resumen?.creditos?.disponibles ?? 0;
      if (creditosSeleccionados + asignatura.creditos > creditosDisponibles) {
        openDialog(
          "Límite de créditos excedido",
          "Seleccionaste más créditos de los que permite tu semestre actual."
        );
        return;
      }

      const nuevosSeleccionados = new Set([...gruposSeleccionados, grupoId]);
      setGruposSeleccionados(nuevosSeleccionados);
      actualizarHorario(nuevosSeleccionados);
      setConflictos(new Set([...conflictos].filter((id) => id !== grupoId)));
      setCreditosSeleccionados((prev) => prev + asignatura.creditos);
    }
  };

  // Nuevo: marcar materia para retirar en la solicitud
  const toggleRetirar = (historialId, grupoId) => {
    const materia = materiasMatriculadas.find(m => m.historial_id === historialId);
    if (!materia?.puede_retirar) return;

    if (gruposARetirar.has(historialId)) {
      const nuevos = new Set(gruposARetirar);
      nuevos.delete(historialId);
      setGruposARetirar(nuevos);
    } else {
      const nuevos = new Set([...gruposARetirar, historialId]);
      setGruposARetirar(nuevos);
    }
  };

  // Nuevo: enviar solicitud de modificación
  const enviarSolicitud = async () => {
    if (gruposSeleccionados.size === 0 && gruposARetirar.size === 0) {
      openDialog("Sin cambios", "Selecciona al menos un grupo para agregar o una materia para retirar.");
      return;
    }

    if (solicitudPendiente) {
      openDialog("Solicitud pendiente", "Ya tienes una solicitud de modificación pendiente. Espera a que sea revisada.");
      return;
    }

    try {
      setEnviandoSolicitud(true);
      
      // Preparar grupos a agregar con información completa
      const gruposAgregarCompletos = Array.from(gruposSeleccionados).map(gid => {
        const grupo = encontrarGrupoPorId(gid);
        const asignatura = asignaturas.find((a) => a.grupos?.some((g) => g.id === gid));
        if (!grupo || !asignatura) return null;
        return {
          grupo_id: gid,
          grupo_codigo: grupo.codigo,
          asignatura_id: asignatura.id,
          asignatura_codigo: asignatura.codigo,
          asignatura_nombre: asignatura.nombre,
          creditos: asignatura.creditos,
          docente: grupo.docente || null,
        };
      }).filter(Boolean);
      
      // Preparar grupos a retirar con información completa
      const gruposRetirarCompletos = Array.from(gruposARetirar).map(historialId => {
        const materia = materiasMatriculadas.find(m => m.historial_id === historialId);
        if (!materia) return null;
        return {
          historial_id: historialId,
          grupo_id: materia.grupo_id,
          grupo_codigo: materia.grupo_codigo,
          asignatura_id: materia.asignatura_id,
          asignatura_codigo: materia.codigo,
          asignatura_nombre: materia.nombre,
          creditos: materia.creditos,
        };
      }).filter(Boolean);

      const semestreEstudiante = resumen?.semestreEstudiante ?? 0;
      const asignaturaSemestreInvalida = gruposAgregarCompletos.find(
        (grupo) => {
          const asignatura = asignaturas.find((a) => a.id === grupo.asignatura_id);
          return asignatura && Number(asignatura.semestre) <= semestreEstudiante;
        }
      );
      if (asignaturaSemestreInvalida) {
        openDialog(
          "Semestre no permitido",
          "En modificaciones solo puedes agregar asignaturas de semestres superiores al tuyo. Para materias de tu semestre o anteriores, usa la opción de retiro."
        );
        return;
      }
      
      await matriculaService.crearSolicitudModificacion({
        grupos_agregar: gruposAgregarCompletos,
        grupos_retirar: gruposRetirarCompletos,
      });

      setGruposSeleccionados(new Set());
      setGruposARetirar(new Set());
      setCreditosSeleccionados(0);
      
      openDialog(
        "Solicitud enviada",
        "Tu solicitud de modificación ha sido enviada. Recibirás una notificación cuando sea revisada por el jefe de departamento.",
        () => validarYcargar()
      );
    } catch (error) {
      const razon = getErrorReason(error, "Error al enviar la solicitud.");
      openDialog("Error", razon);
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  const actualizarHorario = (gruposIds) => {
    const nuevoHorario = [...horario];
    
    // Agregar grupos seleccionados al horario
    for (const grupoId of gruposIds) {
      const grupo = encontrarGrupoPorId(grupoId);
      if (grupo && grupo.horarios) {
        const asignatura = asignaturas.find((a) =>
          a.grupos?.some((g) => g.id === grupoId)
        );
        const existe = nuevoHorario.some((h) => h.grupoId === grupoId);
        if (!existe) {
          nuevoHorario.push({
            grupoId,
            asignatura: asignatura?.nombre || "Sin nombre",
            codigo: asignatura?.codigo || "",
            grupoCodigo: grupo.codigo,
            docente: grupo.docente,
            horarios: grupo.horarios,
          });
        }
      }
    }
    
    // Remover grupos deseleccionados (pero mantener los matriculados)
    const gruposMatriculados = materiasMatriculadas.map((m) => m.grupo_id);
    const nuevoHorarioFiltrado = nuevoHorario.filter(
      (h) => gruposMatriculados.includes(h.grupoId) || gruposIds.has(h.grupoId)
    );
    
    setHorario(nuevoHorarioFiltrado);
  };

  const formatearHora = (hora) => {
    const [h, m] = hora.split(':');
    return `${h}:${m}`;
  };

  const obtenerPosicionHorario = (horaInicio, horaFin) => {
    const [hInicio, mInicio] = horaInicio.split(':').map(Number);
    const [hFin, mFin] = horaFin.split(':').map(Number);
    
    const inicioMin = hInicio * 60 + mInicio;
    const finMin = hFin * 60 + mFin;
    const duracionMinutos = Math.max(finMin - inicioMin, 15);
    const offsetDentroHora = inicioMin % 60;
    
    return {
      duracionMinutos,
      offsetDentroHora,
    };
  };

  const obtenerColorAsignatura = (codigo) => {
    const hash = codigo.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
    ];
    return colors[hash % colors.length];
  };

  const creditosDisponiblesBackend = resumen?.creditos?.disponibles ?? 0;
  const creditosDisponiblesActual = Math.max(creditosDisponiblesBackend - creditosSeleccionados, 0);

  const renderHistorialModal = () => {
    if (!historialAbierto) return null;

    return (
      <div
        className="historial-modal-overlay"
        onClick={() => setHistorialAbierto(false)}
        role="presentation"
      >
        <div
          className="historial-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="historial-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="historial-modal-header">
            <button
              type="button"
              className="historial-modal-close"
              onClick={() => setHistorialAbierto(false)}
              aria-label="Cerrar historial"
            >
              <FaTimes />
            </button>
            <div className="historial-modal-heading">
              <h2 id="historial-modal-title">Historial</h2>
              <p>Solicitudes revisadas por jefatura</p>
            </div>
          </header>

          <div className="historial-modal-body">
            {historialSolicitudes.length === 0 ? (
              <div className="historial-modal-empty">
                <FaClipboardList size={40} aria-hidden="true" />
                <p>Aún no tienes solicitudes procesadas.</p>
              </div>
            ) : (
              <ul className="historial-modal-list">
                {historialSolicitudes.map((sol) => {
                  const agregar = parseJsonArray(sol.grupos_agregar);
                  const retirar = parseJsonArray(sol.grupos_retirar);
                  const aprobada = sol.estado === "aprobada";

                  return (
                    <li key={sol.id} className={`historial-item ${aprobada ? "aprobada" : "rechazada"}`}>
                      <div className="historial-item-top">
                        <span className={`historial-item-icon ${aprobada ? "success" : "danger"}`}>
                          {aprobada ? <FaCheckCircle /> : <FaTimesCircle />}
                        </span>
                        <div className="historial-item-main">
                          <strong>{aprobada ? "Aprobada" : "Rechazada"}</strong>
                          <time>{formatFechaCorta(sol.fecha_revision || sol.fecha_solicitud)}</time>
                        </div>
                      </div>

                      {(agregar.length > 0 || retirar.length > 0) && (
                        <div className="historial-item-cambios">
                          {agregar.map((g, i) => (
                            <span key={`a-${i}`} className="historial-chip agregar">
                              + {g.asignatura_nombre || g.asignatura_codigo || "Asignatura"}
                            </span>
                          ))}
                          {retirar.map((g, i) => (
                            <span key={`r-${i}`} className="historial-chip retirar">
                              − {g.asignatura_nombre || g.asignatura_codigo || "Asignatura"}
                            </span>
                          ))}
                        </div>
                      )}

                      {!aprobada && sol.observacion && (
                        <p className="historial-item-motivo">{sol.observacion}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  };

  const asignaturasConGrupos = asignaturas.filter((a) => (a.grupos?.length ?? 0) > 0);

  if (loading) {
    return (
      <div className="inscribir-loading">
        <div className="loading-spinner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32">
              <animate attributeName="stroke-dasharray" dur="2s" values="0 32;16 16;0 32;0 32" repeatCount="indefinite" />
              <animate attributeName="stroke-dashoffset" dur="2s" values="0;-16;-32;-32" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>
        <p>Validando requisitos de modificaciones...</p>
      </div>
    );
  }

  if (!validacion?.puedeModificar) {
    return (
      <div className="inscribir-bloqueo">
        <div className="bloqueo-card">
          <div className="bloqueo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2>Modificaciones no disponibles</h2>
          <p>{validacion?.razon || "No puedes realizar modificaciones en este momento."}</p>
          <button onClick={() => navigate("/")} className="btn-volver">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="inscribir-container">
      <div className="inscribir-header modificar-header">
        <div className="header-logo-title">
          <div className="udc-logo-container">
            <img 
              src="/logo-udc.png" 
              alt="Logo Universidad" 
              className="udc-logo"
            />
          </div>
          <div>
            <h1>Modificaciones Estudiantiles</h1>
            <p>Gestiona tus materias: retira o agrega asignaturas de semestres superiores</p>
          </div>
        </div>
        <button
          type="button"
          className="btn-historial"
          onClick={() => setHistorialAbierto(true)}
          aria-haspopup="dialog"
        >
          <FaHistory aria-hidden="true" />
          <span>Historial</span>
          {historialSolicitudes.length > 0 && (
            <span className="btn-historial-badge">{historialSolicitudes.length}</span>
          )}
        </button>
      </div>

      <div className="inscribir-content">
        {/* Columna Izquierda: Vista del Horario */}
        <div className="horario-column">
          <div className="horario-card">
            <div className="horario-card-header">
              <h2>Tu Horario</h2>
              <div className="horario-controls">
                <label className="horario-hide-empty">
                  <input
                    type="checkbox"
                    checked={hideEmptyHours}
                    onChange={() => setHideEmptyHours((v) => !v)}
                  />
                  Ocultar horas sin asignaturas
                </label>
                <button
                  className={`horario-toggle-arrow ${showHorario ? 'open' : ''}`}
                  onClick={() => setShowHorario((s) => !s)}
                  aria-label={showHorario ? 'Ocultar horario' : 'Mostrar horario'}
                />
              </div>
            </div>

            <div className="horario-grid">
              {!showHorario ? (
                <div className="horario-collapsed">Horario oculto. Pulsa la flecha para expandir.</div>
              ) : (
                (() => {
                  const horaTieneAsignatura = (hora) =>
                    horario.some((h) =>
                      h.horarios.some((hor) =>
                        parseInt(hor.hora_inicio.split(':')[0]) <= hora && parseInt(hor.hora_fin.split(':')[0]) > hora
                      )
                    );

                  // Si se pidió ocultar horas vacías y no hay nada en el horario
                  if (hideEmptyHours && horario.length === 0) {
                    return (
                      <div className="horario-empty-message">No hay asignaturas en tu horario actual.</div>
                    );
                  }

                  // Filtrar horas visibles
                  const visibleHoras = hideEmptyHours && horario.length > 0
                    ? horas.filter(horaTieneAsignatura)
                    : horas;

                  if (visibleHoras.length === 0) {
                    return (
                      <div className="horario-empty-message">No hay asignaturas en tu horario actual.</div>
                    );
                  }

                  return (
                    <>
                      <div className="horario-header">
                        <div className="horario-time-col">Hora</div>
                        {diasSemana.map((dia) => (
                          <div key={dia} className="horario-day-col">
                            {dia.substring(0, 3)}
                          </div>
                        ))}
                      </div>

                      <div className="horario-body">
                        {visibleHoras.map((hora) => (
                          <div key={hora} className="horario-row">
                            <div className="horario-time-cell">{hora}:00</div>
                            {diasSemana.map((dia) => (
                              <div key={`${hora}-${dia}`} className="horario-cell">
                                {horario
                                  .filter((h) =>
                                    h.horarios.some(
                                      (hor) =>
                                        hor.dia === dia &&
                                        parseInt(hor.hora_inicio.split(':')[0]) <= hora &&
                                        parseInt(hor.hora_fin.split(':')[0]) > hora
                                    )
                                  )
                                  .map((h, idx) => {
                                    const horarioDia = h.horarios.find((hor) => hor.dia === dia);
                                    if (!horarioDia) return null;
                                    const pos = obtenerPosicionHorario(horarioDia.hora_inicio, horarioDia.hora_fin);
                                    if (parseInt(horarioDia.hora_inicio.split(':')[0]) !== hora) return null;

                                    const bloqueAltura = Math.max(pos.duracionMinutos - 4, 28);
                                    const bloqueTop = 4 + Math.min(pos.offsetDentroHora, 52);
                                    return (
                                      <div
                                        key={idx}
                                        className="horario-block"
                                        style={{
                                          backgroundColor: obtenerColorAsignatura(h.codigo),
                                          height: `${bloqueAltura}px`,
                                          top: `${bloqueTop}px`,
                                        }}
                                        title={`${h.asignatura} - ${h.grupoCodigo}\n${h.docente}\n${horarioDia.salon}\n${formatearHora(horarioDia.hora_inicio)} - ${formatearHora(horarioDia.hora_fin)}`}
                                      >
                                        <div className="horario-block-content">
                                          <div className="horario-block-title">{h.asignatura}</div>
                                          <div className="horario-block-subtitle">{h.grupoCodigo} - {horarioDia.salon}</div>
                                          <div className="horario-block-time">
                                            {formatearHora(horarioDia.hora_inicio)} - {formatearHora(horarioDia.hora_fin)}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Materias Matriculadas y Disponibles */}
        <div className="asignaturas-column">
          <div className="asignaturas-card">
            {solicitudPendiente && (
              <article className="solicitud-pendiente-banner">
                <FaClock aria-hidden="true" />
                <div>
                  <p className="solicitud-pendiente-titulo">Solicitud en revisión</p>
                  <p className="solicitud-pendiente-texto">
                    Enviada el {formatFechaCorta(solicitudPendiente.fecha_solicitud)}. No puedes enviar otra hasta que jefatura responda.
                  </p>
                </div>
              </article>
            )}

            {resumen && (
              <div className="inscribir-resumen">
                <div className="resumen-card">
                  <div className="resumen-header">
                    <div>
                      <p className="resumen-label">Periodo activo</p>
                      <p className="resumen-value">
                        {resumen.periodo
                          ? `${resumen.periodo.year}-${resumen.periodo.semestre}`
                          : "Pendiente"}
                      </p>
                    </div>
                    {resumen.estadoEstudiante && (
                      <span className={`resumen-estado resumen-estado-${resumen.estadoEstudiante?.toLowerCase()}`}>
                        {resumen.estadoEstudiante}
                      </span>
                    )}
                  </div>
                  <div className="resumen-grid">
                    <div>
                      <span className="resumen-label">Créditos máximo</span>
                      <strong className="resumen-value">{resumen.creditos?.maximo ?? "-"}</strong>
                    </div>
                    <div>
                      <span className="resumen-label">Créditos inscritos</span>
                      <strong className="resumen-value">{resumen.creditos?.inscritos ?? 0}</strong>
                      {creditosSeleccionados > 0 && (
                        <span className="resumen-sub">+{creditosSeleccionados} en selección</span>
                      )}
                    </div>
                    <div>
                      <span className="resumen-label">Créditos disponibles</span>
                      <strong className="resumen-value">{creditosDisponiblesActual}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Carrito de Solicitud */}
            <div className="carrito-card">
              <h3 className="carrito-title">Solicitud de Modificación</h3>
              <p className="carrito-sub">
                {solicitudPendiente
                  ? "Espera la respuesta de tu solicitud pendiente."
                  : "Los cambios que selecciones aparecerán aquí. La solicitud será enviada al jefe de departamento."}
              </p>

              {/* Lista de cambios en la solicitud */}
              <div className="carrito-list">
                {gruposSeleccionados.size === 0 && gruposARetirar.size === 0 ? (
                  <div className="carrito-empty">
                    {solicitudPendiente 
                      ? "Espera a que tu solicitud sea procesada."
                      : "No has seleccionado ningún cambio aún."}
                  </div>
                ) : (
                  <>
                    {/* Grupos a agregar */}
                    {Array.from(gruposSeleccionados).map((gid) => {
                      const grupo = encontrarGrupoPorId(gid);
                      const asignatura = asignaturas.find((a) => a.grupos?.some((g) => g.id === gid));
                      if (!grupo || !asignatura) return null;
                      return (
                        <div key={`add-${gid}`} className="carrito-item" style={{ borderLeft: '4px solid #28a745' }}>
                          <div className="carrito-item-info">
                            <div className="carrito-item-title">
                              <span style={{ color: '#28a745', marginRight: '0.5rem' }}>➕</span>
                              {asignatura.nombre}
                            </div>
                            <div className="carrito-item-meta">{asignatura.codigo} • {asignatura.creditos} cr • Grupo {grupo.codigo}</div>
                          </div>
                          <div className="carrito-item-actions">
                            <button className="carrito-remove" onClick={() => toggleGrupo(gid, asignatura)}>
                              Quitar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Materias a retirar */}
                    {Array.from(gruposARetirar).map((historialId) => {
                      const materia = materiasMatriculadas.find(m => m.historial_id === historialId);
                      if (!materia) return null;
                      return (
                        <div key={`rem-${historialId}`} className="carrito-item" style={{ borderLeft: '4px solid #dc3545' }}>
                          <div className="carrito-item-info">
                            <div className="carrito-item-title">
                              <span style={{ color: '#dc3545', marginRight: '0.5rem' }}>➖</span>
                              {materia.nombre}
                            </div>
                            <div className="carrito-item-meta">{materia.codigo} • {materia.creditos} cr • Grupo {materia.grupo_codigo}</div>
                          </div>
                          <div className="carrito-item-actions">
                            <button className="carrito-remove" onClick={() => toggleRetirar(historialId)}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Botón de enviar solicitud */}
              {!solicitudPendiente && (gruposSeleccionados.size > 0 || gruposARetirar.size > 0) && (
                <div className="carrito-actions">
                  <button
                    className="carrito-inscribir"
                    onClick={enviarSolicitud}
                    disabled={enviandoSolicitud}
                  >
                    {enviandoSolicitud ? (
                      <>
                        <FaSpinner className="spinner-small" /> Enviando...
                      </>
                    ) : (
                      `Enviar solicitud (${gruposSeleccionados.size + gruposARetirar.size} cambios)`
                    )}
                  </button>
                  <p style={{ fontSize: '0.8rem', color: '#666', textAlign: 'center', marginTop: '0.5rem' }}>
                    Los cambios serán aplicados cuando el jefe los apruebe
                  </p>
                </div>
              )}
            </div>

            <h2>Materias Matriculadas</h2>
            <div className="asignaturas-list">
              {materiasMatriculadas.length === 0 ? (
                <div className="asignaturas-empty">
                  <p>No tienes materias matriculadas en este periodo.</p>
                </div>
              ) : (
                materiasMatriculadas.map((materia) => {
                  const marcadaParaRetirar = gruposARetirar.has(materia.historial_id);
                  
                  return (
                    <div 
                      key={materia.historial_id} 
                      className={`asignatura-item ${marcadaParaRetirar ? 'marcada-retirar' : ''}`}
                      style={marcadaParaRetirar ? { opacity: 0.6, backgroundColor: '#ffebee' } : {}}
                    >
                      <div className="asignatura-header">
                        <div className="asignatura-info">
                          <h3>{materia.nombre}</h3>
                          <div className="asignatura-meta">
                            <span className="asignatura-codigo">{materia.codigo}</span>
                            <span className="asignatura-creditos">{materia.creditos} créditos</span>
                          </div>
                        </div>
                      </div>
                      <div className="grupos-list">
                        <div className="grupo-item seleccionado">
                          <div className="grupo-content">
                            <div className="grupo-header">
                              <span className="grupo-codigo">{materia.grupo_codigo}</span>
                              <span className="grupo-docente">{materia.docente}</span>
                            </div>
                            <div className="grupo-horario">
                              {materia.horarios?.map((hor, idx) => (
                                <span key={idx} className="horario-badge">
                                  {etiquetaComponente(hor.componente)} {hor.dia.substring(0, 3)} {formatearHora(hor.hora_inicio)}-{formatearHora(hor.hora_fin)} {hor.salon}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {materia.puede_retirar && !solicitudPendiente && (
                        <button
                          className={`btn-retirar ${marcadaParaRetirar ? 'cancelar' : ''}`}
                          onClick={() => toggleRetirar(materia.historial_id, materia.grupo_id)}
                          style={marcadaParaRetirar ? { backgroundColor: '#6c757d' } : {}}
                        >
                          {marcadaParaRetirar ? 'Cancelar retiro' : 'Marcar para retirar'}
                        </button>
                      )}
                      
                      {!materia.puede_retirar && (
                        <div className="grupo-obligatorio-text">
                          No se puede retirar (materia atrasada o perdida)
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <h2 style={{ marginTop: '2rem' }}>Asignaturas Disponibles</h2>
            {paginacionAsignaturas.total_pages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <button
                  className="btn-retirar"
                  onClick={() => setAsignaturasPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!paginacionAsignaturas.has_prev}
                >
                  Anterior
                </button>
                <span>
                  Página {paginacionAsignaturas.page} de {paginacionAsignaturas.total_pages}
                </span>
                <button
                  className="btn-retirar"
                  onClick={() => setAsignaturasPage((prev) => prev + 1)}
                  disabled={!paginacionAsignaturas.has_next}
                >
                  Siguiente
                </button>
              </div>
            )}
            <div className="asignaturas-list">
              {asignaturasConGrupos.length === 0 ? (
                <div className="asignaturas-empty">
                  <p>No hay asignaturas disponibles para agregar en este momento.</p>
                </div>
              ) : (
                asignaturasConGrupos.map((asignatura) => {
                  const estadoClass = asignatura.estado ? `estado-${asignatura.estado}` : "";
                  const esCursada = asignatura.estado === "cursada";
                  return (
                    <div key={asignatura.id} className={`asignatura-item ${estadoClass}`}>
                      <div className="asignatura-header">
                        <div className="asignatura-info">
                          <h3>{asignatura.nombre}</h3>
                          <div className="asignatura-meta">
                            <span className="asignatura-codigo">{asignatura.codigo}</span>
                            <span className="asignatura-creditos">{asignatura.creditos} créditos</span>
                            {asignatura.categoria === 'nucleo_comun' && (
                              <>
                                <span className="asignatura-badge-obligatoria" style={{ backgroundColor: '#4ECDC4' }}>
                                  Núcleo Común
                                </span>
                                {asignatura.programas_disponibles && asignatura.programas_disponibles.length > 0 && (
                                  <div className="programas-disponibles" style={{ marginTop: '8px', fontSize: '0.9em', color: '#666' }}>
                                    <strong>Carreras disponibles:</strong> {asignatura.programas_disponibles.map(p => p.nombre).join(', ')}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <span className="asignatura-state">{formatEstado(asignatura.estado)}</span>
                      </div>

                      <div className="grupos-list">
                          {asignatura.grupos.map((grupo) => {
                            const estaSeleccionado = gruposSeleccionados.has(grupo.id);
                            const tieneConflicto = conflictos.has(grupo.id);
                            const cupoMaximo = Math.max(grupo.cupo_max || 0, 0);
                            const cupoDisponibleReal = Math.max(grupo.cupo_disponible || 0, 0);
                            const cupoDisponibleSeguro = Math.min(cupoDisponibleReal, cupoMaximo);
                            const sinCupo = cupoDisponibleSeguro <= 0;

                            return (
                              <div
                                key={grupo.id}
                                className={`grupo-item ${estaSeleccionado ? "seleccionado" : ""} ${tieneConflicto ? "conflicto" : ""} ${sinCupo ? "sin-cupo" : ""}`}
                              >
                                <label className="grupo-checkbox-label">
                                  <input
                                    type="checkbox"
                                    checked={estaSeleccionado}
                                    disabled={esCursada || sinCupo}
                                    onChange={() => toggleGrupo(grupo.id, asignatura)}
                                    className="grupo-checkbox"
                                  />
                                  <div className="grupo-content">
                                    <div className="grupo-header">
                                      <span className="grupo-codigo">{grupo.codigo}</span>
                                      <span className={`grupo-cupo-pill ${sinCupo ? 'agotado' : cupoDisponibleSeguro <= 3 ? 'pocos' : 'ok'}`}>
                                        {cupoDisponibleSeguro} disponibles de {cupoMaximo}
                                      </span>
                                    </div>
                                    <div className="grupo-cupo-meta">
                                      Ocupación: {Math.max(cupoMaximo - cupoDisponibleSeguro, 0)} de {cupoMaximo}
                                    </div>
                                    {grupo.programa_nombre && (
                                      <div className="grupo-programa" style={{ fontSize: '0.85em', color: '#4ECDC4', fontWeight: 'bold', marginBottom: '4px' }}>
                                        📚 {grupo.programa_nombre}
                                      </div>
                                    )}
                                    <div className="grupo-docente">{grupo.docente}</div>
                                    <div className="grupo-horario">
                                      {grupo.horarios?.map((hor, idx) => (
                                        <span key={idx} className="horario-badge">
                                          {etiquetaComponente(hor.componente)} {hor.dia.substring(0, 3)} {formatearHora(hor.hora_inicio)}-{formatearHora(hor.hora_fin)} {hor.salon}
                                        </span>
                                      ))}
                                    </div>
                                    {sinCupo && (
                                      <div className="grupo-sin-cupo-text">
                                        Sin cupo disponible
                                      </div>
                                    )}
                                    {tieneConflicto && (
                                      <div className="grupo-conflicto-text">
                                        Conflicto de horario
                                      </div>
                                    )}
                                  </div>
                                </label>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {gruposSeleccionados.size > 0 && (
              <div className="inscribir-actions">
                <button
                  className="btn-inscribir"
                  onClick={async () => {
                    try {
                      await matriculaService.agregarMateriaModificaciones(Array.from(gruposSeleccionados));
                      setGruposSeleccionados(new Set());
                      setCreditosSeleccionados(0);
                      openDialog(
                        "Materia agregada",
                        "La(s) materia(s) han sido agregadas correctamente.",
                        () => validarYcargar(),
                      );
                    } catch (error) {
                      const razon = getErrorReason(error, "Error al agregar la materia. Por favor, intenta nuevamente.");
                      openDialog("No se pudo agregar", razon);
                    }
                  }}
                >
                  Agregar {gruposSeleccionados.size} {gruposSeleccionados.size === 1 ? "grupo" : "grupos"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {renderHistorialModal()}
      {dialog && (
        <div className="dialog-overlay" role="presentation">
          <div className="dialog-card">
            <p className="dialog-title">{dialog.title}</p>
            <p className="dialog-body">{dialog.body}</p>
            <button className="dialog-close" onClick={closeDialog}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModificarMatricula;

