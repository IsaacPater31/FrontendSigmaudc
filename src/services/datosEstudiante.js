// SIGMA-UDC — Sistema Integral de Gestión de Matrícula Académica
// Copyright (c) 2025 Andrés Javier Quintana Alape, Gustavo Calderón Kelsey,
// Isaac David Paternina Noble, Harry Perez Perea, Camilo Rodríguez Garay,
// José Félix Bustamante Soto y Juan Felipe Eraso Navarro.
// Todos los derechos reservados.

import api, { authorizedURL } from "./api";

const datosEstudianteService = {
    // Obtener datos personales del estudiante autenticado.
    async getPerfil() {
        const response = await api.get("/api/estudiante/datos");
        return response.data;
    },

    // Actualizar datos personales del estudiante.
    async updatePerfil(payload) {
        const response = await api.put("/api/estudiante/datos", payload);
        return response.data;
    },

    // Subir foto de perfil del estudiante.
    async uploadFoto(foto) {
        const formData = new FormData();
        formData.append("foto", foto);
        const response = await api.post("/api/estudiante/foto", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },

    // Construir URL autorizada de la foto de perfil almacenada en el backend.
    getFotoURL(path) {
        if (!path) return "";
        if (path.startsWith("http")) {
            return path;
        }
        return authorizedURL(path);
    },
};

export default datosEstudianteService;