import { 
    Container, Title, Text, Card, SimpleGrid, Group, 
    Badge, Stack, TextInput, Select, Paper, Divider, ThemeIcon,
    Progress, Table, Button, Tabs, Grid, Center, Loader
} from '@mantine/core';
import { useState, useEffect } from 'react';
import { 
    IconBuilding, IconUsers, IconShoppingCart, IconPackage,
    IconChartBar, IconUser, IconSearch, 
    IconCalendar, IconTrendingUp, IconCash, IconReceipt,
    IconPackageExport, IconRefresh,
    IconArrowUpRight, IconArrowDownRight, IconCoin,
    IconChevronRight,
    IconShoppingBag, IconDashboard,
    IconInfoCircle,
    IconAlertCircle,
    IconX, IconBug 
} from '@tabler/icons-react';
import { getCurrentUser } from '../services/auth';
import api from '../services/api';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const user = getCurrentUser();
    const navigate = useNavigate();
    
    // Estados
    const [periodo, setPeriodo] = useState('mes');
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    
    // Cargar datos del dashboard
    const cargarDashboardData = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/stats/dashboard?periodo=${periodo}`);
            console.log("📊 Datos del dashboard:", response.data);
            
            // Si no hay datos, hacer debug
            if (!response.data.ventas.total_ventas && response.data.ventas.total_ventas !== 0) {
                console.log("⚠️ No hay datos de ventas, haciendo debug...");
                const debugResponse = await api.get('/stats/debug');
                console.log("🔍 Debug data:", debugResponse.data);
                
                // Mostrar alerta con información de debug
                notifications.show({
                    title: 'Información de Debug',
                    message: `Se encontraron ${debugResponse.data.total_pedidos} pedidos en la base de datos`,
                    color: 'blue'
                });
            }
            
            setStats(response.data);
        } catch (error) {
            console.error("❌ Error cargando datos del dashboard:", error);
            
            // Intentar obtener información de debug
            try {
                const debugResponse = await api.get('/stats/debug');
                console.log("🔍 Debug después de error:", debugResponse.data);
                
                notifications.show({
                    title: 'Error cargando estadísticas',
                    message: `Hay ${debugResponse.data.total_pedidos} pedidos en la BD. Revisa la consola para más detalles.`,
                    color: 'red'
                });
            } catch (debugError) {
                console.error("❌ Error en debug:", debugError);
            }
            
            // Establecer stats vacíos para evitar errores
            setStats({
                ventas: { total_ingresos: 0, total_ventas: 0, promedio_venta: 0, clientes_atendidos: 0 },
                compras: { total_gastos: 0, total_compras: 0 },
                inventario: { total_productos: 0, productos_bajo_stock: 0, productos_agotados: 0, stock_total: 0 },
                ventas_por_empleado: [],
                ventas_recientes: [],
                productos_mas_vendidos: [],
                evolucion_ventas: [],
                resumen: { balance: 0, rentabilidad: 0 }
            });
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        cargarDashboardData();
    }, [periodo]);

    // --- FUNCIONES DE FORMATO SEGURO ---
    
    const formatCurrency = (value) => {
        const num = parseFloat(value || 0);
        return `Bs ${num.toFixed(2)}`;
    };

    const safeParseFloat = (value, defaultValue = 0) => {
        if (value === null || value === undefined) return defaultValue;
        const num = parseFloat(value);
        return isNaN(num) ? defaultValue : num;
    };

    const safeParseInt = (value, defaultValue = 0) => {
        if (value === null || value === undefined) return defaultValue;
        const num = parseInt(value);
        return isNaN(num) ? defaultValue : num;
    };

    // --- COMPONENTES REUTILIZABLES ---

    const MetricCard = ({ title, value, subtitle, icon: Icon, color = "blue", trend, percentage }) => {
        const TrendIcon = trend === 'up' ? IconArrowUpRight : IconArrowDownRight;
        const trendColor = trend === 'up' ? 'green' : 'red';
        
        return (
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ height: '100%' }}>
                <Group justify="space-between" mb="xs" align="flex-start">
                    <div>
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">{title}</Text>
                        <Title order={2} fw={800} mt={4}>{value}</Title>
                        {subtitle && <Text size="sm" c="dimmed" mt={2}>{subtitle}</Text>}
                    </div>
                    <ThemeIcon color={color} variant="light" size="lg" radius="md">
                        <Icon size={22} stroke={1.5} />
                    </ThemeIcon>
                </Group>
                
                {percentage !== undefined && (
                    <Group justify="space-between" mt="md">
                        <Progress 
                            value={percentage} 
                            color={color} 
                            size="sm" 
                            style={{ flex: 1 }}
                        />
                        <Text size="sm" fw={600}>{percentage}%</Text>
                    </Group>
                )}
                
                {trend && (
                    <Group gap={4} mt="md">
                        <TrendIcon size={16} color={trendColor} />
                        <Text size="xs" c={trendColor}>
                            {trend === 'up' ? '↑' : '↓'} {percentage}% vs período anterior
                        </Text>
                    </Group>
                )}
            </Card>
        );
    };

    const VentasPorVendedorTable = () => {
        if (!stats?.ventas_por_empleado?.length) return null;
        
        return (
            <Card withBorder radius="md" p="md" mt="md">
                <Group justify="space-between" mb="md">
                    <Text fw={700}>Desempeño por Vendedor</Text>
                    <Badge color="blue" variant="light">
                        {periodo === 'mes' ? 'Este mes' : periodo}
                    </Badge>
                </Group>
                
                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Vendedor</Table.Th>
                            <Table.Th ta="center">Ventas</Table.Th>
                            <Table.Th ta="right">Total</Table.Th>
                            <Table.Th ta="right">Promedio</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {stats.ventas_por_empleado.map((vendedor, idx) => (
                            <Table.Tr key={vendedor.id_usuario || idx}>
                                <Table.Td>
                                    <Text fw={500}>
                                        {vendedor.nombre} {vendedor.apellido}
                                    </Text>
                                </Table.Td>
                                <Table.Td ta="center">
                                    <Badge variant="light" color="blue">
                                        {safeParseInt(vendedor.total_ventas)}
                                    </Badge>
                                </Table.Td>
                                <Table.Td ta="right">
                                    <Text fw={600} c="green">
                                        {formatCurrency(vendedor.total_ingresos)}
                                    </Text>
                                </Table.Td>
                                <Table.Td ta="right">
                                    <Text size="sm" c="dimmed">
                                        {formatCurrency(vendedor.promedio_venta)}
                                    </Text>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Card>
        );
    };

    const VentasRecientesTable = () => {
        if (!stats?.ventas_recientes?.length) return null;
        
        return (
            <Card withBorder radius="md" p="md" mt="md">
                <Group justify="space-between" mb="md">
                    <Text fw={700}>Ventas Recientes</Text>
                    <Button 
                        variant="light" 
                        size="xs"
                        onClick={() => navigate('/ventas')}
                        rightSection={<IconChevronRight size={14} />}
                    >
                        Ver todas
                    </Button>
                </Group>
                
                <Table>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>ID</Table.Th>
                            <Table.Th>Cliente</Table.Th>
                            <Table.Th ta="right">Total</Table.Th>
                            <Table.Th>Estado</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {stats.ventas_recientes.map((venta) => (
                            <Table.Tr key={venta.id_pedido}>
                                <Table.Td>
                                    <Text size="xs" c="dimmed">#{venta.id_pedido}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="sm">{venta.cliente_nombre || 'Cliente no registrado'}</Text>
                                    <Text size="xs" c="dimmed">
                                        {new Date(venta.fecha).toLocaleDateString()}
                                    </Text>
                                </Table.Td>
                                <Table.Td ta="right">
                                    <Text fw={600} c="green">
                                        {formatCurrency(venta.total)}
                                    </Text>
                                </Table.Td>
                                <Table.Td>
                                    <Badge 
                                        color={venta.estado === 'completado' ? 'green' : 'yellow'}
                                        variant="light"
                                        size="sm"
                                    >
                                        {venta.estado || 'completado'}
                                    </Badge>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Card>
        );
    };

    const ProductosMasVendidos = () => {
        if (!stats?.productos_mas_vendidos?.length) return null;
        
        return (
            <Card withBorder radius="md" p="md" mt="md">
                <Group justify="space-between" mb="md">
                    <Text fw={700}>Productos Más Vendidos</Text>
                    <Badge color="orange" variant="light">
                        Top 5
                    </Badge>
                </Group>
                
                <Stack gap="sm">
                    {stats.productos_mas_vendidos.map((producto, idx) => (
                        <Paper key={idx} p="sm" withBorder radius="md">
                            <Group justify="space-between">
                                <div>
                                    <Text fw={500}>{producto.producto_nombre}</Text>
                                    <Text size="xs" c="dimmed">
                                        {safeParseInt(producto.total_vendido)} unidades vendidas
                                    </Text>
                                </div>
                                <Text fw={600} c="green">
                                    {formatCurrency(producto.ingreso_total)}
                                </Text>
                            </Group>
                            <Progress 
                                value={stats.productos_mas_vendidos.length > 0 
                                    ? (safeParseInt(producto.total_vendido) / 
                                       Math.max(...stats.productos_mas_vendidos.map(p => safeParseInt(p.total_vendido)))) * 100 
                                    : 0}
                                color="orange"
                                size="sm"
                                mt="xs"
                            />
                        </Paper>
                    ))}
                </Stack>
            </Card>
        );
    };

    // --- DASHBOARD PARA SUPER ADMIN ---
    const renderSuperAdminDashboard = () => {
        if (loading) {
            return (
                <Center py={100}>
                    <Loader size="lg" />
                </Center>
            );
        }

        return (
            <Stack gap="md">
                {/* Barra de herramientas */}
                <Paper withBorder p="md" radius="md" shadow="sm" bg="gray.0">
                    <Group justify="space-between">
                        <div>
                            <IconDashboard size={24} color="#228be6" style={{ display: 'inline-block', marginRight: '10px', verticalAlign: 'middle' }} />
                            <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                                <Title order={3} style={{ display: 'inline-block', margin: 0 }}>Panel de Control Global</Title>
                                <Text c="dimmed" style={{ marginTop: '4px' }}>
                                    Supervisión de todas las microempresas
                                </Text>
                            </div>
                        </div>
                        
                        <Group>
                            <Select 
                                placeholder="Período"
                                leftSection={<IconCalendar size={18} />}
                                data={[
                                    { value: 'hoy', label: 'Hoy' },
                                    { value: 'semana', label: 'Esta semana' },
                                    { value: 'mes', label: 'Este mes' },
                                    { value: 'anio', label: 'Este año' },
                                    { value: 'todos', label: 'Todos' }
                                ]}
                                value={periodo}
                                onChange={setPeriodo}
                                w={150}
                            />
                            <Button 
                                variant="light" 
                                leftSection={<IconRefresh size={18} />}
                                onClick={cargarDashboardData}
                                loading={loading}
                            >
                                Actualizar
                            </Button>
                        </Group>
                    </Group>
                </Paper>

                {/* Métricas principales */}
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                    <MetricCard 
                        title="Empresas Activas"
                        value={safeParseInt(stats?.ventas?.empresas_activas, 15)}
                        subtitle="Total registradas"
                        icon={IconBuilding}
                        color="blue"
                    />
                    <MetricCard 
                        title="Ventas Totales"
                        value={formatCurrency(stats?.ventas?.total_ingresos)}
                        subtitle="Ingresos totales"
                        icon={IconShoppingCart}
                        color="green"
                    />
                    <MetricCard 
                        title="Transacciones"
                        value={safeParseInt(stats?.ventas?.total_ventas)}
                        subtitle={`Realizadas (${periodo})`}
                        icon={IconReceipt}
                        color="violet"
                    />
                    <MetricCard 
                        title="Usuarios Activos"
                        value={safeParseInt(stats?.ventas?.usuarios_activos, 84)}
                        subtitle="En sistema"
                        icon={IconUsers}
                        color="cyan"
                    />
                </SimpleGrid>
            </Stack>
        );
    };

    // --- DASHBOARD PARA ADMINISTRADOR ---
    const renderAdminDashboard = () => {
        if (loading) {
            return (
                <Center py={100}>
                    <Loader size="lg" />
                </Center>
            );
        }

        // Calcular valores seguros
        const ingresosVentas = safeParseFloat(stats?.ventas?.total_ingresos);
        const gastosCompras = safeParseFloat(stats?.compras?.total_gastos);
        const balance = ingresosVentas - gastosCompras;
        const rentabilidad = gastosCompras > 0 ? ((balance / gastosCompras) * 100) : 0;
        const clientesAtendidos = safeParseInt(stats?.ventas?.clientes_atendidos);
        const totalVentas = safeParseInt(stats?.ventas?.total_ventas);
        const totalCompras = safeParseInt(stats?.compras?.total_compras);
        const totalProductos = safeParseInt(stats?.inventario?.total_productos);
        const promedioVenta = safeParseFloat(stats?.ventas?.promedio_venta);
        const productosBajoStock = safeParseInt(stats?.inventario?.productos_bajo_stock);
        const productosAgotados = safeParseInt(stats?.inventario?.productos_agotados);
        const stockTotal = safeParseInt(stats?.inventario?.stock_total);

        return (
            <Stack gap="md">
                {/* Encabezado - CORREGIDO */}
                <Paper withBorder p="md" radius="md" shadow="sm" bg="gray.0">
                    <Group justify="space-between">
                        <div>
                            <IconDashboard size={24} color="#228be6" style={{ display: 'inline-block', marginRight: '10px', verticalAlign: 'middle' }} />
                            <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                                <Title order={3} style={{ display: 'inline-block', margin: 0 }}>Dashboard de Negocio</Title>
                                <div style={{ marginTop: '4px' }}>
                                    <Text c="dimmed" style={{ display: 'inline' }}>
                                        Métricas para <b>{user.empresa_nombre}</b>
                                    </Text>
                                    <Badge color="blue" variant="light" ml="sm" size="sm" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                                        {user.rol}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        
                        <Group>
                            <TextInput 
                                placeholder="Buscar métricas..."
                                leftSection={<IconSearch size={18} />}
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.currentTarget.value)}
                                w={200}
                            />
                            <Select 
                                placeholder="Período"
                                leftSection={<IconCalendar size={18} />}
                                data={[
                                    { value: 'hoy', label: 'Hoy' },
                                    { value: 'semana', label: 'Esta semana' },
                                    { value: 'mes', label: 'Este mes' },
                                    { value: 'anio', label: 'Este año' },
                                    { value: 'todos', label: 'Todos' }
                                ]}
                                value={periodo}
                                onChange={setPeriodo}
                                w={150}
                            />
                            <Button 
                                variant="light" 
                                leftSection={<IconRefresh size={18} />}
                                onClick={cargarDashboardData}
                                loading={loading}
                            >
                                Actualizar
                            </Button>
                        </Group>
                    </Group>
                </Paper>

                {/* Métricas principales */}
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                    <MetricCard 
                        title="Ingresos"
                        value={formatCurrency(ingresosVentas)}
                        subtitle={`Ventas (${periodo})`}
                        icon={IconTrendingUp}
                        color="green"
                        percentage={Math.min(Math.round(rentabilidad), 100)}
                    />
                    <MetricCard 
                        title="Gastos"
                        value={formatCurrency(gastosCompras)}
                        subtitle={`Compras (${periodo})`}
                        icon={IconCash}
                        color="orange"
                    />
                    <MetricCard 
                        title="Balance"
                        value={formatCurrency(balance)}
                        subtitle="Ingresos - Gastos"
                        icon={IconCoin}
                        color={balance >= 0 ? "blue" : "red"}
                    />
                    <MetricCard 
                        title="Clientes Atendidos"
                        value={clientesAtendidos}
                        subtitle={`Único (${periodo})`}
                        icon={IconUsers}
                        color="teal"
                    />
                </SimpleGrid>

                {/* Segunda fila de métricas */}
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                    <MetricCard 
                        title="Ventas Realizadas"
                        value={totalVentas}
                        subtitle={`Transacciones (${periodo})`}
                        icon={IconShoppingCart}
                        color="violet"
                    />
                    <MetricCard 
                        title="Compras"
                        value={totalCompras}
                        subtitle={`Ordenes (${periodo})`}
                        icon={IconShoppingBag}
                        color="yellow"
                    />
                    <MetricCard 
                        title="Productos en Stock"
                        value={totalProductos}
                        subtitle={`${productosBajoStock} bajo stock`}
                        icon={IconPackage}
                        color="blue"
                    />
                    <MetricCard 
                        title="Promedio Venta"
                        value={formatCurrency(promedioVenta)}
                        subtitle="Por transacción"
                        icon={IconChartBar}
                        color="cyan"
                    />
                </SimpleGrid>

                {/* Tabs para secciones */}
                <Tabs value={activeTab} onChange={setActiveTab}>
                    <Tabs.List grow mb="md">
                        <Tabs.Tab value="overview" leftSection={<IconDashboard size={16} />}>
                            Resumen
                        </Tabs.Tab>
                        <Tabs.Tab value="sales" leftSection={<IconShoppingCart size={16} />}>
                            Ventas
                        </Tabs.Tab>
                        <Tabs.Tab value="inventory" leftSection={<IconPackage size={16} />}>
                            Inventario
                        </Tabs.Tab>
                    </Tabs.List>

                    {/* Panel de Resumen */}
                    <Tabs.Panel value="overview">
                        <Grid>
                            <Grid.Col span={{ base: 12, lg: 8 }}>
                                {stats?.ventas_por_empleado?.length > 0 && <VentasPorVendedorTable />}
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, lg: 4 }}>
                                {stats?.ventas_recientes?.length > 0 && <VentasRecientesTable />}
                                {stats?.productos_mas_vendidos?.length > 0 && <ProductosMasVendidos />}
                            </Grid.Col>
                        </Grid>
                    </Tabs.Panel>

                    {/* Panel de Ventas Detalladas */}
                    <Tabs.Panel value="sales">
                        <Card withBorder radius="md" p="md">
                            <Group justify="space-between" mb="md">
                                <Text fw={700}>Gestión de Ventas por Vendedor</Text>
                                <Button 
                                    variant="light" 
                                    color="blue"
                                    onClick={() => navigate('/ventas')}
                                    rightSection={<IconChevronRight size={14} />}
                                >
                                    Ir a Módulo de Ventas
                                </Button>
                            </Group>
                            
                            <Alert color="blue" icon={<IconInfoCircle size={18} />} mb="md">
                                <Text size="sm">
                                    Monitorea el desempeño de tu equipo de ventas. Filtra por período para analizar tendencias.
                                </Text>
                            </Alert>
                            
                            {stats?.ventas_por_empleado?.length > 0 ? (
                                <VentasPorVendedorTable />
                            ) : (
                                <Center py={40}>
                                    <Stack align="center" gap="sm">
                                        <IconShoppingCart size={48} color="gray" />
                                        <Text c="dimmed">No hay datos de ventas por vendedor</Text>
                                        <Button 
                                            variant="light"
                                            onClick={() => navigate('/ventas')}
                                        >
                                            Ir a realizar ventas
                                        </Button>
                                    </Stack>
                                </Center>
                            )}
                        </Card>
                    </Tabs.Panel>

                    {/* Panel de Inventario */}
                    <Tabs.Panel value="inventory">
                        <Card withBorder radius="md" p="md">
                            <Group justify="space-between" mb="md">
                                <Text fw={700}>Estado del Inventario</Text>
                                <Button 
                                    variant="light" 
                                    color="green"
                                    onClick={() => navigate('/gestion-productos')}
                                    rightSection={<IconChevronRight size={14} />}
                                >
                                    Gestionar Productos
                                </Button>
                            </Group>
                            
                            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="lg">
                                <MetricCard 
                                    title="Productos Totales"
                                    value={totalProductos}
                                    subtitle="En inventario"
                                    icon={IconPackage}
                                    color="blue"
                                />
                                <MetricCard 
                                    title="Stock Total"
                                    value={stockTotal}
                                    subtitle="Unidades disponibles"
                                    icon={IconPackageExport}
                                    color="green"
                                />
                                <MetricCard 
                                    title="Bajo Stock"
                                    value={productosBajoStock}
                                    subtitle="Necesitan reposición"
                                    icon={IconAlertCircle}
                                    color="orange"
                                />
                                <MetricCard 
                                    title="Agotados"
                                    value={productosAgotados}
                                    subtitle="Sin stock"
                                    icon={IconX}
                                    color="red"
                                />
                            </SimpleGrid>
                            
                            <Alert color="yellow" icon={<IconAlertCircle size={18} />}>
                                <Text size="sm">
                                    {productosBajoStock} productos tienen stock bajo y {productosAgotados} están agotados. 
                                    Considera realizar compras de reposición.
                                </Text>
                            </Alert>
                        </Card>
                    </Tabs.Panel>
                </Tabs>

                {/* Información del usuario */}
                <Card withBorder radius="md" p="md" mt="xl">
                    <Group justify="space-between" align="flex-start">
                        <Group>
                            <ThemeIcon color="blue" size="lg" radius="md">
                                <IconUser size={22} />
                            </ThemeIcon>
                            <div>
                                <Text fw={700}>Sesión Activa</Text>
                                <Text size="sm" c="dimmed">
                                    {user.nombre} {user.apellido} • {user.rol} • {user.empresa_nombre}
                                </Text>
                            </div>
                        </Group>
                        <Group>
                            <Badge color="green" variant="light">
                                Activo
                            </Badge>
                            <Text size="sm" c="dimmed">
                                Última actividad: Hoy, {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </Text>
                        </Group>
                    </Group>
                </Card>
            </Stack>
        );
    };

    // --- DASHBOARD PARA VENDEDOR ---
    const renderVendedorDashboard = () => {
        if (loading) {
            return (
                <Center py={100}>
                    <Loader size="lg" />
                </Center>
            );
        }

        const ingresosVentas = safeParseFloat(stats?.ventas?.total_ingresos);
        const totalVentas = safeParseInt(stats?.ventas?.total_ventas);
        const clientesAtendidos = safeParseInt(stats?.ventas?.clientes_atendidos);

        return (
            <Stack gap="md">
                {/* Encabezado */}
                <Paper withBorder p="md" radius="md" shadow="sm" bg="gray.0">
                    <Group justify="space-between">
                        <div>
                            <IconDashboard size={24} color="#228be6" style={{ display: 'inline-block', marginRight: '10px', verticalAlign: 'middle' }} />
                            <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                                <Title order={3} style={{ display: 'inline-block', margin: 0 }}>Mi Panel de Vendedor</Title>
                                <Text c="dimmed" style={{ marginTop: '4px' }}>
                                    Desempeño personal • {user.empresa_nombre}
                                </Text>
                            </div>
                        </div>
                        
                        <Group>
                            <Select 
                                placeholder="Período"
                                leftSection={<IconCalendar size={18} />}
                                data={[
                                    { value: 'hoy', label: 'Hoy' },
                                    { value: 'semana', label: 'Esta semana' },
                                    { value: 'mes', label: 'Este mes' }
                                ]}
                                value={periodo}
                                onChange={setPeriodo}
                                w={150}
                            />
                            <Button 
                                variant="light" 
                                leftSection={<IconRefresh size={18} />}
                                onClick={cargarDashboardData}
                                loading={loading}
                            >
                                Actualizar
                            </Button>
                            {/* Agregar este botón en el Group de botones */}
                            <Button 
                                variant="subtle" 
                                color="gray"
                                leftSection={<IconBug size={18} />}
                                onClick={async () => {
                                    try {
                                        const debugResponse = await api.get('/stats/debug');
                                        console.log("🔍 Debug completo:", debugResponse.data);
                                        
                                        // Mostrar en una alerta
                                        notifications.show({
                                            title: 'Debug Information',
                                            message: `Pedidos: ${debugResponse.data.total_pedidos}, Usuarios: ${debugResponse.data.usuarios.length}, Productos: ${debugResponse.data.productos.total}`,
                                            color: 'blue'
                                        });
                                        
                                        // También mostrar en consola detallado
                                        if (debugResponse.data.pedidos.length > 0) {
                                            console.table(debugResponse.data.pedidos);
                                        }
                                    } catch (error) {
                                        console.error("Error en debug:", error);
                                    }
                                }}
                                size="xs"
                            >
                                Debug
                            </Button>
                        </Group>
                    </Group>
                </Paper>

                {/* Métricas para vendedor */}
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                    <MetricCard 
                        title="Mis Ventas"
                        value={formatCurrency(ingresosVentas)}
                        subtitle={`Ingresos (${periodo})`}
                        icon={IconShoppingCart}
                        color="green"
                    />
                    <MetricCard 
                        title="Transacciones"
                        value={totalVentas}
                        subtitle={`Realizadas (${periodo})`}
                        icon={IconReceipt}
                        color="blue"
                    />
                    <MetricCard 
                        title="Clientes Atendidos"
                        value={clientesAtendidos}
                        subtitle={`Únicos (${periodo})`}
                        icon={IconUsers}
                        color="teal"
                    />
                </SimpleGrid>

                {/* Ventas recientes del vendedor */}
                {stats?.ventas_recientes?.length > 0 && (
                    <Card withBorder radius="md" p="md">
                        <Group justify="space-between" mb="md">
                            <Text fw={700}>Mis Ventas Recientes</Text>
                            <Button 
                                variant="light" 
                                size="xs"
                                onClick={() => navigate('/ventas')}
                                rightSection={<IconChevronRight size={14} />}
                            >
                                Nueva Venta
                            </Button>
                        </Group>
                        
                        <Table>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>ID</Table.Th>
                                    <Table.Th>Cliente</Table.Th>
                                    <Table.Th ta="right">Total</Table.Th>
                                    <Table.Th>Fecha</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {stats.ventas_recientes.slice(0, 5).map((venta) => (
                                    <Table.Tr key={venta.id_pedido}>
                                        <Table.Td>
                                            <Text size="xs" c="dimmed">#{venta.id_pedido}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{venta.cliente_nombre || 'Cliente no registrado'}</Text>
                                        </Table.Td>
                                        <Table.Td ta="right">
                                            <Text fw={600} c="green">
                                                {formatCurrency(venta.total)}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">
                                                {new Date(venta.fecha).toLocaleDateString()}
                                            </Text>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Card>
                )}

                {/* Acciones rápidas para vendedor */}
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <Button 
                        variant="light" 
                        color="green"
                        leftSection={<IconShoppingCart size={18} />}
                        onClick={() => navigate('/ventas')}
                        size="lg"
                        fullWidth
                    >
                        Nueva Venta
                    </Button>
                    <Button 
                        variant="light" 
                        color="blue"
                        leftSection={<IconUsers size={18} />}
                        onClick={() => navigate('/clientes')}
                        size="lg"
                        fullWidth
                    >
                        Gestionar Clientes
                    </Button>
                </SimpleGrid>
            </Stack>
        );
    };

    return (
        <Container size="xl" py="xl">
            {/* Cabecera común */}
            <Group justify="space-between" align="flex-start" mb="xl">
                <Stack gap={0}>
                    <Text fw={900} size="xl" c="blue.7" style={{ letterSpacing: 1 }}>
                        GESTIÓN PRO DASHBOARD
                    </Text>
                    <Text size="sm" c="dimmed">
                        Sistema de Inteligencia Comercial • {new Date().toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </Text>
                </Stack>
                <Badge variant="filled" color="green" size="lg" radius="sm">
                    Sistema Activo
                </Badge>
            </Group>

            <Divider mb="xl" />

            {/* Renderización basada en Rol */}
            {user.rol === 'super_admin' && renderSuperAdminDashboard()}
            {['administrador', 'microempresa_P'].includes(user.rol) && renderAdminDashboard()}
            {user.rol === 'vendedor' && renderVendedorDashboard()}

            {/* Pie de página */}
            <Paper withBorder p="xs" mt="xl" bg="blue.0" radius="md">
                <Text size="xs" ta="center" c="blue.8" fw={500}>
                    © {new Date().getFullYear()} Sistema de Gestión Pro • 
                    Los datos son confidenciales para {user.empresa_nombre || 'la plataforma'} • 
                    Última actualización: {new Date().toLocaleTimeString()}
                </Text>
            </Paper>
        </Container>
    );
};

export default Dashboard;