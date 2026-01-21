import api from './api';

const clientePublicoService = {
    // Registro de cliente público
    registrar: (data) => api.post('/clientes-publico/registrar', data),
    
    // Login de cliente público
    login: (data) => api.post('/clientes-publico/login', data),
    
    // Verificar token
    verifyToken: () => api.get('/clientes-publico/verify'),
    
    // Obtener microempresas activas
    getMicroempresas: () => api.get('/clientes-publico/microempresas'),
    
    // Registrar visita
    registrarVisita: (data) => api.post('/clientes-publico/visita', data),
    
    // Obtener historial de visitas
    getHistorialVisitas: (clienteId) => api.get(`/clientes-publico/${clienteId}/historial`),
    
    // Actualizar perfil
    actualizarPerfil: (clienteId, data) => api.put(`/clientes-publico/${clienteId}/perfil`, data),
    
    // Solicitar reset de contraseña
    solicitarResetPassword: (email) => api.post('/clientes-publico/solicitar-reset', { email }),
    
    // Guardar token en localStorage
    setToken: (token) => {
        localStorage.setItem('cliente_token', token);
    },
    
    // Obtener token
    getToken: () => {
        return localStorage.getItem('cliente_token');
    },
    
    // Remover token (logout)
    removeToken: () => {
        localStorage.removeItem('cliente_token');
        localStorage.removeItem('cliente_data');
    },
    
    // Guardar datos del cliente
    setClienteData: (data) => {
        localStorage.setItem('cliente_data', JSON.stringify(data));
    },
    
    // Obtener datos del cliente
    getClienteData: () => {
        const data = localStorage.getItem('cliente_data');
        return data ? JSON.parse(data) : null;
    },
    
    // Verificar si hay sesión activa
    isAuthenticated: () => {
        return !!localStorage.getItem('cliente_token');
    }
};

export default clientePublicoService;