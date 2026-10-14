// SIGMA-UDC — Sistema Integral de Gestión de Matrícula Académica
// Copyright (c) 2025 Andrés Javier Quintana Alape, Gustavo Calderón Kelsey,
// Isaac David Paternina Noble, Harry Perez Perea, Camilo Rodríguez Garay,
// José Félix Bustamante Soto y Juan Felipe Eraso Navarro.
// Todos los derechos reservados.

// Servicio de autenticación y manejo de sesión.
// La instancia HTTP y los interceptores viven en ./api.js.
import api from './api';

const LAST_ACTIVITY_KEY = 'lastActivityAt';

export const authService = {
    // Inicio de sesión con código institucional y contraseña.
    async login(codigo, password) {
        const response = await api.post('/auth/login', { codigo, password });
        return response.data;
    },

    // Establecer contraseña (primer inicio de sesión del usuario).
    async setPassword(userId, codigo, email, newPassword) {
        const response = await api.post('/auth/set-password', {
            userId,
            codigo,
            email,
            newPassword,
        });
        return response.data;
    },

    // Obtener datos del usuario autenticado.
    async getCurrentUser() {
        const response = await api.get('/api/me');
        return response.data;
    },

    // Guardar token de sesión.
    saveToken(token) {
        localStorage.setItem('token', token);
        this.touchActivity();
    },

    // Obtener token de sesión.
    getToken() {
        return localStorage.getItem('token');
    },

    // Guardar datos del usuario autenticado.
    saveUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },

    // Obtener datos del usuario autenticado.
    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    // Cerrar sesión.
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem(LAST_ACTIVITY_KEY);
    },

    // Indica si existe una sesión activa.
    isAuthenticated() {
        return !!this.getToken();
    },

    // Registra el momento de la última actividad del usuario.
    touchActivity() {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    },

    // Retorna el momento de la última actividad registrada, o null.
    getLastActivity() {
        const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
        const parsed = raw ? Number(raw) : NaN;
        return Number.isFinite(parsed) ? parsed : null;
    },
};

export default api;