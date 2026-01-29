import { 
    Container, Title, Text, Card, Table, Button, Group, Badge, Modal,
    TextInput, Select, Stack, ActionIcon, Tooltip, Center, Loader,
    Paper, SimpleGrid, NumberInput, Alert, Divider, Tabs, ScrollArea,
    Grid, Textarea, Pagination, ThemeIcon, Box, Menu, Checkbox
} from '@mantine/core';
import { 
    IconSearch, IconFilter, IconRefresh, IconEye,
    IconDownload, IconPrinter, IconCalendar, IconUser,
    IconShoppingCart, IconChartBar, IconTrendingUp,
    IconCash, IconUsers, IconPackage, IconCheck,
    IconX, IconChevronRight, IconListDetails, 
    IconFileInvoice, IconBuildingStore, IconId,
    IconPhone, IconMail, IconMapPin, IconReceipt
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { getCurrentUser } from '../services/auth';
import api from '../services/api';
import statsService from '../services/statsService';
import { DatePickerInput } from '@mantine/dates';
import PdfService from '../services/pdfService';

const GestionVentas = () => {
    const user = getCurrentUser();
    const isAdmin = ['administrador', 'super_admin'].includes(user?.rol);
    
    const [loading, setLoading] = useState(true);
    const [ventas, setVentas] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [filtros, setFiltros] = useState({
        periodo: 'mes',
        fechaInicio: null,
        fechaFin: null,
        vendedorId: undefined, // Cambia null por undefined
        estado: 'todos',
        metodoPago: 'todos'
    });
    
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0
    });

    // Cargar datos iniciales
    const cargarDatos = async () => {
        let url = `/carrito/ventas?periodo=${filtros.periodo}`;
        if (filtros.vendedorId && filtros.vendedorId !== 'todos') {
            url += `&vendedor_id=${filtros.vendedorId}`;
        }
        
        console.log('🌐 URL solicitada:', url);
        console.log('🔑 Token de usuario:', user?.token ? 'Presente' : 'Ausente');
        
        const response = await api.get(url);
        console.log('✅ Respuesta:', response);
        
        setVentas(response.data || []);
        setPagination(prev => ({ ...prev, total: response.data?.length || 0 }));

        setLoading(true);
        try {
            // Cargar ventas con filtros
            let url = `/carrito/ventas?periodo=${filtros.periodo}`;
            if (filtros.vendedorId && filtros.vendedorId !== 'todos') {
                url += `&vendedor_id=${filtros.vendedorId}`;
            }
            
            const response = await api.get(url);
            setVentas(response.data || []);
            setPagination(prev => ({ ...prev, total: response.data?.length || 0 }));
            
            // Si es admin, cargar vendedores
            if (isAdmin) {
                const vendedoresRes = await api.get('/usuarios');
                const vendedoresFiltrados = vendedoresRes.data?.filter(u => 
                    ['vendedor', 'administrador'].includes(u.tipo_rol)
                ) || [];
                setVendedores(vendedoresFiltrados);
            }
        } catch (error) {
            console.error('Error cargando ventas:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudieron cargar las ventas',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, [filtros.periodo, filtros.vendedorId]);

    // Formatear fecha
    const formatFecha = (fecha) => {
        return new Date(fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Calcular totales
    const calcularTotales = () => {
        const ventasFiltradas = ventas.filter(venta => {
            if (filtros.estado !== 'todos' && venta.estado !== filtros.estado) return false;
            if (filtros.metodoPago !== 'todos' && venta.metodo_pago !== filtros.metodoPago) return false;
            return true;
        });
        
        return {
            cantidad: ventasFiltradas.length,
            total: ventasFiltradas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0),
            promedio: ventasFiltradas.length > 0 
                ? ventasFiltradas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0) / ventasFiltradas.length
                : 0
        };
    };

    const totales = calcularTotales();

    // Generar reporte
    const generarReporte = async () => {
        try {
            // Preparar datos para el reporte
            const datosReporte = {
                periodo: filtros.periodo,
                vendedor: filtros.vendedorId 
                    ? vendedores.find(v => v.id_usuario === parseInt(filtros.vendedorId))?.nombre
                    : 'Todos',
                fecha_generacion: new Date().toISOString(),
                ventas: ventas.map(v => ({
                    id_pedido: v.id_pedido,
                    fecha: v.fecha,
                    cliente_nombre: v.cliente_nombre,
                    vendedor_nombre: v.vendedor_nombre,
                    total: parseFloat(v.total || 0),
                    metodo_pago: v.metodo_pago,
                    estado: v.estado
                })),
                totales: {
                    total: totales.total,
                    promedio: totales.promedio
                }
            };
            
            // Llamar a la función del PdfService
            PdfService.generarReporteVentas(datosReporte);
            
            notifications.show({
                title: 'Reporte generado',
                message: 'El reporte de ventas se ha descargado',
                color: 'green'
            });
        } catch (error) {
            console.error('Error generando reporte:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudo generar el reporte',
                color: 'red'
            });
        }
    };

    return (
        <Container size="xl" py="xl">
            {/* Encabezado */}
            <Group justify="space-between" mb="lg">
                <div>
                    <Title order={2}>Gestión de Ventas</Title>
                    <Text c="dimmed">
                        {isAdmin ? 'Monitoreo de ventas de la empresa' : 'Mis ventas realizadas'}
                    </Text>
                </div>
                
                <Group>
                    <Button 
                        leftSection={<IconDownload size={18} />}
                        variant="light"
                        onClick={generarReporte}
                    >
                        Exportar Reporte
                    </Button>
                    <Button 
                        leftSection={<IconShoppingCart size={18} />}
                        onClick={() => window.open('/ventas', '_blank')}
                        color="green"
                    >
                        Nueva Venta
                    </Button>
                </Group>
            </Group>

            {/* Tarjetas de resumen */}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="lg">
                <Card withBorder radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Ventas Totales</Text>
                            <Title order={3}>{totales.cantidad}</Title>
                        </div>
                        <ThemeIcon color="blue" variant="light" size="lg">
                            <IconShoppingCart size={22} />
                        </ThemeIcon>
                    </Group>
                </Card>
                
                <Card withBorder radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Ingresos</Text>
                            <Title order={3} c="green">
                                Bs {totales.total.toFixed(2)}
                            </Title>
                        </div>
                        <ThemeIcon color="green" variant="light" size="lg">
                            <IconCash size={22} />
                        </ThemeIcon>
                    </Group>
                </Card>
                
                <Card withBorder radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Promedio por Venta</Text>
                            <Title order={3}>
                                Bs {totales.promedio.toFixed(2)}
                            </Title>
                        </div>
                        <ThemeIcon color="violet" variant="light" size="lg">
                            <IconChartBar size={22} />
                        </ThemeIcon>
                    </Group>
                </Card>
                
                <Card withBorder radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Clientes Atendidos</Text>
                            <Title order={3}>
                                {new Set(ventas.map(v => v.cliente_id)).size}
                            </Title>
                        </div>
                        <ThemeIcon color="teal" variant="light" size="lg">
                            <IconUsers size={22} />
                        </ThemeIcon>
                    </Group>
                </Card>
            </SimpleGrid>

            {/* Filtros */}
            <Card withBorder radius="md" mb="lg">
                <Group justify="space-between" mb="md">
                    <Text fw={700}>Filtros de Búsqueda</Text>
                    <Button 
                        variant="light" 
                        leftSection={<IconRefresh size={16} />}
                        onClick={cargarDatos}
                        loading={loading}
                        size="xs"
                    >
                        Actualizar
                    </Button>
                </Group>
                
                <Grid>
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Select
                            label="Período"
                            value={filtros.periodo}
                            onChange={(val) => setFiltros({...filtros, periodo: val})}
                            data={[
                                { value: 'hoy', label: 'Hoy' },
                                { value: 'semana', label: 'Esta semana' },
                                { value: 'mes', label: 'Este mes' },
                                { value: 'anio', label: 'Este año' },
                                { value: 'todos', label: 'Todos' }
                            ]}
                            leftSection={<IconCalendar size={16} />}
                        />
                    </Grid.Col>
                    
                    {isAdmin && (
                        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                            <Select
                                label="Vendedor"
                                value={filtros.vendedorId || null} // Usa null en lugar de undefined
                                onChange={(val) => setFiltros({...filtros, vendedorId: val || undefined})}
                                data={[
                                    { value: 'todos', label: 'Todos los vendedores' }, // Cambia null por string
                                    ...vendedores.map(v => ({
                                        value: String(v.id_usuario), // Asegura que sea string
                                        label: `${v.nombre} ${v.apellido}`
                                    }))
                                ]}
                                clearable
                                leftSection={<IconUser size={16} />}
                                placeholder="Selecciona vendedor"
                            />
                        </Grid.Col>
                    )}
                    
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Select
                            label="Estado"
                            value={filtros.estado}
                            onChange={(val) => setFiltros({...filtros, estado: val})}
                            data={[
                                { value: 'todos', label: 'Todos los estados' },
                                { value: 'completado', label: 'Completado' },
                                { value: 'pendiente', label: 'Pendiente' },
                                { value: 'cancelado', label: 'Cancelado' }
                            ]}
                            leftSection={<IconCheck size={16} />}
                        />
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Select
                            label="Método de Pago"
                            value={filtros.metodoPago}
                            onChange={(val) => setFiltros({...filtros, metodoPago: val})}
                            data={[
                                { value: 'todos', label: 'Todos los métodos' },
                                { value: 'efectivo', label: 'Efectivo' },
                                { value: 'tarjeta', label: 'Tarjeta' },
                                { value: 'transferencia', label: 'Transferencia' },
                                { value: 'qr', label: 'QR' }
                            ]}
                            leftSection={<IconCash size={16} />}
                        />
                    </Grid.Col>
                </Grid>
            </Card>

            {/* Tabla de ventas */}
            <Card withBorder radius="md">
                {loading ? (
                    <Center py={100}>
                        <Loader size="lg" />
                    </Center>
                ) : (
                    <>
                        <ScrollArea>
                            <Table striped highlightOnHover>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>ID</Table.Th>
                                        <Table.Th>Fecha</Table.Th>
                                        <Table.Th>Cliente</Table.Th>
                                        {isAdmin && <Table.Th>Vendedor</Table.Th>}
                                        <Table.Th ta="right">Total</Table.Th>
                                        <Table.Th>Método</Table.Th>
                                        <Table.Th>Estado</Table.Th>
                                        <Table.Th>Acciones</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {ventas.length > 0 ? (
                                        ventas
                                            .slice((pagination.page - 1) * pagination.limit, pagination.page * pagination.limit)
                                            .map((venta) => (
                                                <Table.Tr key={venta.id_pedido}>
                                                    <Table.Td>
                                                        <Text size="xs" c="dimmed">#{venta.id_pedido}</Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="sm">{formatFecha(venta.fecha)}</Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="sm">{venta.cliente_nombre || 'Cliente no registrado'}</Text>
                                                        {venta.cliente_id && (
                                                            <Text size="xs" c="dimmed">ID: {venta.cliente_id}</Text>
                                                        )}
                                                    </Table.Td>
                                                    {isAdmin && (
                                                        <Table.Td>
                                                            <Text size="sm">{venta.vendedor_nombre || 'No asignado'}</Text>
                                                        </Table.Td>
                                                    )}
                                                    <Table.Td ta="right">
                                                        <Text fw={600} c="green">
                                                            Bs {parseFloat(venta.total || 0).toFixed(2)}
                                                        </Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge variant="light" color="blue">
                                                            {venta.metodo_pago || 'efectivo'}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge 
                                                            color={
                                                                venta.estado === 'completado' ? 'green' :
                                                                venta.estado === 'pendiente' ? 'yellow' : 'red'
                                                            }
                                                            variant="light"
                                                        >
                                                            {venta.estado || 'completado'}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Group gap="xs">
                                                            <Tooltip label="Ver detalles">
                                                                <ActionIcon 
                                                                    variant="subtle" 
                                                                    color="blue"
                                                                    onClick={() => {
                                                                        // Abrir modal con detalles
                                                                        notifications.show({
                                                                            title: `Detalles Venta #${venta.id_pedido}`,
                                                                            message: `Cliente: ${venta.cliente_nombre} | Total: Bs ${venta.total}`,
                                                                            color: 'blue'
                                                                        });
                                                                    }}
                                                                >
                                                                    <IconEye size={16} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                            <Tooltip label="Generar comprobante">
                                                                <ActionIcon 
                                                                    variant="subtle" 
                                                                    color="green"
                                                                    onClick={() => {
                                                                        // Asegurar que tenemos datos básicos
                                                                        const datosVenta = {
                                                                            pedido_id: venta.id_pedido,
                                                                            fecha: venta.fecha,
                                                                            cliente_nombre: venta.cliente_nombre,
                                                                            total: parseFloat(venta.total || 0),
                                                                            metodo_pago: venta.metodo_pago || 'efectivo',
                                                                            productos: [
                                                                                {
                                                                                    nombre: `Venta #${venta.id_pedido}`,
                                                                                    cantidad: venta.total_items || 1,
                                                                                    precio_unitario: parseFloat(venta.total || 0) / (venta.total_items || 1),
                                                                                    subtotal: parseFloat(venta.total || 0)
                                                                                }
                                                                            ]
                                                                        };
                                                                        
                                                                        PdfService.generarComprobanteVenta(datosVenta);
                                                                    }}
                                                                >
                                                                    <IconReceipt size={16} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                        </Group>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))
                                    ) : (
                                        <Table.Tr>
                                            <Table.Td colSpan={isAdmin ? 8 : 7}>
                                                <Center py={40}>
                                                    <Stack align="center" gap="sm">
                                                        <IconShoppingCart size={48} color="gray" />
                                                        <Text c="dimmed">No hay ventas registradas</Text>
                                                        <Button 
                                                            variant="light"
                                                            onClick={() => window.open('/ventas', '_blank')}
                                                        >
                                                            Realizar primera venta
                                                        </Button>
                                                    </Stack>
                                                </Center>
                                            </Table.Td>
                                        </Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea>
                        
                        {ventas.length > 0 && (
                            <Group justify="space-between" mt="md">
                                <Text size="sm" c="dimmed">
                                    Mostrando {Math.min(pagination.limit, ventas.length)} de {ventas.length} ventas
                                </Text>
                                <Pagination 
                                    value={pagination.page}
                                    onChange={(page) => setPagination({...pagination, page})}
                                    total={Math.ceil(ventas.length / pagination.limit)}
                                    size="sm"
                                />
                            </Group>
                        )}
                    </>
                )}
            </Card>
        </Container>
    );
};

export default GestionVentas;