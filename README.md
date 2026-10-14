# SIGMA-UDC — Frontend

Interfaz de usuario del **Sistema Integral de Gestión de Matrícula Académica (SIGMA-UDC)**, desarrollada con React 19 y Vite. Consume la API REST del backend SIGMA-UDC y ofrece los módulos de estudiante y de jefatura departamental.

## Autores

- Andrés Javier Quintana Alape
- Gustavo Calderón Kelsey
- Isaac David Paternina Noble
- Harry Perez Perea
- Camilo Rodríguez Garay
- José Félix Bustamante Soto
- Juan Felipe Eraso Navarro

## Características

- Autenticación con JWT y protección de rutas por rol (`estudiante`, `jefe_departamental`).
- Cierre de sesión por inactividad con aviso previo.
- Módulo de estudiante: datos personales, pensum, subida de documentos, inscripción de asignaturas, consulta de matrícula y solicitudes de modificación.
- Módulo de jefatura: plazos, verificación de documentos, consulta de matrícula de estudiantes, validación de solicitudes y plan de estudio.
- Actualización en tiempo real mediante Server-Sent Events (SSE) para cupos y solicitudes.
- Vista previa de horario con detección de cruces entre asignaturas.

## Requisitos

- Node.js 20 o superior y npm.
- Backend SIGMA-UDC en ejecución (por defecto en `http://localhost:8080`).

## Configuración

Crear un archivo `.env` en la raíz del proyecto a partir de `.env.example`:

```bash
VITE_API_URL=http://localhost:8080
```

`VITE_API_URL` es obligatoria: el cliente HTTP central (`src/services/api.js`) no define una URL alternativa.

## Comandos

```bash
npm install      # instalar dependencias
npm run dev      # servidor de desarrollo (Vite)
npm run build    # compilación de producción en dist/
npm run lint     # análisis estático con ESLint
npm test         # pruebas unitarias (runner nativo de Node, node:test)
npm run preview  # vista previa local del build de producción
```

## Estructura del proyecto

```
src/
├── components/       Componentes reutilizables (sidebar, pensum, subida de documentos)
├── pages/            Vistas por rol (estudiante/, jefe/) y pantallas públicas
├── services/         Cliente HTTP compartido (api.js) y servicios de dominio
├── styles/           Hojas de estilo por módulo
├── utils/            Utilidades compartidas (horarios, etc.)
├── App.jsx           Enrutado principal y control de sesión
└── main.jsx          Punto de entrada
```

## Despliegue

El proyecto está preparado para despliegue en Vercel (incluye `@vercel/analytics`). Para cualquier hosting estático:

1. Definir `VITE_API_URL` apuntando al backend desplegado.
2. Ejecutar `npm run build` y publicar el directorio `dist/`.
3. Configurar reescritura de rutas hacia `index.html` (SPA fallback).

## Licencia

Software propietario. Copyright (c) 2025 Andrés Javier Quintana Alape, Gustavo Calderón Kelsey, Isaac David Paternina Noble, Harry Perez Perea, Camilo Rodríguez Garay, José Félix Bustamante Soto y Juan Felipe Eraso Navarro. Todos los derechos reservados. Consulte el archivo `LICENSE`.
