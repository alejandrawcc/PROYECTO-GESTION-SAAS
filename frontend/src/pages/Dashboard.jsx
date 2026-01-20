import { 
    Container, Title, Text, Card, SimpleGrid, Group, 
    Badge, Stack, TextInput, Select, Paper, Divider, ThemeIcon 
} from '@mantine/core';
import { useState } from 'react';
import { 
    IconBuilding, IconUsers, IconShoppingCart, IconPackage,
    IconChartBar, IconUser, IconSettings, IconSearch, 
    IconCalendar, IconTrendingUp 
} from '@tabler/icons-react';
import { getCurrentUser } from '../services/auth';

const Dashboard = () => {
    const user = getCurrentUser();
    
    // --- ESTADOS PARA FILTRADO Y BÚSQUEDA ---
    const [periodo, setPeriodo] = useState('mes');
    const [busqueda, setBusqueda] = useState('');

    // --- BARRA DE HERRAMIENTAS PROFESIONAL ---
    const renderFiltros = () => (
        <Paper withBorder p="md" mb="xl" radius="md" shadow="sm" bg="gray.0">
            <Group justify="space-between">
                <TextInput 
                    placeholder="Buscar métrica o sección..." 
                    leftSection={<IconSearch size={18} stroke={1.5} />}
                    style={{ flex: 1 }}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.currentTarget.value)}
                    variant="filled"
                />
                <Select 
                    label="Período de análisis"
                    placeholder="Seleccionar"
                    leftSection={<IconCalendar size={18} stroke={1.5} />}
                    data={[
                        { value: 'hoy', label: 'Hoy' },
                        { value: 'semana', label: 'Esta Semana' },
                        { value: 'mes', label: 'Este Mes' },
                    ]}
                    value={periodo}
                    onChange={setPeriodo}
                    w={200}
                />
            </Group>
        </Paper>
    );

    // --- COMPONENTE DE TARJETA REUTILIZABLE CON FILTRO ---
    const MetricaCard = ({ titulo, valor, subtitulo, icono: Icono, color = "blue" }) => {
        // Lógica de búsqueda: si el título no coincide con la búsqueda, no se muestra
        if (busqueda && !titulo.toLowerCase().includes(busqueda.toLowerCase())) return null;

        return (
            <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" mb="xs">
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">{titulo}</Text>
                    <ThemeIcon color={color} variant="light" size="lg" radius="md">
                        <Icono size={22} stroke={1.5} />
                    </ThemeIcon>
                </Group>
                <Stack gap={0}>
                    <Title order={2} fw={800}>{valor}</Title>
                    <Text size="sm" c="dimmed" mt={4}>
                        {subtitulo}
                    </Text>
                </Stack>
            </Card>
        );
    };

    // --- DASHBOARD: SUPER ADMIN ---
    const renderSuperAdminDashboard = () => (
        <Stack gap="md">
            <Title order={2}>Panel de Control Global</Title>
            <Text c="dimmed">Supervisión de todas las microempresas registradas</Text>
            
            {renderFiltros()}

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                <MetricaCard titulo="Empresas Totales" valor="15" subtitulo="12 operando activamente" icono={IconBuilding} color="blue" />
                <MetricaCard titulo="Usuarios Sistema" valor="84" subtitulo="5 nuevos esta semana" icono={IconUsers} color="cyan" />
                <MetricaCard titulo="Ventas Red" valor="Bs. 125,400" subtitulo={`Total acumulado (${periodo})`} icono={IconShoppingCart} color="green" />
                <MetricaCard titulo="Uso Servidor" valor="24%" subtitulo="Rendimiento óptimo" icono={IconChartBar} color="violet" />
            </SimpleGrid>

            <Card withBorder radius="md" p="xl" mt="lg">
                <Group justify="space-between" mb="md">
                    <Text fw={700}>Acciones Rápidas de Administración</Text>
                    <Badge color="orange" variant="outline">Requiere atención: 2</Badge>
                </Group>
                <Group gap="sm">
                    <Badge size="lg" variant="light" color="blue" style={{ cursor: 'pointer' }}>Auditar Ventas</Badge>
                    <Badge size="lg" variant="light" color="green" style={{ cursor: 'pointer' }}>Soporte Empresas</Badge>
                    <Badge size="lg" variant="light" color="gray" style={{ cursor: 'pointer' }}>Configurar Planes</Badge>
                </Group>
            </Card>
        </Stack>
    );

    // --- DASHBOARD: ADMINISTRADOR / DUEÑO ---
    const renderAdminDashboard = () => (
        <Stack gap="md">
            <Title order={2}>Dashboard de Negocio</Title>
            <Text c="dimmed">Métricas clave para <b>{user.empresa_nombre}</b></Text>

            {renderFiltros()}

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                <MetricaCard titulo="Ingresos" valor="Bs. 1,250" subtitulo={`Ventas de ${periodo}`} icono={IconTrendingUp} color="green" />
                <MetricaCard titulo="Inventario" valor="45" subtitulo="3 productos con stock bajo" icono={IconPackage} color="orange" />
                <MetricaCard titulo="Fidelización" valor="28" subtitulo="Clientes registrados" icono={IconUsers} color="blue" />
            </SimpleGrid>

            <Card withBorder radius="md" mt="xl">
                <Title order={4} mb="md">Resumen de Sesión</Title>
                <Group gap="xl">
                    <Stack gap={2}>
                        <Text size="xs" c="dimmed">Usuario</Text>
                        <Text fw={600}>{user.nombre} {user.apellido}</Text>
                    </Stack>
                    <Stack gap={2}>
                        <Text size="xs" c="dimmed">Rol</Text>
                        <Badge variant="dot">{user.rol}</Badge>
                    </Stack>
                    <Stack gap={2}>
                        <Text size="xs" c="dimmed">Última Actividad</Text>
                        <Text size="sm">Hoy, {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                    </Stack>
                </Group>
            </Card>
        </Stack>
    );

    // --- DASHBOARD: VENDEDOR ---
    const renderVendedorDashboard = () => (
        <Stack gap="md">
            <Title order={2}>Mi Actividad</Title>
            <Text c="dimmed">Control de metas y ventas personales</Text>

            {renderFiltros()}

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                <MetricaCard titulo="Mis Ventas" valor="Bs. 850" subtitulo="Cierre de caja parcial" icono={IconShoppingCart} color="green" />
                <MetricaCard titulo="Transacciones" valor="12" subtitulo={`Realizadas ${periodo}`} icono={IconChartBar} color="blue" />
                <MetricaCard titulo="Clientes Nuevos" valor="4" icono={IconUser} color="teal" />
            </SimpleGrid>
        </Stack>
    );

    return (
        <Container size="xl" py="xl">
            {/* Cabecera común */}
            <Group justify="space-between" align="flex-start" mb="xl">
                <Stack gap={0}>
                    <Text fw={900} size="xl" c="blue.7" style={{ letterSpacing: 1 }}>GESTIÓN PRO</Text>
                    <Text size="sm" c="dimmed">Módulo de Business Intelligence</Text>
                </Stack>
                <Badge variant="filled" color="blue" size="lg" radius="sm">Sistema Activo</Badge>
            </Group>

            <Divider mb="xl" />

            {/* Renderización basada en Rol */}
            {user.rol === 'super_admin' && renderSuperAdminDashboard()}
            {['administrador', 'microempresa_P'].includes(user.rol) && renderAdminDashboard()}
            {user.rol === 'vendedor' && renderVendedorDashboard()}

            {/* Pie de página informativo */}
            <Paper withBorder p="xs" mt="xl" bg="blue.0" radius="md">
                <Text size="xs" ta="center" c="blue.8" fw={500}>
                    Los datos presentados son de carácter confidencial para {user.empresa_nombre || 'la plataforma'}.
                </Text>
            </Paper>
        </Container>
    );
};

export default Dashboard;