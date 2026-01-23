import { 
    Container, Title, Text, Card, Table, Button, Group, Badge, 
    Modal, Stack, ActionIcon, Tooltip, Center, Loader, Paper,
    SimpleGrid, Tabs, ScrollArea, Grid, TextInput, Select,
    Pagination, ThemeIcon, Accordion, Avatar, Alert
} from '@mantine/core';
import { 
    IconReceipt, IconSearch, IconFilter, IconCalendar, 
    IconPackage, IconCash, IconEye, IconDownload,
    IconRefresh, IconListDetails, IconShoppingCart,
    IconBuildingStore, IconUser, IconCheck, IconX,
    IconArrowRight, IconFileInvoice, IconPrinter, IconHistory
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import clientePublicoService from '../services/clientePublicoService';
import PdfService from '../services/pdfService';
import api from '../services/api';

const HistorialPedidos = () => {
    const navigate = useNavigate();
    const [cliente, setCliente] = useState(null);
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detallePedido, setDetallePedido] = useState(null);
    const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
    const [paginaActual, setPaginaActual] = useState(1);
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [filtroFecha, setFiltroFecha] = useState('todos');
    const itemsPorPagina = 10;

    // Cargar datos del cliente y pedidos
    useEffect(() => {
        verificarClienteYCargarPedidos();
    }, []);

    const verificarClienteYCargarPedidos = async () => {
        try {
            setLoading(true);
            
            // Verificar si el cliente está autenticado
            const token = clientePublicoService.getToken();
            if (!token) {
                notifications.show({
                    title: 'Acceso requerido',
                    message: 'Debes iniciar sesión para ver tu historial',
                    color: 'yellow'
                });
                navigate('/');
                return;
            }

            // Obtener datos del cliente
            const response = await clientePublicoService.verifyToken();
            if (response.data.valid) {
                setCliente(response.data.cliente);
                await cargarPedidos(response.data.cliente.id);
            } else {
                clientePublicoService.removeToken();
                navigate('/');
            }
        } catch (error) {
            console.error('Error verificando cliente:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudo cargar tu historial',
                color: 'red'
            });
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const cargarPedidos = async (clienteId) => {
        try {
            // Aquí deberías crear un endpoint en el backend para obtener pedidos por cliente
            // Por ahora, uso una simulación
            const response = await api.get(`/carrito/pedidos-cliente/${clienteId}`);
            setPedidos(response.data || []);
        } catch (error) {
            console.error('Error cargando pedidos:', error);
            // Para desarrollo, creo datos de ejemplo
            setPedidos(generarPedidosEjemplo());
        }
    };

    // Función temporal para generar datos de ejemplo
    const generarPedidosEjemplo = () => {
        const empresas = [
            { id: 1, nombre: 'Tienda Ropa Infantil' },
            { id: 2, nombre: 'Bazar Familiar' },
            { id: 3, nombre: 'Supermercado Express' }
        ];

        const productosEjemplo = [
            { nombre: 'Pijama infantil', cantidad: 2, precio: 45.00 },
            { nombre: 'Juego de sábanas', cantidad: 1, precio: 120.00 },
            { nombre: 'Toallas', cantidad: 3, precio: 35.00 },
            { nombre: 'Zapatos niño', cantidad: 1, precio: 85.00 }
        ];

        return Array.from({ length: 15 }, (_, i) => ({
            id_pedido: 1000 + i,
            fecha: new Date(Date.now() - i * 86400000).toISOString(), // Últimos 15 días
            total: (Math.random() * 500 + 50).toFixed(2),
            estado: i % 5 === 0 ? 'pendiente' : i % 5 === 1 ? 'cancelado' : 'completado',
            metodo_pago: ['efectivo', 'tarjeta', 'transferencia'][i % 3],
            empresa_id: empresas[i % 3].id,
            empresa_nombre: empresas[i % 3].nombre,
            productos: productosEjemplo.slice(0, (i % 4) + 1).map((p, idx) => ({
                ...p,
                subtotal: p.cantidad * p.precio
            }))
        }));
    };

    // Filtrar pedidos
    const pedidosFiltrados = pedidos.filter(pedido => {
        const matchEstado = filtroEstado === 'todos' || pedido.estado === filtroEstado;
        const matchBusqueda = busqueda ? 
            pedido.empresa_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            pedido.id_pedido.toString().includes(busqueda) : true;
        
        if (filtroFecha === 'hoy') {
            const hoy = new Date().toDateString();
            const fechaPedido = new Date(pedido.fecha).toDateString();
            return matchEstado && matchBusqueda && (hoy === fechaPedido);
        }
        
        if (filtroFecha === 'semana') {
            const semanaPasada = new Date(Date.now() - 7 * 86400000);
            const fechaPedido = new Date(pedido.fecha);
            return matchEstado && matchBusqueda && (fechaPedido > semanaPasada);
        }
        
        if (filtroFecha === 'mes') {
            const mesPasado = new Date(Date.now() - 30 * 86400000);
            const fechaPedido = new Date(pedido.fecha);
            return matchEstado && matchBusqueda && (fechaPedido > mesPasado);
        }
        
        return matchEstado && matchBusqueda;
    });

    // Paginación
    const totalPaginas = Math.ceil(pedidosFiltrados.length / itemsPorPagina);
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    const pedidosPaginados = pedidosFiltrados.slice(inicio, fin);

    // Ver detalles del pedido
    const verDetallesPedido = (pedido) => {
        setDetallePedido(pedido);
        setModalDetalleOpen(true);
    };

    // Generar comprobante
    const generarComprobante = async (pedido) => {
        try {
            const ventaData = {
                pedido_id: pedido.id_pedido,
                fecha: pedido.fecha,
                cliente_nombre: cliente?.nombre || 'Cliente',
                cliente_ci: cliente?.ci,
                cliente_email: cliente?.email,
                cliente_telefono: cliente?.telefono,
                empresa_nombre: pedido.empresa_nombre,
                productos: pedido.productos || [],
                total: parseFloat(pedido.total),
                metodo_pago: pedido.metodo_pago,
                estado: pedido.estado
            };

            await PdfService.generarComprobanteVenta(ventaData);
            
            notifications.show({
                title: 'Comprobante generado',
                message: `Comprobante #${pedido.id_pedido} descargado`,
                color: 'green',
                icon: <IconDownload size={16} />
            });
        } catch (error) {
            console.error('Error generando comprobante:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudo generar el comprobante',
                color: 'red'
            });
        }
    };

    // Calcular estadísticas
    const calcularEstadisticas = () => {
        const totalPedidos = pedidos.length;
        const completados = pedidos.filter(p => p.estado === 'completado').length;
        const pendientes = pedidos.filter(p => p.estado === 'pendiente').length;
        const cancelados = pedidos.filter(p => p.estado === 'cancelado').length;
        const totalGastado = pedidos
            .filter(p => p.estado === 'completado')
            .reduce((sum, p) => sum + parseFloat(p.total), 0)
            .toFixed(2);

        return { totalPedidos, completados, pendientes, cancelados, totalGastado };
    };

    const estadisticas = calcularEstadisticas();

    if (loading) {
        return (
            <Center mih="100vh">
                <Loader size="lg" />
            </Center>
        );
    }

    return (
        <Container size="xl" py="xl">
            {/* Header */}
            <Group justify="space-between" mb="xl">
                <div>
                    <Title order={2}>Mi Historial de Compras</Title>
                    <Text c="dimmed">
                        {cliente?.nombre ? `Bienvenido ${cliente.nombre}` : 'Tus compras realizadas'}
                    </Text>
                </div>
                <Badge size="lg" variant="filled" color="blue">
                    {cliente?.ci ? `CI: ${cliente.ci}` : 'Cliente registrado'}
                </Badge>
            </Group>

            {/* Tarjetas de estadísticas */}
            <SimpleGrid cols={4} mb="lg">
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Total Compras</Text>
                            <Text fw={700} size="xl">{estadisticas.totalPedidos}</Text>
                        </div>
                        <ThemeIcon color="blue" variant="light" size="lg">
                            <IconShoppingCart size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>
                
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Completadas</Text>
                            <Text fw={700} size="xl" c="green">{estadisticas.completados}</Text>
                        </div>
                        <ThemeIcon color="green" variant="light" size="lg">
                            <IconCheck size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>
                
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Pendientes</Text>
                            <Text fw={700} size="xl" c="orange">{estadisticas.pendientes}</Text>
                        </div>
                        <ThemeIcon color="orange" variant="light" size="lg">
                            <IconHistory size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>
                
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Total Gastado</Text>
                            <Text fw={700} size="xl" c="green">Bs {estadisticas.totalGastado}</Text>
                        </div>
                        <ThemeIcon color="teal" variant="light" size="lg">
                            <IconCash size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>
            </SimpleGrid>

            {/* Filtros y búsqueda */}
            <Card withBorder radius="md" mb="lg">
                <Grid gutter="md">
                    <Grid.Col span={{ base: 12, md: 4 }}>
                        <TextInput
                            placeholder="Buscar por empresa o ID..."
                            leftSection={<IconSearch size={16} />}
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </Grid.Col>
                    <Grid.Col span={{ base: 6, md: 3 }}>
                        <Select
                            placeholder="Filtrar por estado"
                            leftSection={<IconFilter size={16} />}
                            data={[
                                { value: 'todos', label: 'Todos los estados' },
                                { value: 'completado', label: 'Completados' },
                                { value: 'pendiente', label: 'Pendientes' },
                                { value: 'cancelado', label: 'Cancelados' }
                            ]}
                            value={filtroEstado}
                            onChange={setFiltroEstado}
                        />
                    </Grid.Col>
                    <Grid.Col span={{ base: 6, md: 3 }}>
                        <Select
                            placeholder="Filtrar por fecha"
                            leftSection={<IconCalendar size={16} />}
                            data={[
                                { value: 'todos', label: 'Todas las fechas' },
                                { value: 'hoy', label: 'Hoy' },
                                { value: 'semana', label: 'Esta semana' },
                                { value: 'mes', label: 'Este mes' }
                            ]}
                            value={filtroFecha}
                            onChange={setFiltroFecha}
                        />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 2 }}>
                        <Button 
                            variant="light" 
                            leftSection={<IconRefresh size={16} />}
                            onClick={() => verificarClienteYCargarPedidos()}
                            fullWidth
                        >
                            Actualizar
                        </Button>
                    </Grid.Col>
                </Grid>
            </Card>

            {/* Lista de pedidos */}
            <Card shadow="sm" padding={0} radius="md" withBorder>
                <ScrollArea>
                    <Table verticalSpacing="md" highlightOnHover>
                        <Table.Thead bg="gray.1">
                            <Table.Tr>
                                <Table.Th>ID Pedido</Table.Th>
                                <Table.Th>Fecha</Table.Th>
                                <Table.Th>Empresa</Table.Th>
                                <Table.Th>Total</Table.Th>
                                <Table.Th>Estado</Table.Th>
                                <Table.Th>Pago</Table.Th>
                                <Table.Th>Acciones</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {pedidosPaginados.map((pedido) => (
                                <Table.Tr key={pedido.id_pedido}>
                                    <Table.Td>
                                        <Text fw={600}>#{pedido.id_pedido}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm">
                                            {new Date(pedido.fecha).toLocaleDateString()}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            {new Date(pedido.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <IconBuildingStore size={14} color="blue" />
                                            <Text size="sm">{pedido.empresa_nombre}</Text>
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text fw={600} c="green">
                                            Bs {parseFloat(pedido.total).toFixed(2)}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge 
                                            color={
                                                pedido.estado === 'completado' ? 'green' :
                                                pedido.estado === 'pendiente' ? 'yellow' : 'red'
                                            }
                                            variant="light"
                                        >
                                            {pedido.estado?.toUpperCase()}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge variant="outline" size="sm">
                                            {pedido.metodo_pago}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <Tooltip label="Ver detalles">
                                                <ActionIcon 
                                                    variant="subtle" 
                                                    color="blue"
                                                    onClick={() => verDetallesPedido(pedido)}
                                                >
                                                    <IconEye size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                            <Tooltip label="Descargar comprobante">
                                                <ActionIcon 
                                                    variant="subtle" 
                                                    color="green"
                                                    onClick={() => generarComprobante(pedido)}
                                                    disabled={pedido.estado !== 'completado'}
                                                >
                                                    <IconDownload size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                            <Tooltip label="Volver a comprar">
                                                <ActionIcon 
                                                    variant="subtle" 
                                                    color="orange"
                                                    onClick={() => navigate(`/portal/${pedido.empresa_id}`)}
                                                >
                                                    <IconArrowRight size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>

                {/* Sin resultados */}
                {!loading && pedidosPaginados.length === 0 && (
                    <Center py={40}>
                        <Stack align="center">
                            <IconPackage size={48} color="gray" />
                            <Text c="dimmed">No hay pedidos registrados</Text>
                            <Button 
                                variant="light" 
                                onClick={() => navigate('/')}
                            >
                                Explorar microempresas
                            </Button>
                        </Stack>
                    </Center>
                )}

                {/* Paginación */}
                {totalPaginas > 1 && (
                    <Group justify="center" p="md">
                        <Pagination 
                            value={paginaActual} 
                            onChange={setPaginaActual} 
                            total={totalPaginas}
                            withEdges
                        />
                    </Group>
                )}
            </Card>

            {/* Modal de detalles del pedido */}
            <Modal 
                opened={modalDetalleOpen} 
                onClose={() => setModalDetalleOpen(false)}
                title={`Detalles del Pedido #${detallePedido?.id_pedido}`}
                size="lg"
            >
                {detallePedido && (
                    <Stack gap="md">
                        {/* Resumen */}
                        <Paper withBorder p="md" radius="md">
                            <SimpleGrid cols={2}>
                                <Stack gap="xs">
                                    <Text size="sm" fw={500}>Fecha:</Text>
                                    <Text>
                                        {new Date(detallePedido.fecha).toLocaleString()}
                                    </Text>
                                </Stack>
                                <Stack gap="xs">
                                    <Text size="sm" fw={500}>Estado:</Text>
                                    <Badge 
                                        color={
                                            detallePedido.estado === 'completado' ? 'green' :
                                            detallePedido.estado === 'pendiente' ? 'yellow' : 'red'
                                        }
                                    >
                                        {detallePedido.estado?.toUpperCase()}
                                    </Badge>
                                </Stack>
                                <Stack gap="xs">
                                    <Text size="sm" fw={500}>Empresa:</Text>
                                    <Text>{detallePedido.empresa_nombre}</Text>
                                </Stack>
                                <Stack gap="xs">
                                    <Text size="sm" fw={500}>Método de pago:</Text>
                                    <Text>{detallePedido.metodo_pago}</Text>
                                </Stack>
                            </SimpleGrid>
                        </Paper>

                        {/* Productos */}
                        <Paper withBorder p="md" radius="md">
                            <Text fw={600} mb="md">Productos comprados:</Text>
                            <Table>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Producto</Table.Th>
                                        <Table.Th>Cantidad</Table.Th>
                                        <Table.Th>Precio</Table.Th>
                                        <Table.Th>Subtotal</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {detallePedido.productos?.map((producto, index) => (
                                        <Table.Tr key={index}>
                                            <Table.Td>{producto.nombre}</Table.Td>
                                            <Table.Td>{producto.cantidad}</Table.Td>
                                            <Table.Td>Bs {producto.precio?.toFixed(2)}</Table.Td>
                                            <Table.Td>Bs {(producto.cantidad * producto.precio)?.toFixed(2)}</Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </Paper>

                        {/* Total */}
                        <Group justify="space-between">
                            <Text fw={700} size="lg">Total:</Text>
                            <Title order={3} c="green">
                                Bs {parseFloat(detallePedido.total).toFixed(2)}
                            </Title>
                        </Group>

                        {/* Botones de acción */}
                        <Group justify="flex-end" mt="md">
                            <Button 
                                variant="light" 
                                onClick={() => setModalDetalleOpen(false)}
                            >
                                Cerrar
                            </Button>
                            {detallePedido.estado === 'completado' && (
                                <Button 
                                    leftSection={<IconFileInvoice size={16} />}
                                    onClick={() => {
                                        generarComprobante(detallePedido);
                                        setModalDetalleOpen(false);
                                    }}
                                    color="green"
                                >
                                    Descargar Comprobante
                                </Button>
                            )}
                        </Group>
                    </Stack>
                )}
            </Modal>
        </Container>
    );
};

export default HistorialPedidos;