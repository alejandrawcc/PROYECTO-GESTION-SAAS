import api from './api';

export const passwordService = {
    // Solicitar reset de contraseña
    forgotPassword: (email) => 
        api.post('/password/forgot-password', { email }),
    
    // Verificar token
    verifyResetToken: (token) => 
        api.get(`/password/verify-reset-token/${token}`),
    
    // Resetear contraseña
    resetPassword: (token, password) => 
        api.post('/password/reset-password', { token, password })
};