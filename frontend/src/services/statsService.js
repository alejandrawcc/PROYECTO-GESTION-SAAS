import api from './api';

const statsService = {
    // Obtener estadísticas del dashboard
    getDashboardStats: async (periodo = 'mes') => {
        try {
            const response = await api.get(`/stats/dashboard?periodo=${periodo}`);
            return response.data;
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            throw error;
        }
    },

    // Obtener ventas por vendedor
    getVentasPorVendedor: async (periodo = 'mes', vendedorId = null) => {
        try {
            let url = `/stats/ventas-vendedor?periodo=${periodo}`;
            if (vendedorId) {
                url += `&vendedor_id=${vendedorId}`;
            }
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('Error obteniendo ventas por vendedor:', error);
            throw error;
        }
    },

    // Generar reporte PDF
    generarReporteVentas: async (data) => {
        try {
            const response = await api.post('/stats/generar-reporte', data, {
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error('Error generando reporte:', error);
            throw error;
        }
    }
};

export default statsService;