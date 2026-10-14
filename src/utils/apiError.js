// SIGMA-UDC — Sistema Integral de Gestión de Matrícula Académica
// Copyright (c) 2025 Andrés Javier Quintana Alape, Gustavo Calderón Kelsey,
// Isaac David Paternina Noble, Harry Perez Perea, Camilo Rodríguez Garay,
// José Félix Bustamante Soto y Juan Felipe Eraso Navarro.
// Todos los derechos reservados.

export const getApiErrorMessage = (error, fallback = "Ocurrió un error inesperado") => {
    if (typeof error?.userMessage === "string" && error.userMessage.trim()) {
        return error.userMessage;
    }

    const data = error?.response?.data;
    if (typeof data === "string" && data.trim()) {
        return data;
    }
    if (typeof data?.message === "string" && data.message.trim()) {
        return data.message;
    }
    if (typeof data?.error === "string" && data.error.trim()) {
        return data.error;
    }
    if (typeof data?.razon === "string" && data.razon.trim()) {
        return data.razon;
    }

    if (typeof error?.message === "string" && error.message.trim()) {
        return error.message;
    }

    return fallback;
};