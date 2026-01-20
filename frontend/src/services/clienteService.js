import axios from 'axios';

const API_URL = 'http://localhost:3000/api/clientes';

// Configuramos el token automáticamente para todas las peticiones de este servicio
const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const clienteService = {
    // PUNTO 3: Buscar activos de la microempresa
    getClientes: () => axios.get(`${API_URL}/`, getAuthHeaders()),
    
    // PUNTO 1: Registrar cliente
    createCliente: (data) => axios.post(`${API_URL}/`, data, getAuthHeaders()),
    
    // PUNTO 2: Modificar datos
    updateCliente: (id, data) => axios.put(`${API_URL}/${id}`, data, getAuthHeaders()),
    
    // PUNTO 4: Eliminar lógico
    deleteCliente: (id) => axios.delete(`${API_URL}/${id}`, getAuthHeaders()),
    
    // PUNTO 5: Mostrar eliminados
    getEliminados: () => axios.get(`${API_URL}/eliminados`, getAuthHeaders())
};