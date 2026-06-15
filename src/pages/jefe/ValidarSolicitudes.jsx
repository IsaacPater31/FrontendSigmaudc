import React, { useState, useEffect, useCallback } from "react";
import { matriculaService } from "../../services/matricula";
import HorarioGrid from "../../components/common/HorarioGrid";
import "../../styles/ValidarSolicitudes.css";
import "../../styles/InscribirAsignaturas.css";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaClipboardList,
  FaUser,
  FaPlus,
  FaMinus,
  FaExclamationTriangle,
  FaClock,
  FaExchangeAlt,
  FaGraduationCap,
} from "react-icons/fa";

const DIAS_SEMANA = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
const HORAS = Array.from({ length: 14 }, (_, i) => 7 + i);
const PALETA = ["#2563eb", "#16a34a", "#dc2626", "#9333ea", "#ea580c", "#0891b2", "#be185d", "#4f46e5"];

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

const obtenerColorAsignatura = (codigo) => {
  if (!codigo) return PALETA[0];
  let hash = 0;
  for (let i = 0; i < codigo.length; i++) {
    hash = codigo.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETA[Math.abs(hash) % PALETA.length];
};

const materiasAHorarioEntries = (materias) =>
  (materias || []).map((m) => ({
    asignatura: m.nombre,
    codigo: m.codigo,
    grupoCodigo: m.grupo_codigo,
    docente: m.docente,
    horarios: m.horarios || [],
  }));

const etiquetaComponente = (componente) => (componente === "laboratorio" ? "Lab" : "Teo");

const formatearHora = (hora) => {
  if (!hora) return "";
  const [hh, mm] = hora.split(":");
  return `${hh}:${mm || "00"}`;
};

const ValidarSolicitudes = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 25,
    total_items: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  });

  useEffect(() => {
    loadSolicitudes();
  }, [filtroEstado, page]);

  useEffect(() => {
    const unsubscribe = matriculaService.subscribeModificacionesEvents({
      onMessage: (event) => {
        if (event?.event_type === "solicitud_actualizada" || event?.event_type === "cupos_actualizados") {
          if (page !== 1) {
            setPage(1);
          } else {
            loadSolicitudes();
          }
        }
      },
    });

    return () => unsubscribe();
  }, [filtroEstado, page]);

  const loadSolicitudes = async () => {
    try {
      setLoading(true);
      const response = await matriculaService.getSolicitudesPorPrograma({
        estado: filtroEstado === "todos" ? undefined : filtroEstado,
        page,
        page_size: 25,
      });
      if (Array.isArray(response)) {
        setSolicitudes(response || []);
        setPagination({
          page: 1,
          page_size: response.length,
          total_items: response.length,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        });
      } else {
        setSolicitudes(response?.items || []);
        setPagination(response?.pagination || {
          page: 1,
          page_size: 25,
          total_items: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false,
        });
      }
      setError(null);
    } catch (err) {
      console.error("Error loading solicitudes:", err);
      setError(err.response?.data?.error || "Error al cargar solicitudes");
    } finally {
      setLoading(false);
    }
  };

  const handleValidar = async (solicitudId, estado, observacion) => {
    try {
      setProcesando((prev) => ({ ...prev, [solicitudId]: true }));
      setError(null);
      setSuccess(null);

      await matriculaService.validarSolicitud(solicitudId, estado, observacion);
      const nowISO = new Date().toISOString();

      // Actualización local inmediata para evitar recargar la página.
      setSolicitudes((prev) =>
        prev.map((sol) =>
          sol.id === solicitudId
            ? {
                ...sol,
                estado,
                observacion: estado === "rechazada" ? observacion : "",
                fecha_revision: nowISO,
              }
            : sol
        )
      );

      setSuccess(
        `Solicitud ${estado === "aprobada" ? "aprobada" : "rechazada"} exitosamente`
      );

      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error validando solicitud:", err);
      setError(err.response?.data?.error || "Error al validar solicitud");
    } finally {
      setProcesando((prev) => ({ ...prev, [solicitudId]: false }));
    }
  };

  const solicitudesFiltradas = solicitudes;

  // Agrupar solicitudes por estudiante
  const solicitudesPorEstudiante = {};
  solicitudesFiltradas.forEach((sol) => {
    const key = `${sol.estudiante_codigo || sol.estudiante_id}`;
    if (!solicitudesPorEstudiante[key]) {
      solicitudesPorEstudiante[key] = {
        estudiante: {
          codigo: sol.estudiante_codigo || `ID: ${sol.estudiante_id}`,
          nombre: sol.estudiante_nombre || "Sin nombre",
          apellido: sol.estudiante_apellido || "",
        },
        solicitudes: [],
      };
    }
    solicitudesPorEstudiante[key].solicitudes.push(sol);
  });

  if (loading) {
    return (
      <div className="validar-solicitudes-container">
        <div className="loading-container">
          <FaSpinner className="spinner" />
          <p>Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="validar-solicitudes-container">
      <div className="validar-header">
        <div className="header-logo-title">
          <div className="udc-logo-container">
            <img 
              src="/logo-udc.png" 
              alt="Logo Universidad" 
              className="udc-logo"
            />
          </div>
          <div>
            <h1 className="page-title">Validar Solicitudes de Modificación</h1>
            <p className="page-subtitle">
              Revisa cómo quedaría la matrícula del estudiante antes de aprobar o rechazar cada solicitud
            </p>
          </div>
        </div>

        {/* Filtro de estado */}
        <div className="filtros">
          <label className="filtro-label">Filtrar por estado:</label>
          <select
            className="filtro-select"
            value={filtroEstado}
            onChange={(e) => {
              setFiltroEstado(e.target.value);
              setPage(1);
            }}
          >
            <option value="todos">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobada">Aprobadas</option>
            <option value="rechazada">Rechazadas</option>
          </select>
        </div>
      </div>

      {/* Mensajes de estado */}
      {error && (
        <div className="alert-error">
          <FaTimesCircle />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="alert-success">
          <FaCheckCircle />
          <p>{success}</p>
        </div>
      )}

      {/* Lista de solicitudes */}
      {solicitudesFiltradas.length === 0 ? (
        <div className="empty-state">
          <FaClipboardList size={48} />
          <p>No hay solicitudes para mostrar</p>
        </div>
      ) : (
        <div className="solicitudes-grid">
          {Object.values(solicitudesPorEstudiante).map((grupo, idx) => (
            <div key={idx} className="estudiante-card">
              <div className="estudiante-header">
                <div className="estudiante-info">
                  <FaUser />
                  <div>
                    <h3>
                      {grupo.estudiante.nombre} {grupo.estudiante.apellido}
                    </h3>
                    <p className="estudiante-codigo">
                      Código: {grupo.estudiante.codigo || `ID: ${grupo.solicitudes[0]?.estudiante_id || 'N/A'}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="solicitudes-list">
                {grupo.solicitudes.map((sol) => (
                  <SolicitudCard
                    key={sol.id}
                    solicitud={sol}
                    onValidar={handleValidar}
                    procesando={procesando[sol.id] || false}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {pagination.total_pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginTop: "1.25rem" }}>
          <button
            className="btn-review"
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={!pagination.has_prev || loading}
          >
            Anterior
          </button>
          <span style={{ alignSelf: "center" }}>
            Página {pagination.page} de {pagination.total_pages}
          </span>
          <button
            className="btn-review"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={!pagination.has_next || loading}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

const SolicitudCard = ({ solicitud, onValidar, procesando }) => {
  const [mostrarRevision, setMostrarRevision] = useState(false);
  const [observacion, setObservacion] = useState("");
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [errorPreview, setErrorPreview] = useState(null);
  const [horarioTab, setHorarioTab] = useState("proyectado");

  const gruposAAgregar = parseJsonArray(solicitud.grupos_agregar);
  const gruposARetirar = parseJsonArray(solicitud.grupos_retirar);

  const cargarVistaPrevia = useCallback(async () => {
    try {
      setCargandoPreview(true);
      setErrorPreview(null);
      const data = await matriculaService.getSolicitudVistaPrevia(solicitud.id);
      setVistaPrevia(data);
    } catch (err) {
      console.error("Error cargando vista previa:", err);
      setErrorPreview(
        err.response?.data?.error ||
          err.response?.data ||
          "No se pudo cargar la vista previa de la matrícula"
      );
      setVistaPrevia(null);
    } finally {
      setCargandoPreview(false);
    }
  }, [solicitud.id]);

  useEffect(() => {
    if (mostrarRevision && !vistaPrevia && !cargandoPreview && !errorPreview) {
      cargarVistaPrevia();
    }
  }, [mostrarRevision, vistaPrevia, cargandoPreview, errorPreview, cargarVistaPrevia]);

  const toggleRevision = () => {
    if (mostrarRevision) {
      setMostrarRevision(false);
      setObservacion("");
    } else {
      setMostrarRevision(true);
    }
  };

  const getEstadoBadge = () => {
    if (solicitud.estado === "aprobada") {
      return (
        <span className="badge badge-success">
          <FaCheckCircle /> Aprobada
        </span>
      );
    }
    if (solicitud.estado === "pendiente") {
      return (
        <span className="badge badge-warning">
          <FaClock /> Pendiente
        </span>
      );
    }
    if (solicitud.estado === "rechazada") {
      return (
        <span className="badge badge-error">
          <FaTimesCircle /> Rechazada
        </span>
      );
    }
    return null;
  };

  const handleAprobar = () => {
    if (vistaPrevia && !vistaPrevia.puede_aprobar) {
      const confirmar = window.confirm(
        "Esta solicitud tiene advertencias (conflictos de horario, créditos, cupos, etc.). ¿Deseas aprobarla de todas formas?"
      );
      if (!confirmar) return;
    }
    onValidar(solicitud.id, "aprobada", "");
    setMostrarRevision(false);
    setObservacion("");
    setVistaPrevia(null);
  };

  const handleRechazar = () => {
    if (!observacion.trim()) {
      alert("La observación es obligatoria al rechazar una solicitud");
      return;
    }
    onValidar(solicitud.id, "rechazada", observacion.trim());
    setMostrarRevision(false);
    setObservacion("");
    setVistaPrevia(null);
  };

  const creditos = vistaPrevia?.creditos;
  const deltaCreditos = creditos?.delta ?? 0;
  const deltaLabel =
    deltaCreditos > 0 ? `+${deltaCreditos}` : deltaCreditos === 0 ? "0" : `${deltaCreditos}`;

  return (
    <div className={`solicitud-card ${solicitud.estado}`}>
      <div className="solicitud-header">
        <div>
          <h4>Solicitud de Modificación</h4>
          <p className="solicitud-fecha">
            Enviada:{" "}
            {new Date(solicitud.fecha_solicitud).toLocaleDateString("es-ES", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        {getEstadoBadge()}
      </div>

      {/* Resumen rápido de cambios */}
      <div className="solicitud-resumen-cambios">
        {gruposAAgregar.length > 0 && (
          <span className="resumen-chip agregar">
            <FaPlus /> {gruposAAgregar.length} a agregar
          </span>
        )}
        {gruposARetirar.length > 0 && (
          <span className="resumen-chip retirar">
            <FaMinus /> {gruposARetirar.length} a retirar
          </span>
        )}
        {gruposAAgregar.length === 0 && gruposARetirar.length === 0 && (
          <span className="resumen-chip vacio">Sin cambios registrados</span>
        )}
      </div>

      {solicitud.estado === "rechazada" && solicitud.observacion && (
        <div className="observacion-box">
          <strong>Observación:</strong>{" "}
          {typeof solicitud.observacion === "string" ? solicitud.observacion : ""}
        </div>
      )}

      <div className="solicitud-actions">
        <button
          className="btn-review"
          onClick={toggleRevision}
          disabled={procesando}
        >
          {mostrarRevision ? "Ocultar detalle" : solicitud.estado === "pendiente" ? "Revisar matrícula" : "Ver detalle"}
        </button>
      </div>

      {mostrarRevision && (
        <div className="review-panel">
          {cargandoPreview && (
            <div className="preview-loading">
              <FaSpinner className="spinner-small" />
              <span>Cargando matrícula y horarios...</span>
            </div>
          )}

          {errorPreview && (
            <div className="alert-error preview-error">
              <FaExclamationTriangle />
              <p>{typeof errorPreview === "string" ? errorPreview : "Error al cargar vista previa"}</p>
              <button className="btn-review btn-sm" onClick={cargarVistaPrevia}>
                Reintentar
              </button>
            </div>
          )}

          {vistaPrevia && !cargandoPreview && (
            <>
              {/* Contexto del estudiante */}
              <div className="preview-estudiante-bar">
                <div className="preview-stat">
                  <FaGraduationCap />
                  <div>
                    <span className="preview-stat-label">Semestre</span>
                    <strong>{vistaPrevia.estudiante?.semestre ?? "—"}</strong>
                  </div>
                </div>
                <div className="preview-stat">
                  <span className="preview-stat-label">Estado</span>
                  <strong>{vistaPrevia.estudiante?.estado ?? "—"}</strong>
                </div>
                <div className="preview-stat">
                  <span className="preview-stat-label">Promedio</span>
                  <strong>
                    {vistaPrevia.estudiante?.promedio != null
                      ? Number(vistaPrevia.estudiante.promedio).toFixed(2)
                      : "—"}
                  </strong>
                </div>
                <div className="preview-stat">
                  <span className="preview-stat-label">Periodo</span>
                  <strong>
                    {vistaPrevia.periodo
                      ? `${vistaPrevia.periodo.year}-${vistaPrevia.periodo.semestre}`
                      : "—"}
                  </strong>
                </div>
              </div>

              {/* Créditos comparativos */}
              {creditos && (
                <div className="preview-creditos-card">
                  <h5>
                    <FaExchangeAlt /> Créditos
                  </h5>
                  <div className="creditos-comparacion">
                    <div className="credito-col">
                      <span className="credito-label">Máximo</span>
                      <strong>{creditos.maximo}</strong>
                    </div>
                    <div className="credito-col">
                      <span className="credito-label">Inscritos (actual)</span>
                      <strong>{creditos.inscritos_actual}</strong>
                    </div>
                    <div className="credito-col destacado">
                      <span className="credito-label">Si se aprueba</span>
                      <strong>{creditos.inscritos_proyectado}</strong>
                      <span className={`credito-delta ${deltaCreditos > 0 ? "positivo" : deltaCreditos < 0 ? "negativo" : ""}`}>
                        {deltaLabel} cr
                      </span>
                    </div>
                    <div className="credito-col">
                      <span className="credito-label">Disponibles</span>
                      <strong>{creditos.disponibles_proyectado}</strong>
                    </div>
                  </div>
                  <div className="creditos-barra">
                    <div
                      className="creditos-barra-actual"
                      style={{ width: `${Math.min((creditos.inscritos_actual / creditos.maximo) * 100, 100)}%` }}
                    />
                    <div
                      className="creditos-barra-proyectado"
                      style={{ width: `${Math.min((creditos.inscritos_proyectado / creditos.maximo) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Advertencias */}
              {vistaPrevia.advertencias?.length > 0 && (
                <div className="preview-advertencias">
                  <h5>
                    <FaExclamationTriangle /> Advertencias ({vistaPrevia.advertencias.length})
                  </h5>
                  <ul>
                    {vistaPrevia.advertencias.map((adv, i) => (
                      <li key={i}>{adv}</li>
                    ))}
                  </ul>
                </div>
              )}

              {vistaPrevia.advertencias?.length === 0 && solicitud.estado === "pendiente" && (
                <div className="preview-ok">
                  <FaCheckCircle />
                  <span>Sin conflictos detectados: la matrícula proyectada cumple las reglas básicas.</span>
                </div>
              )}

              {/* Comparación de matrículas */}
              <div className="preview-matriculas">
                <div className="matricula-col">
                  <h5>Matrícula actual ({vistaPrevia.matricula_actual?.length ?? 0})</h5>
                  <div className="matricula-lista">
                    {(vistaPrevia.matricula_actual || []).length === 0 ? (
                      <p className="matricula-vacia">Sin materias matriculadas</p>
                    ) : (
                      vistaPrevia.matricula_actual.map((m) => (
                        <div key={`actual-${m.grupo_id}`} className="matricula-fila">
                          <div className="matricula-fila-header">
                            <span className="matricula-codigo">{m.codigo}</span>
                            <span className="matricula-creditos">{m.creditos} cr</span>
                          </div>
                          <p className="matricula-nombre">{m.nombre}</p>
                          <p className="matricula-grupo">Grupo {m.grupo_codigo}</p>
                          {(m.horarios || []).length > 0 && (
                            <ul className="matricula-horarios-mini">
                              {m.horarios.map((h, hi) => (
                                <li key={hi}>
                                  {h.dia?.substring(0, 3)} {formatearHora(h.hora_inicio)}–{formatearHora(h.hora_fin)}
                                  {h.componente && (
                                    <span className="comp-badge">{etiquetaComponente(h.componente)}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="matricula-col proyectada">
                  <h5>
                    Si se aprueba ({vistaPrevia.matricula_proyectada?.length ?? 0})
                  </h5>
                  <div className="matricula-lista">
                    {(vistaPrevia.matricula_proyectada || []).length === 0 ? (
                      <p className="matricula-vacia">Quedaría sin materias matriculadas</p>
                    ) : (
                      vistaPrevia.matricula_proyectada.map((m) => (
                        <div
                          key={`proy-${m.grupo_id}-${m.cambio}`}
                          className={`matricula-fila ${m.cambio === "agregar" ? "nueva" : ""}`}
                        >
                          <div className="matricula-fila-header">
                            <span className="matricula-codigo">{m.codigo}</span>
                            <span className="matricula-creditos">{m.creditos} cr</span>
                            {m.cambio === "agregar" && (
                              <span className="cambio-badge agregar">Nueva</span>
                            )}
                          </div>
                          <p className="matricula-nombre">{m.nombre}</p>
                          <p className="matricula-grupo">
                            Grupo {m.grupo_codigo}
                            {m.docente && <span className="matricula-docente"> · {m.docente}</span>}
                          </p>
                          {(m.horarios || []).length > 0 && (
                            <ul className="matricula-horarios-mini">
                              {m.horarios.map((h, hi) => (
                                <li key={hi}>
                                  {h.dia?.substring(0, 3)} {formatearHora(h.hora_inicio)}–{formatearHora(h.hora_fin)}
                                  {h.salon && <span className="salon-mini"> · {h.salon}</span>}
                                  {h.componente && (
                                    <span className="comp-badge">{etiquetaComponente(h.componente)}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Materias que se retiran */}
              {(vistaPrevia.materias_retiradas || []).length > 0 && (
                <div className="preview-retiradas">
                  <h5>
                    <FaMinus /> Se retiran ({vistaPrevia.materias_retiradas.length})
                  </h5>
                  <div className="retiradas-chips">
                    {vistaPrevia.materias_retiradas.map((m, i) => (
                      <span key={i} className="retirada-chip">
                        {m.asignatura_codigo} · Grupo {m.grupo_codigo} · {m.creditos} cr
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Horario visual */}
              <div className="preview-horario">
                <div className="horario-tabs">
                  <button
                    type="button"
                    className={horarioTab === "actual" ? "active" : ""}
                    onClick={() => setHorarioTab("actual")}
                  >
                    Horario actual
                  </button>
                  <button
                    type="button"
                    className={horarioTab === "proyectado" ? "active" : ""}
                    onClick={() => setHorarioTab("proyectado")}
                  >
                    Horario si se aprueba
                  </button>
                </div>
                <div className="horario-grid-wrapper preview-horario-grid">
                  <HorarioGrid
                    entries={
                      horarioTab === "actual"
                        ? materiasAHorarioEntries(vistaPrevia.matricula_actual)
                        : materiasAHorarioEntries(vistaPrevia.matricula_proyectada)
                    }
                    diasSemana={DIAS_SEMANA}
                    horas={HORAS}
                    hideEmptyHours
                    obtenerColorAsignatura={obtenerColorAsignatura}
                  />
                </div>
              </div>

              {/* Acciones de validación */}
              {solicitud.estado === "pendiente" && (
                <div className="review-form">
                  <div className="review-buttons">
                    <button
                      className="btn-approve"
                      onClick={handleAprobar}
                      disabled={procesando}
                    >
                      {procesando ? (
                        <>
                          <FaSpinner className="spinner-small" /> Procesando...
                        </>
                      ) : (
                        <>
                          <FaCheckCircle /> Aprobar solicitud
                        </>
                      )}
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => {
                        if (!observacion.trim()) {
                          alert("La observación es obligatoria al rechazar");
                          return;
                        }
                        handleRechazar();
                      }}
                      disabled={procesando || !observacion.trim()}
                    >
                      {procesando ? (
                        <>
                          <FaSpinner className="spinner-small" /> Procesando...
                        </>
                      ) : (
                        <>
                          <FaTimesCircle /> Rechazar solicitud
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    className="observacion-input"
                    placeholder="Observación (obligatoria si se rechaza). Indica al estudiante el motivo de tu decisión..."
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    rows="3"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidarSolicitudes;