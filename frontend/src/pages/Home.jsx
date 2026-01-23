import { 
    Container, 
    Title, 
    Text, 
    Button, 
    Group, 
    Card, 
    SimpleGrid, 
    Center,
    Box,
    Stack,
    Modal,
    TextInput,
    PasswordInput,
    Badge,
    Avatar,
    Divider,
    Tabs,
    Anchor,
    Loader,
    Alert,
    Paper,
    Image,
    Grid,
    ActionIcon,
    ThemeIcon
} from '@mantine/core';
import { 
    IconBuilding, 
    IconChartBar, 
    IconUsers, 
    IconShieldCheck,
    IconEye,
    IconPackage,
    IconUserPlus,
    IconLogin,
    IconLogout,
    IconUserCircle,
    IconBriefcase,
    IconCheck,
    IconAlertCircle,
    IconSearch,
    IconMapPin,
    IconPhone,
    IconMail,
    IconShoppingCart,
    IconHeart,
    IconStar,
    IconArrowRight,
    IconHome,
    IconCategory,
    IconShoppingBag,
    IconKey,
    IconLock,
    IconReceipt
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';
import clientePublicoService from '../services/clientePublicoService';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { useForm } from '@mantine/form';
import api from '../services/api';

export function Home() {
    const navigate = useNavigate();
    const [microempresas, setMicroempresas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
    const [activeTab, setActiveTab] = useState('cliente-login');
    const [clienteLogueado, setClienteLogueado] = useState(null);
    const [usuarioLogueado, setUsuarioLogueado] = useState(null);
    const [busqueda, setBusqueda] = useState('');

    // Verificar sesiones al cargar
    useEffect(() => {
        // Verificar si hay usuario del sistema logueado
        const usuario = getCurrentUser();
        if (usuario) {
            setUsuarioLogueado(usuario);
        }

        // Verificar si hay cliente público logueado
        const verificarCliente = async () => {
            try {
                const token = clientePublicoService.getToken();
                if (token) {
                    const response = await clientePublicoService.verifyToken();
                    if (response.data.valid) {
                        setClienteLogueado(response.data.cliente);
                        clientePublicoService.setClienteData(response.data.cliente);
                    } else {
                        clientePublicoService.removeToken();
                    }
                }
            } catch (error) {
                console.error("Error verificando cliente:", error);
                clientePublicoService.removeToken();
            }
        };

        verificarCliente();
        cargarMicroempresas();
    }, []);

    const cargarMicroempresas = async () => {
        try {
            const response = await clientePublicoService.getMicroempresas();
            setMicroempresas(response.data || []);
        } catch (error) {
            console.error('Error cargando microempresas:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudieron cargar las microempresas',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    // Formularios
    const formClienteRegistro = useForm({
        initialValues: {
            nombre: '',
            email: '',
            telefono: '',
            password: '',
            confirmPassword: ''
        },
        validate: {
            nombre: (value) => value.length < 2 ? 'Nombre muy corto' : null,
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
            password: (value) => value.length < 6 ? 'Mínimo 6 caracteres' : null,
            confirmPassword: (value, values) => value !== values.password ? 'Las contraseñas no coinciden' : null
        }
    });

    const formClienteLogin = useForm({
        initialValues: {
            email: '',
            password: ''
        },
        validate: {
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
            password: (value) => value.length < 4 ? 'Contraseña muy corta' : null
        }
    });

    // Handlers para Clientes Públicos
    const handleRegistroCliente = async (values) => {
        try {
            const response = await clientePublicoService.registrar({
                nombre: values.nombre,
                email: values.email,
                telefono: values.telefono,
                password: values.password
            });
            
            clientePublicoService.setToken(response.data.token);
            clientePublicoService.setClienteData(response.data.cliente);
            setClienteLogueado(response.data.cliente);
            setModalClienteAbierto(false);
            
            notifications.show({
                title: '✅ Registro exitoso!',
                message: `Bienvenido ${values.nombre}`,
                color: 'green',
                icon: <IconCheck size={16} />
            });
            
            formClienteRegistro.reset();
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || 'Error al registrar',
                color: 'red',
                icon: <IconAlertCircle size={16} />
            });
        }
    };

    const handleLoginCliente = async (values) => {
        try {
            const response = await clientePublicoService.login({
                email: values.email,
                password: values.password
            });
            
            clientePublicoService.setToken(response.data.token);
            clientePublicoService.setClienteData(response.data.cliente);
            setClienteLogueado(response.data.cliente);
            setModalClienteAbierto(false);
            
            notifications.show({
                title: '✅ ¡Bienvenido!',
                message: `Hola ${response.data.cliente.nombre}`,
                color: 'green',
                icon: <IconCheck size={16} />
            });
            
            formClienteLogin.reset();
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || 'Credenciales incorrectas',
                color: 'red',
                icon: <IconAlertCircle size={16} />
            });
        }
    };

    const handleLogoutCliente = () => {
        clientePublicoService.removeToken();
        setClienteLogueado(null);
        notifications.show({
            title: 'Sesión cerrada',
            message: 'Has salido de tu cuenta de cliente',
            color: 'blue',
        });
    };

    const handleLogoutUsuario = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUsuarioLogueado(null);
        notifications.show({
            title: 'Sesión cerrada',
            message: 'Has salido del sistema',
            color: 'blue',
        });
    };

    

    // Acceder al portal de una microempresa
    const handleAccederPortal = async (microempresaId, empresaNombre) => {
        // Si el cliente está logueado, registrar visita
        if (clienteLogueado) {
            try {
                await clientePublicoService.registrarVisita({
                    cliente_id: clienteLogueado.id,
                    microempresa_id: microempresaId
                });
            } catch (error) {
                console.log("No se pudo registrar visita:", error);
                // No importa si falla, el portal sigue accesible
            }
        }

        // Navegar al portal (¡sin necesidad de login!)
        navigate(`/portal/${microempresaId}`);
    };

    // Filtrar microempresas por búsqueda
    const microempresasFiltradas = microempresas.filter(empresa =>
        empresa.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        empresa.rubro?.toLowerCase().includes(busqueda.toLowerCase()) ||
        empresa.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-blue-0)' }}>
            {/* Header con navegación */}
            <Box bg="white" py="md" shadow="sm" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
                <Container size="lg">
                    <Group justify="space-between">
                        <Group>
                            <Title order={3} c="blue.7" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                                Gestión SaaS Microempresas
                            </Title>
                        </Group>
                        
                        <Group>
                            {/* Mostrar estado de sesión */}
                            {usuarioLogueado ? (
                                <Group>
                                    <Badge color="blue" leftSection={<IconUserCircle size={12} />}>
                                        {usuarioLogueado.nombre}
                                    </Badge>
                                    <Button 
                                        variant="light" 
                                        color="blue"
                                        onClick={() => navigate('/dashboard')}
                                        size="sm"
                                    >
                                        Dashboard
                                    </Button>
                                    <Button 
                                        variant="light" 
                                        color="red" 
                                        leftSection={<IconLogout size={16} />}
                                        onClick={handleLogoutUsuario}
                                        size="sm"
                                    >
                                        Salir
                                    </Button>
                                </Group>
                            ) : clienteLogueado ? (
                                <Group>
                                    <Badge color="teal" leftSection={<IconUsers size={12} />}>
                                        {clienteLogueado.nombre}
                                    </Badge>
                                    <Button 
                                            variant="light" 
                                            color="blue"
                                            leftSection={<IconReceipt size={16} />}
                                            onClick={() => navigate('/mis-pedidos')}
                                            size="sm"
                                        >
                                            Mis Pedidos
                                        </Button>
                                    <Button 
                                        variant="light" 
                                        color="blue"
                                        onClick={() => navigate(`/portal/historial/${clienteLogueado.id}`)}
                                        size="sm"
                                    >
                                        Mis Visitas
                                    </Button>
                                    <Button 
                                        variant="light" 
                                        color="red" 
                                        leftSection={<IconLogout size={16} />}
                                        onClick={handleLogoutCliente}
                                        size="sm"
                                    >
                                        Salir
                                    </Button>
                                </Group>
                            ) : (
                                <Group>
                                    {/* Botones para páginas de autenticación de usuarios */}
                                    <Button 
                                        variant="light" 
                                        leftSection={<IconLogin size={16} />}
                                        onClick={() => navigate('/login')}
                                        size="sm"
                                    >
                                        Login
                                    </Button>
                                    <Button 
                                        variant="light" 
                                        leftSection={<IconUserPlus size={16} />}
                                        onClick={() => navigate('/registrar')}
                                        size="sm"
                                    >
                                        Registrar
                                    </Button>
                                    <Button 
                                        variant="filled" 
                                        leftSection={<IconUsers size={16} />}
                                        onClick={() => {
                                            setModalClienteAbierto(true);
                                            setActiveTab('cliente-registro');
                                        }}
                                        size="sm"
                                        color="teal"
                                    >
                                        Soy Cliente
                                    </Button>
                                </Group>
                            )}
                        </Group>
                    </Group>
                </Container>
            </Box>

            {/* Hero Section */}
            <Container size="lg" py={60}>
                <Stack align="center" gap="xl">
                    <Title order={1} size={48} c="blue.7" fw={900} ta="center">
                        Tu Portal para 
                        <Text span c="cyan.6" inherit> Microempresas Locales</Text>
                    </Title>
                    
                    <Text size="xl" c="gray.7" ta="center" maw={800}>
                        Descubre productos únicos de microempresas locales. 
                        Regístrate como cliente y explora sus catálogos completos.
                    </Text>

                    <Group mt={30}>
                        {usuarioLogueado ? (
                            <Button 
                                size="lg" 
                                radius="md"
                                variant="gradient"
                                gradient={{ from: 'blue', to: 'cyan' }}
                                onClick={() => navigate('/dashboard')}
                            >
                                Ir al Dashboard
                            </Button>
                        ) : clienteLogueado ? (
                            <Group>
                                <Button 
                                    size="lg" 
                                    radius="md"
                                    variant="gradient"
                                    gradient={{ from: 'green', to: 'teal' }}
                                    onClick={() => navigate('#microempresas')}
                                >
                                    Explorar Microempresas
                                </Button>
                                <Button 
                                    size="lg" 
                                    variant="light" 
                                    radius="md"
                                    onClick={handleLogoutCliente}
                                >
                                    Cerrar Sesión
                                </Button>
                            </Group>
                        ) : (
                            <>
                                {/* Botones principales para usuarios del sistema */}
                                <Button 
                                    size="lg" 
                                    radius="md"
                                    variant="gradient"
                                    gradient={{ from: 'blue', to: 'cyan' }}
                                    onClick={() => navigate('/registrar')}
                                >
                                    Registra tu Empresa
                                </Button>
                                
                                <Button 
                                    size="lg" 
                                    variant="light" 
                                    radius="md"
                                    onClick={() => navigate('/login')}
                                >
                                    Iniciar Sesión
                                </Button>
                                
                                <Button 
                                    size="lg" 
                                    variant="outline" 
                                    radius="md"
                                    color="teal"
                                    onClick={() => {
                                        setModalClienteAbierto(true);
                                        setActiveTab('cliente-registro');
                                    }}
                                >
                                    Soy Cliente
                                </Button>
                            </>
                        )}
                    </Group>
                    
                    {/* Enlaces adicionales para usuarios */}
                    {!usuarioLogueado && !clienteLogueado && (
                        <Group mt="md">
                            <Anchor 
                                onClick={() => navigate('/forgot-password')}
                                size="sm"
                                c="blue"
                            >
                                <IconLock size={14} style={{ marginRight: 4 }} />
                                ¿Olvidaste tu contraseña?
                            </Anchor>
                        </Group>
                    )}
                </Stack>
            </Container>

            {/* Sección de información */}
            <Container size="lg" py={40}>
                <Grid gutter={50}>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                        <Card shadow="sm" padding="lg" radius="md" withBorder>
                            <Stack align="center" ta="center">
                                <ThemeIcon size={60} radius="md" variant="light" color="blue">
                                    <IconBriefcase size={30} />
                                </ThemeIcon>
                                <Title order={4}>Para Empresas</Title>
                                <Text c="dimmed" size="sm">
                                    Administra tu microempresa, productos, inventario y ventas en un solo lugar.
                                </Text>
                                <Button 
                                    variant="light" 
                                    color="blue"
                                    onClick={() => navigate('/registrar')}
                                    fullWidth
                                    mt="md"
                                >
                                    Crear Cuenta
                                </Button>
                            </Stack>
                        </Card>
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, md: 4 }}>
                        <Card shadow="sm" padding="lg" radius="md" withBorder>
                            <Stack align="center" ta="center">
                                <ThemeIcon size={60} radius="md" variant="light" color="teal">
                                    <IconUsers size={30} />
                                </ThemeIcon>
                                <Title order={4}>Para Clientes</Title>
                                <Text c="dimmed" size="sm">
                                    Explora productos de microempresas locales. Encuentra ofertas únicas.
                                </Text>
                                <Button 
                                    variant="light" 
                                    color="teal"
                                    onClick={() => {
                                        setModalClienteAbierto(true);
                                        setActiveTab('cliente-registro');
                                    }}
                                    fullWidth
                                    mt="md"
                                >
                                    Registrarse como Cliente
                                </Button>
                            </Stack>
                        </Card>
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, md: 4 }}>
                        <Card shadow="sm" padding="lg" radius="md" withBorder>
                            <Stack align="center" ta="center">
                                <ThemeIcon size={60} radius="md" variant="light" color="orange">
                                    <IconShoppingBag size={30} />
                                </ThemeIcon>
                                <Title order={4}>Catálogos</Title>
                                <Text c="dimmed" size="sm">
                                    Accede a productos exclusivos de microempresas verificadas.
                                </Text>
                                <Button 
                                    variant="light" 
                                    color="orange"
                                    onClick={() => navigate('#microempresas')}
                                    fullWidth
                                    mt="md"
                                >
                                    Ver Microempresas
                                </Button>
                            </Stack>
                        </Card>
                    </Grid.Col>
                </Grid>
            </Container>

            {/* Barra de búsqueda */}
            <Container size="lg" mb={40} id="microempresas">
                <Paper p="md" radius="md" shadow="sm" withBorder>
                    <Group>
                        <TextInput 
                            placeholder="Buscar microempresas por nombre, rubro o descripción..."
                            leftSection={<IconSearch size={16} />}
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        {busqueda && (
                            <Button 
                                variant="light" 
                                onClick={() => setBusqueda('')}
                            >
                                Limpiar
                            </Button>
                        )}
                    </Group>
                </Paper>
            </Container>

            {/* Sección de Microempresas */}
            <Container size="lg" py={40} bg="white" style={{ borderRadius: '12px' }}>
                <Title order={2} mb="md" ta="center">Microempresas Disponibles</Title>
                <Text c="dimmed" mb="xl" ta="center">
                    {clienteLogueado 
                        ? `Hola ${clienteLogueado.nombre}, explora los productos de estas microempresas`
                        : 'Regístrate como cliente para ver todos los productos disponibles'}
                </Text>

                {/* Estado de cliente */}
                {!clienteLogueado ? (
                    <Center mb="xl">
                        <Alert 
                            color="blue" 
                            title="¡Conviértete en cliente!"
                            icon={<IconUsers size={20} />}
                            w="100%"
                            maw={600}
                        >
                            <Text>Regístrate gratis como cliente para poder ver los catálogos completos de productos.</Text>
                            <Button 
                                mt="md" 
                                leftSection={<IconUserPlus size={16} />}
                                onClick={() => {
                                    setModalClienteAbierto(true);
                                    setActiveTab('cliente-registro');
                                }}
                            >
                                Registrarme como Cliente
                            </Button>
                        </Alert>
                    </Center>
                ) : (
                    <Alert 
                        color="teal" 
                        title={`Bienvenido ${clienteLogueado.nombre}`} 
                        mb="xl"
                        icon={<IconCheck size={20} />}
                    >
                        <Text>Ahora puedes explorar todos los productos de las microempresas.</Text>
                        <Group mt="md">
                            <Text size="sm" c="dimmed">
                                {microempresas.length} microempresas disponibles
                            </Text>
                        </Group>
                    </Alert>
                )}

                {/* Lista de Microempresas */}
                {loading ? (
                    <Center py={40}>
                        <Loader />
                    </Center>
                ) : microempresasFiltradas.length > 0 ? (
                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                        {microempresasFiltradas.map((empresa) => (
                            <Card key={empresa.id_microempresa} shadow="sm" padding="lg" radius="md" withBorder>
                                <Card.Section p="md" bg="gray.0">
                                    <Group justify="space-between">
                                        <Avatar 
                                            color="blue" 
                                            radius="xl"
                                            size="lg"
                                        >
                                            {empresa.nombre.charAt(0)}
                                        </Avatar>
                                        <Badge color="green" variant="light">
                                            {empresa.productos_count || 0} productos
                                        </Badge>
                                    </Group>
                                </Card.Section>

                                <Text fw={500} size="lg" mt="md">{empresa.nombre}</Text>
                                <Badge variant="light" color="blue" size="sm" mt={4}>
                                    {empresa.rubro || 'Sin rubro especificado'}
                                </Badge>
                                <Text size="sm" c="dimmed" mt="xs" lineClamp={2}>
                                    {empresa.descripcion || 'Sin descripción'}
                                </Text>

                                <Group mt="md" justify="space-between">
                                    <div>
                                        {empresa.direccion && (
                                            <Text size="sm" c="dimmed">
                                                <IconMapPin size={12} style={{ marginRight: 4 }} />
                                                {empresa.direccion.substring(0, 30)}...
                                            </Text>
                                        )}
                                        {empresa.telefono && (
                                            <Text size="sm" c="dimmed">
                                                <IconPhone size={12} style={{ marginRight: 4 }} />
                                                {empresa.telefono}
                                            </Text>
                                        )}
                                    </div>
                                </Group>

                                <Button 
                                    fullWidth 
                                    mt="md"
                                    variant={clienteLogueado ? "filled" : "outline"}
                                    color={clienteLogueado ? "blue" : "gray"}
                                    leftSection={<IconEye size={16} />}
                                    onClick={() => handleAccederPortal(empresa.id_microempresa, empresa.nombre)}
                                >
                                    Ver Catálogo
                                </Button>
                                
                            </Card>
                        ))}
                    </SimpleGrid>
                ) : (
                    <Center py={40}>
                        <Stack align="center">
                            <IconBuilding size={48} color="gray" />
                            <Text c="dimmed">No se encontraron microempresas</Text>
                            {busqueda && (
                                <Button 
                                    variant="light" 
                                    onClick={() => setBusqueda('')}
                                >
                                    Limpiar búsqueda
                                </Button>
                            )}
                        </Stack>
                    </Center>
                )}
            </Container>

            {/* Sección de cómo funciona */}
            <Container size="lg" py={60}>
                <Title order={2} ta="center" mb="xl">¿Cómo funciona?</Title>
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
                    <Stack align="center" ta="center">
                        <ThemeIcon size={80} radius="50%" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                            1
                        </ThemeIcon>
                        <Title order={4}>Regístrate</Title>
                        <Text c="dimmed">
                            Crea tu cuenta como cliente o como microempresa según tus necesidades.
                        </Text>
                    </Stack>
                    
                    <Stack align="center" ta="center">
                        <ThemeIcon size={80} radius="50%" variant="gradient" gradient={{ from: 'green', to: 'teal' }}>
                            2
                        </ThemeIcon>
                        <Title order={4}>Explora</Title>
                        <Text c="dimmed">
                            Descubre microempresas locales y sus productos únicos.
                        </Text>
                    </Stack>
                    
                    <Stack align="center" ta="center">
                        <ThemeIcon size={80} radius="50%" variant="gradient" gradient={{ from: 'orange', to: 'red' }}>
                            3
                        </ThemeIcon>
                        <Title order={4}>Conecta</Title>
                        <Text c="dimmed">
                            Contacta directamente con las microempresas y realiza tus compras.
                        </Text>
                    </Stack>
                </SimpleGrid>
            </Container>

            {/* Modal para Clientes (Registro/Login) */}
            <Modal 
                opened={modalClienteAbierto} 
                onClose={() => setModalClienteAbierto(false)}
                title="Acceso para Clientes"
                size="md"
            >
                <Tabs value={activeTab} onChange={setActiveTab}>
                    <Tabs.List grow mb="md">
                        <Tabs.Tab value="cliente-registro" leftSection={<IconUserPlus size={16} />}>
                            Registrarse
                        </Tabs.Tab>
                        <Tabs.Tab value="cliente-login" leftSection={<IconLogin size={16} />}>
                            Iniciar Sesión
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="cliente-registro">
                        <form onSubmit={formClienteRegistro.onSubmit(handleRegistroCliente)}>
                            <Stack gap="md">
                                <TextInput
                                    label="Nombre Completo"
                                    placeholder="Juan Pérez"
                                    {...formClienteRegistro.getInputProps('nombre')}
                                    required
                                />
                                <TextInput
                                    label="Email"
                                    placeholder="cliente@ejemplo.com"
                                    type="email"
                                    {...formClienteRegistro.getInputProps('email')}
                                    required
                                />
                                <TextInput
                                    label="Teléfono"
                                    placeholder="+591 70000000"
                                    {...formClienteRegistro.getInputProps('telefono')}
                                />
                                <PasswordInput
                                    label="Contraseña"
                                    placeholder="Mínimo 6 caracteres"
                                    {...formClienteRegistro.getInputProps('password')}
                                    required
                                />
                                <PasswordInput
                                    label="Confirmar Contraseña"
                                    placeholder="Repite tu contraseña"
                                    {...formClienteRegistro.getInputProps('confirmPassword')}
                                    required
                                />
                                <Button type="submit" fullWidth color="teal">
                                    Registrarse como Cliente
                                </Button>
                                
                                <Divider label="¿Ya tienes cuenta?" />
                                
                                <Button 
                                    variant="light" 
                                    onClick={() => setActiveTab('cliente-login')}
                                    fullWidth
                                >
                                    Iniciar Sesión
                                </Button>
                            </Stack>
                        </form>
                    </Tabs.Panel>

                    <Tabs.Panel value="cliente-login">
                        <form onSubmit={formClienteLogin.onSubmit(handleLoginCliente)}>
                            <Stack gap="md">
                                <TextInput
                                    label="Email"
                                    placeholder="cliente@ejemplo.com"
                                    type="email"
                                    {...formClienteLogin.getInputProps('email')}
                                    required
                                />
                                <PasswordInput
                                    label="Contraseña"
                                    placeholder="Tu contraseña"
                                    {...formClienteLogin.getInputProps('password')}
                                    required
                                />
                                
                                <Anchor 
                                    size="sm" 
                                    ta="right" 
                                    c="blue"
                                    onClick={() => {
                                        // Aquí iría la funcionalidad de recuperación
                                        notifications.show({
                                            title: 'Próximamente',
                                            message: 'Función de recuperación de contraseña',
                                            color: 'blue'
                                        });
                                    }}
                                >
                                    ¿Olvidaste tu contraseña?
                                </Anchor>
                                
                                <Button type="submit" fullWidth color="teal">
                                    Iniciar Sesión
                                </Button>
                                
                                <Divider label="¿No tienes cuenta?" />
                                
                                <Button 
                                    variant="light" 
                                    onClick={() => setActiveTab('cliente-registro')}
                                    fullWidth
                                >
                                    Registrarse
                                </Button>
                            </Stack>
                        </form>
                    </Tabs.Panel>
                </Tabs>
            </Modal>

            {/* Footer */}
            <Box bg="dark.7" mt={60} py={40}>
                <Container size="lg">
                    <Grid>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                            <Stack>
                                <Title order={4} c="white">Gestión SaaS Microempresas</Title>
                                <Text c="gray.5" size="sm">
                                    Plataforma que conecta microempresas locales con clientes.
                                </Text>
                                <Group mt="sm">
                                    <Button 
                                        variant="light" 
                                        color="blue" 
                                        size="sm"
                                        onClick={() => navigate('/login')}
                                    >
                                        Login
                                    </Button>
                                    <Button 
                                        variant="light" 
                                        color="teal" 
                                        size="sm"
                                        onClick={() => navigate('/registrar')}
                                    >
                                        Registrar
                                    </Button>
                                    <Button 
                                        variant="light" 
                                        color="orange" 
                                        size="sm"
                                        onClick={() => navigate('/forgot-password')}
                                    >
                                        Recuperar Contraseña
                                    </Button>
                                </Group>
                            </Stack>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                            <Group justify="flex-end">
                                <Stack gap="xs">
                                    <Anchor c="gray.5" size="sm" onClick={() => navigate('/')}>
                                        Inicio
                                    </Anchor>
                                    <Anchor c="gray.5" size="sm" onClick={() => navigate('/login')}>
                                        Iniciar Sesión
                                    </Anchor>
                                    <Anchor c="gray.5" size="sm" onClick={() => navigate('/registrar')}>
                                        Registrar Empresa
                                    </Anchor>
                                    <Anchor c="gray.5" size="sm" onClick={() => setModalClienteAbierto(true)}>
                                        Registrarse como Cliente
                                    </Anchor>
                                    <Text size="xs" c="gray.6" mt="sm">
                                        © {new Date().getFullYear()} Gestión SaaS Microempresas
                                    </Text>
                                </Stack>
                            </Group>
                        </Grid.Col>
                    </Grid>
                </Container>
            </Box>
        </Box>
    );
}