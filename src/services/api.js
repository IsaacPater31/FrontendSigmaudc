// SIGMA-UDC — Sistema Integral de Gestión de Matrícula Académica
// Copyright (c) 2025 Andrés Javier Quintana Alape, Gustavo Calderón Kelsey,
// Isaac David Paternina Noble, Harry Perez Perea, Camilo Rodríguez Garay,
// José Félix Bustamante Soto y Juan Felipe Eraso Navarro.
// Todos los derechos reservados.

// Cliente HTTP único de la aplicación.
// Todas las peticiones al backend deben realizarse a través de esta instancia
// para garantizar una configuración e interceptores consistentes.
import axios from 'axios';

// La URL del API se configura en el archivo .env (VITE_API_URL).
export const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('VITE_API_URL no está configurada. Revisa el archivo .env del frontend.');
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Extrae un mensaje legible para el usuario desde un error de Axios.
const extractApiErrorMessage = (error) => {
  if (error?.response?.data) {
    const data = error.response.data;
    if (typeof data === 'string') return data;
    if (typeof data?.message === 'string' && data.message.trim()) return data.message;
    if (typeof data?.error === 'string' && data.error.trim()) return data.error;
    if (typeof data?.razon === 'string' && data.razon.trim()) return data.razon;
  }
  if (typeof error?.message === 'string' && error.message.trim()) return error.message;
  return 'Ocurrió un error inesperado';
};

// Adjunta el token JWT a todas las peticiones salientes.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Normaliza errores: ante un 401 fuera de los endpoints de autenticación,
// la sesión se considera inválida y se redirige al inicio de sesión.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login') &&
      !error.config?.url?.includes('/auth/set-password')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    error.userMessage = extractApiErrorMessage(error);
    return Promise.reject(error);
  }
);

// Construye una URL absoluta del backend con el token JWT como parámetro
// de consulta. Se usa para recursos que no pueden enviar la cabecera
// Authorization fácilmente (archivos estáticos protegidos, EventSource/SSE).
export const authorizedURL = (path) => {
  const token = localStorage.getItem('token');
  const base = `${API_URL}${path}`;
  if (!token) return base;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}token=${encodeURIComponent(token)}`;
};

export default api;
