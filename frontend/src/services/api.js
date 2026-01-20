import axios from 'axios';

// Asegúrate de que este puerto coincida con tu backend (3000, 4000, etc.)
const API_URL = 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor para agregar el token automáticamente a cada petición
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;

// --- SERVICIOS UNIFICADOS ---

export const usuarioService = {
    // Obtener todos los usuarios
    getAll: () => api.get('/usuarios'),
    
    // Crear un usuario nuevo
    create: (data) => api.post('/usuarios', data),
    
    // Editar usuario existente (NECESARIO PARA QUE FUNCIONE EL LÁPIZ)
    update: (id, data) => api.put(`/usuarios/${id}`, data),
    
    // Cambiar estado (Activo/Inactivo)
    // Nota: Usamos PUT aquí, pero si tu backend espera PATCH, cámbialo a api.patch
    updateEstado: (id, estado) => api.put(`/usuarios/${id}/estado`, { estado }),
    
    // Eliminar usuario
    delete: (id) => api.delete(`/usuarios/${id}`),
};