// SIGMA-UDC — Sistema Integral de Gestión de Matrícula Académica
// Copyright (c) 2025 Andrés Javier Quintana Alape, Gustavo Calderón Kelsey,
// Isaac David Paternina Noble, Harry Perez Perea, Camilo Rodríguez Garay,
// José Félix Bustamante Soto y Juan Felipe Eraso Navarro.
// Todos los derechos reservados.

import api, { authorizedURL } from './api';

const documentosService = {
    // Obtener documentos del estudiante autenticado.
    async getDocumentosEstudiante() {
        const response = await api.get('/api/documentos');
        return response.data;
    },

    // Subir un documento (certificado EPS o comprobante de matrícula).
    async subirDocumento(tipoDocumento, archivo) {
        const formData = new FormData();
        formData.append("tipo_documento", tipoDocumento);
        formData.append("archivo", archivo);

        // Para FormData, axios establece automáticamente Content-Type: multipart/form-data.
        // El interceptor de api agrega la cabecera Authorization.
        const response = await api.post('/api/documentos', formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },

    // Obtener documentos por programa (para la jefatura).
    async getDocumentosPorPrograma(params = {}) {
        const response = await api.get('/api/documentos/programa', { params });
        return response.data;
    },

    // Revisar documento (aprobar/rechazar con observación) — jefatura.
    async revisarDocumento(documentoId, estado, observacion) {
        const response = await api.put(
            `/api/documentos/${documentoId}/revisar`, {
                estado,
                observacion,
            }
        );
        return response.data;
    },

    // Construir URL autorizada del archivo almacenado en el backend.
    getArchivoURL: (archivoURL) => authorizedURL(archivoURL),
};

export default documentosService;