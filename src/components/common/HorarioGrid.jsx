import React from 'react';

function formatearHora(h) {
  if (!h) return '';
  const [hh, mm] = h.split(':');
  return `${hh}:${mm || '00'}`;
}

function timeToMinutes(value) {
  if (!value) return 0;
  const parts = value.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function horaInicioDe(hor) {
  return parseInt(hor.hora_inicio.split(':')[0], 10);
}

function bloqueEmpiezaEnHora(hor, hora) {
  return horaInicioDe(hor) === hora;
}

function bloqueOcupaHora(hor, hora) {
  const ini = timeToMinutes(hor.hora_inicio);
  const fin = timeToMinutes(hor.hora_fin);
  const slotIni = hora * 60;
  const slotFin = (hora + 1) * 60;
  return ini < slotFin && fin > slotIni;
}

function celdaReservadaPorBloqueLargo(entries, dia, hora) {
  return entries.some((entry) =>
    (entry.horarios || []).some((hor) => {
      if (hor.dia !== dia) return false;
      return horaInicioDe(hor) < hora && bloqueOcupaHora(hor, hora);
    })
  );
}

function obtenerPosicionHorario(horaInicio, horaFin) {
  const ini = timeToMinutes(horaInicio);
  const fin = timeToMinutes(horaFin);
  const dur = Math.max(fin - ini, 30);
  const offsetDentroHora = ini % 60;
  return { duracionMinutos: dur, offsetDentroHora };
}

function calcularAlturaFila(hora, entries) {
  let max = 60;
  entries.forEach((entry) => {
    (entry.horarios || []).forEach((hor) => {
      if (bloqueEmpiezaEnHora(hor, hora)) {
        const pos = obtenerPosicionHorario(hor.hora_inicio, hor.hora_fin);
        max = Math.max(max, pos.duracionMinutos + pos.offsetDentroHora + 10);
      }
    });
  });
  return max;
}

function tituloBloque(entry) {
  return entry.asignatura || entry.asignatura_nombre || entry.nombre || entry.codigo || '';
}

export default function HorarioGrid({
  entries = [],
  diasSemana = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'],
  horas = Array.from({ length: 16 }, (_, i) => 7 + i),
  showHorario = true,
  hideEmptyHours = false,
  obtenerColorAsignatura = () => '#6b7280',
  obtenerColorEntrada = null,
}) {
  if (!showHorario) {
    return <div className="horario-collapsed">Horario oculto. Pulsa "Mostrar horario" para expandir.</div>;
  }

  const normalized = entries.map((e) => {
    if (e.horarios && Array.isArray(e.horarios)) return e;
    if (e.dia && e.hora_inicio && e.hora_fin) {
      return {
        asignatura: e.asignatura || e.asignatura_nombre || e.nombre || e.codigo,
        codigo: e.asignatura_codigo || e.codigo,
        grupoCodigo: e.grupo_codigo || e.grupoCodigo,
        docente: e.docente,
        horarios: [{ dia: e.dia, hora_inicio: e.hora_inicio, hora_fin: e.hora_fin, salon: e.salon }],
        cambio: e.cambio,
        color: e.color,
      };
    }
    return e;
  });

  const horaTieneAsignatura = (hora) =>
    normalized.some((entry) => (entry.horarios || []).some((hor) => bloqueOcupaHora(hor, hora)));

  const visibleHoras = hideEmptyHours ? horas.filter(horaTieneAsignatura) : horas;
  if (visibleHoras.length === 0) {
    return <div className="horario-empty-message">Aún no hay clases para mostrar en este horario.</div>;
  }

  return (
    <>
      <div className="horario-header">
        <div className="horario-time-col">Hora</div>
        {diasSemana.map((dia) => (
          <div key={dia} className="horario-day-col">{dia.substring(0, 3)}</div>
        ))}
      </div>
      <div className="horario-body">
        {visibleHoras.map((hora) => {
          const alturaFila = calcularAlturaFila(hora, normalized);
          return (
            <div key={hora} className="horario-row" style={{ minHeight: `${alturaFila}px` }}>
              <div className="horario-time-cell">{hora}:00</div>
              {diasSemana.map((dia) => {
                const reservada = celdaReservadaPorBloqueLargo(normalized, dia, hora);
                const bloques = [];
                normalized.forEach((entry, entryIdx) => {
                  (entry.horarios || []).forEach((hor, horIdx) => {
                    if (hor.dia === dia && bloqueEmpiezaEnHora(hor, hora)) {
                      bloques.push({ entry, hor, key: `${entryIdx}-${horIdx}-${hor.hora_inicio}` });
                    }
                  });
                });

                return (
                  <div
                    key={`${hora}-${dia}`}
                    className={`horario-cell${reservada && bloques.length === 0 ? ' horario-cell--continuacion' : ''}`}
                    style={{ minHeight: `${alturaFila}px` }}
                  >
                    {bloques.map(({ entry, hor, key }, idx) => {
                      const pos = obtenerPosicionHorario(hor.hora_inicio, hor.hora_fin);
                      const bloqueAltura = Math.max(pos.duracionMinutos - 2, 36);
                      const bloqueTop = 4 + Math.min(pos.offsetDentroHora, 20);
                      const blockColor =
                        entry.color ??
                        (typeof obtenerColorEntrada === 'function' ? obtenerColorEntrada(entry) : null) ??
                        (entry.cambio === 'mantener' ? null : obtenerColorAsignatura(entry.codigo));
                      const blockClass = [
                        'horario-block',
                        entry.cambio ? `horario-block--${entry.cambio}` : '',
                        bloques.length > 1 ? 'horario-block--apilado' : '',
                      ]
                        .filter(Boolean)
                        .join(' ');

                      return (
                        <div
                          key={key}
                          className={blockClass}
                          style={{
                            ...(blockColor ? { backgroundColor: blockColor } : {}),
                            height: `${bloqueAltura}px`,
                            top: `${bloqueTop + idx * 4}px`,
                            ...(bloques.length > 1
                              ? {
                                  width: `calc(${100 / bloques.length}% - 6px)`,
                                  left: `calc(${(100 / bloques.length) * idx}% + 2px)`,
                                  right: 'auto',
                                }
                              : {}),
                          }}
                          title={`${tituloBloque(entry)} (${entry.grupoCodigo || entry.grupo_codigo || ''})\n${formatearHora(hor.hora_inicio)} – ${formatearHora(hor.hora_fin)}`}
                        >
                          <div className="horario-block-content">
                            <div className="horario-block-title">{tituloBloque(entry)}</div>
                            <div className="horario-block-subtitle">
                              {entry.grupoCodigo || entry.grupo_codigo || ''}
                            </div>
                            <div className="horario-block-time">
                              {formatearHora(hor.hora_inicio)} – {formatearHora(hor.hora_fin)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}
