// SIGMA-UDC — Sistema Integral de Gestión de Matrícula Académica
// Copyright (c) 2025 Andrés Javier Quintana Alape, Gustavo Calderón Kelsey,
// Isaac David Paternina Noble, Harry Perez Perea, Camilo Rodríguez Garay,
// José Félix Bustamante Soto y Juan Felipe Eraso Navarro.
// Todos los derechos reservados.

import api from './api';

export const pensumService = {
  // Obtener pensum completo del estudiante
  async getPensumEstudiante() {
    const response = await api.get('/api/pensum');
    return response.data;
  },
  // Jefatura: listar pensums disponibles
  async listPensums() {
    const response = await api.get('/api/pensum/list');
    return response.data;
  },

  // Jefatura: obtener asignaturas de un pensum por id
  async getAsignaturasPensum(pensumId) {
    const response = await api.get(`/api/pensum/${pensumId}/asignaturas`);
    return response.data;
  },

  // Jefatura: obtener grupos de un pensum por id (con info de asignatura y horarios)
  async getGruposPensum(pensumId) {
    const response = await api.get(`/api/pensum/${pensumId}/grupos`);
    return response.data;
  },
};

