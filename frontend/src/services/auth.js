import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const login = async (email, password) => {
    try {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.usuario));
        }
        return response.data;
    } catch (error) {
        console.error('Error en login:', error);
        throw error;
    }
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

// CORRECCIÓN: Manejo robusto de errores de parsing
export const getCurrentUser = () => {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr || userStr === "undefined") return null;
        return JSON.parse(userStr);
    } catch (error) {
        console.error("Error al obtener usuario:", error);
        return null;
    }
};

export default api;