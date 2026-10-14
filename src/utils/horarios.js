// SIGMA-UDC — Sistema Integral de Gestión de Matrícula Académica
// Copyright (c) 2025 Andrés Javier Quintana Alape, Gustavo Calderón Kelsey,
// Isaac David Paternina Noble, Harry Perez Perea, Camilo Rodríguez Garay,
// José Félix Bustamante Soto y Juan Felipe Eraso Navarro.
// Todos los derechos reservados.

// Utilidades de horario compartidas por los módulos de inscripción
// y modificación de matrícula.

// Indica si dos rangos horarios "HH:MM"-"HH:MM" se solapan.
export const haySolapamiento = (inicio1, fin1, inicio2, fin2) => {
  const [h1, m1] = inicio1.split(":").map(Number);
  const [h2, m2] = fin1.split(":").map(Number);
  const [h3, m3] = inicio2.split(":").map(Number);
  const [h4, m4] = fin2.split(":").map(Number);
  const inicio1Min = h1 * 60 + m1;
  const fin1Min = h2 * 60 + m2;
  const inicio2Min = h3 * 60 + m3;
  const fin2Min = h4 * 60 + m4;
  return !(fin1Min <= inicio2Min || fin2Min <= inicio1Min);
};

// Indica si dos listas de bloques de horario contienen algún cruce
// en el mismo día y con rangos solapados.
export const horariosSeCruzan = (horariosA = [], horariosB = []) => {
  for (const a of horariosA) {
    for (const b of horariosB) {
      if (
        a.dia === b.dia &&
        haySolapamiento(a.hora_inicio, a.hora_fin, b.hora_inicio, b.hora_fin)
      ) {
        return true;
      }
    }
  }
  return false;
};
