import { 
    Container, Title, Text, Card, SimpleGrid, Group, Badge, Button,
    Image, Stack, Paper, Center, Loader, TextInput, Select, Grid,
    Divider, Box, Avatar, Breadcrumbs, Anchor, Pagination, Rating,
    Tabs, Modal, NumberInput, Alert, ActionIcon, ThemeIcon,
    ScrollArea, rem, Flex, List
} from '@mantine/core';
import { 
    IconBuilding, IconPhone, IconMail, IconMapPin, IconCategory,
    IconSearch, IconFilter, IconShoppingCart, IconHeart, IconShare,
    IconArrowLeft, IconHome, IconChevronRight, IconInfoCircle,
    IconPackage, IconCheck, IconX, IconStar, IconStarFilled,
    IconEye, IconCurrencyDollar, IconBasket, IconTruck, IconShield,
    IconRefresh, IconBuildingStore, IconUsers, IconCalendar,
    IconShoppingBag, IconTag, IconDiscount
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import api from '../services/api';
import { getCurrentUser } from '../services/auth';

const PortalMicroempresa = () => {
    const { microempresaId } = useParams();
    const navigate = useNavigate();
    const user = getCurrentUser();

    const [portalData, setPortalData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [empresa, setEmpresa] = useState(null);
    
    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
    const [orden, setOrden] = useState('recientes');
    const [paginaActual, setPaginaActual] = useState(1);
    
    // Modal de producto
    const [modalProductoOpen, setModalProductoOpen] = useState(false);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [cantidadCarrito, setCantidadCarrito] = useState(1);

    const itemsPorPagina = 12;

    // Cargar datos del portal
    useEffect(() => {
        cargarPortal();
    }, [microempresaId]);

    const cargarPortal = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/portal/${microempresaId}`);
            setPortalData(response.data);
            setEmpresa(response.data.empresa);
            setProductos(response.data.productos || []);
            setCategorias(response.data.categorias || []);
        } catch (error) {
            console.error('Error cargando portal:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudo cargar el portal de la microempresa',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    // Filtrar productos
    const productosFiltrados = productos.filter(producto => {
        const matchBusqueda = busqueda ? 
            producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            (producto.descripcion && producto.descripcion.toLowerCase().includes(busqueda.toLowerCase())) : true;
        
        const matchCategoria = categoriaSeleccionada === 'todas' || 
            producto.categoria === categoriaSeleccionada;
        
        return matchBusqueda && matchCategoria;
    });

    // Ordenar productos
    const productosOrdenados = [...productosFiltrados].sort((a, b) => {
        switch (orden) {
            case 'precio-asc':
                return a.precio - b.precio;
            case 'precio-desc':
                return b.precio - a.precio;
            case 'nombre':
                return a.nombre.localeCompare(b.nombre);
            case 'recientes':
            default:
                return new Date(b.fecha_actualizacion) - new Date(a.fecha_actualizacion);
        }
    });

    // Paginación
    const totalPaginas = Math.ceil(productosOrdenados.length / itemsPorPagina);
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    const productosPaginados = productosOrdenados.slice(inicio, fin);

    // Handlers
    const handleVerProducto = (producto) => {
        setProductoSeleccionado(producto);
        setModalProductoOpen(true);
        setCantidadCarrito(1);
    };

    const handleAgregarCarrito = () => {
        if (!productoSeleccionado) return;
        
        // Aquí implementarías la lógica del carrito
        notifications.show({
            title: '✅ Producto agregado',
            message: `${cantidadCarrito}x ${productoSeleccionado.nombre} agregado al carrito`,
            color: 'green',
            icon: <IconShoppingCart size={20} />
        });
        
        setModalProductoOpen(false);
    };

    const handleComprarAhora = () => {
        if (!productoSeleccionado) return;
        
        notifications.show({
            title: '🛒 Proceder a compra',
            message: `Redirigiendo al proceso de compra de ${productoSeleccionado.nombre}`,
            color: 'blue',
            icon: <IconShoppingBag size={20} />
        });
        
        setModalProductoOpen(false);
    };

    if (loading) {
        return (
            <Center h="100vh">
                <Stack align="center">
                    <Loader size="lg" />
                    <Text>Cargando portal...</Text>
                </Stack>
            </Center>
        );
    }

    if (!empresa) {
        return (
            <Center h="100vh">
                <Stack align="center">
                    <IconBuilding size={48} color="red" />
                    <Title order={3}>Microempresa no encontrada</Title>
                    <Text c="dimmed">La microempresa que buscas no existe o no está disponible</Text>
                    <Button 
                        variant="light" 
                        onClick={() => navigate('/')}
                        leftSection={<IconArrowLeft size={16} />}
                    >
                        Volver al inicio
                    </Button>
                </Stack>
            </Center>
        );
    }

    return (
        <Box bg="gray.0" minHeight="100vh">
            {/* Header del portal */}
            <Paper bg="white" shadow="sm" radius={0} p="md">
                <Container size="xl">
                    <Group justify="space-between">
                        <Group>
                            <Avatar 
                                color="blue" 
                                radius="xl" 
                                size="lg"
                            >
                                {empresa.nombre.charAt(0)}
                            </Avatar>
                            <div>
                                <Title order={3}>{empresa.nombre}</Title>
                                <Text size="sm" c="dimmed">{empresa.rubro}</Text>
                            </div>
                        </Group>
                        
                        <Group>
                            <Button 
                                variant="light" 
                                onClick={() => navigate('/')}
                                leftSection={<IconArrowLeft size={16} />}
                            >
                                Volver
                            </Button>
                            {user && (
                                <Badge color="teal" variant="light">
                                    Cliente: {user.nombre}
                                </Badge>
                            )}
                        </Group>
                    </Group>
                </Container>
            </Paper>

            {/* Hero section */}
            <Box 
                bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
                py={60}
                style={{ color: 'white' }}
            >
                <Container size="xl">
                    <Stack align="center" gap="md">
                        <Title order={1} ta="center">
                            {empresa.nombre}
                        </Title>
                        <Text size="xl" ta="center" maw={800}>
                            {empresa.descripcion || 'Catálogo de productos de calidad'}
                        </Text>
                        
                        <Group>
                            <Badge variant="filled" size="lg">
                                <Group gap={4}>
                                    <IconPackage size={14} />
                                    <Text>{portalData?.estadisticas?.total_productos || 0} productos</Text>
                                </Group>
                            </Badge>
                            <Badge variant="light" size="lg">
                                <Group gap={4}>
                                    <IconCategory size={14} />
                                    <Text>{portalData?.estadisticas?.total_categorias || 0} categorías</Text>
                                </Group>
                            </Badge>
                        </Group>
                    </Stack>
                </Container>
            </Box>

            {/* Contenido principal */}
            <Container size="xl" py="xl">
                {/* Barra de herramientas */}
                <Paper p="md" mb="lg" radius="md" shadow="sm" withBorder>
                    <Grid gutter="md">
                        <Grid.Col span={{ base: 12, md: 5 }}>
                            <TextInput 
                                placeholder="Buscar productos..."
                                leftSection={<IconSearch size={16} />}
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                size="md"
                            />
                        </Grid.Col>
                        <Grid.Col span={{ base: 6, md: 3 }}>
                            <Select 
                                placeholder="Todas las categorías"
                                data={[
                                    { value: 'todas', label: 'Todas las categorías' },
                                    ...categorias.map(c => ({
                                        value: c.nombre,
                                        label: `${c.nombre} (${c.total_productos})`
                                    }))
                                ]}
                                value={categoriaSeleccionada}
                                onChange={setCategoriaSeleccionada}
                                size="md"
                                leftSection={<IconCategory size={16} />}
                            />
                        </Grid.Col>
                        <Grid.Col span={{ base: 6, md: 3 }}>
                            <Select 
                                placeholder="Ordenar por"
                                data={[
                                    { value: 'recientes', label: 'Más recientes' },
                                    { value: 'precio-asc', label: 'Precio: menor a mayor' },
                                    { value: 'precio-desc', label: 'Precio: mayor a menor' },
                                    { value: 'nombre', label: 'Nombre A-Z' }
                                ]}
                                value={orden}
                                onChange={setOrden}
                                size="md"
                                leftSection={<IconFilter size={16} />}
                            />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 1 }}>
                            <Button 
                                variant="light" 
                                fullWidth
                                onClick={cargarPortal}
                                leftSection={<IconRefresh size={16} />}
                                size="md"
                            >
                                Actualizar
                            </Button>
                        </Grid.Col>
                    </Grid>
                </Paper>

                {/* Información de la empresa */}
                <Card mb="lg" withBorder shadow="sm">
                    <Grid gutter="lg">
                        <Grid.Col span={{ base: 12, md: 8 }}>
                            <Stack>
                                <Title order={4}>Sobre {empresa.nombre}</Title>
                                <Text>{empresa.descripcion || 'Microempresa local ofreciendo productos de calidad.'}</Text>
                                
                                <Group>
                                    {empresa.direccion && (
                                        <Badge variant="light" leftSection={<IconMapPin size={12} />}>
                                            {empresa.direccion}
                                        </Badge>
                                    )}
                                    {empresa.telefono && (
                                        <Badge variant="light" leftSection={<IconPhone size={12} />}>
                                            {empresa.telefono}
                                        </Badge>
                                    )}
                                    {empresa.email && (
                                        <Badge variant="light" leftSection={<IconMail size={12} />}>
                                            {empresa.email}
                                        </Badge>
                                    )}
                                </Group>
                            </Stack>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 4 }}>
                            <Card withBorder>
                                <Stack gap="xs">
                                    <Group justify="space-between">
                                        <Text size="sm" c="dimmed">Productos disponibles</Text>
                                        <Text fw={700}>{portalData?.estadisticas?.total_productos || 0}</Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm" c="dimmed">Categorías</Text>
                                        <Text fw={700}>{portalData?.estadisticas?.total_categorias || 0}</Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm" c="dimmed">Rubro</Text>
                                        <Badge>{empresa.rubro}</Badge>
                                    </Group>
                                </Stack>
                            </Card>
                        </Grid.Col>
                    </Grid>
                </Card>

                {/* Lista de productos */}
                {productosPaginados.length > 0 ? (
                    <>
                        <SimpleGrid 
                            cols={{ base: 1, sm: 2, md: 3, lg: 4 }} 
                            spacing="lg"
                            mb="lg"
                        >
                            {productosPaginados.map(producto => (
                                <Card 
                                    key={producto.id_producto} 
                                    shadow="sm" 
                                    padding="lg" 
                                    radius="md" 
                                    withBorder
                                    style={{ 
                                        transition: 'transform 0.2s',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        height: '100%'
                                    }}
                                    onClick={() => handleVerProducto(producto)}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <Card.Section>
                                        {producto.imagen_url ? (
                                            <Image
                                                src={`http://localhost:3000/uploads/productos/${producto.imagen_url}`}
                                                height={200}
                                                alt={producto.nombre}
                                                style={{ objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <Center h={200} bg="gray.1">
                                                <IconPackage size={48} color="gray" />
                                            </Center>
                                        )}
                                    </Card.Section>

                                    <Stack gap="xs" mt="md" style={{ flex: 1 }}>
                                        <Text fw={500} size="lg" lineClamp={1}>
                                            {producto.nombre}
                                        </Text>
                                        
                                        {producto.categoria && (
                                            <Badge variant="light" color="blue" size="sm">
                                                {producto.categoria}
                                            </Badge>
                                        )}
                                        
                                        <Text size="sm" c="dimmed" lineClamp={2}>
                                            {producto.descripcion || 'Sin descripción'}
                                        </Text>
                                        
                                        <Group justify="space-between" mt="auto">
                                            <Text fw={700} size="xl" c="green">
                                                ${parseFloat(producto.precio).toFixed(2)}
                                            </Text>
                                            <Badge 
                                                color={producto.stock_actual > 0 ? 'green' : 'red'}
                                                variant="light"
                                            >
                                                {producto.stock_actual > 0 ? 'En stock' : 'Agotado'}
                                            </Badge>
                                        </Group>
                                        
                                        <Button 
                                            fullWidth 
                                            mt="sm"
                                            color="blue"
                                            leftSection={<IconEye size={16} />}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleVerProducto(producto);
                                            }}
                                        >
                                            Ver detalles
                                        </Button>
                                    </Stack>
                                </Card>
                            ))}
                        </SimpleGrid>

                        {/* Paginación */}
                        {totalPaginas > 1 && (
                            <Center>
                                <Pagination 
                                    value={paginaActual} 
                                    onChange={setPaginaActual} 
                                    total={totalPaginas}
                                    withEdges
                                    size="md"
                                />
                            </Center>
                        )}
                    </>
                ) : (
                    <Center py={40}>
                        <Stack align="center">
                            <IconPackage size={48} color="gray" />
                            <Title order={4}>No hay productos disponibles</Title>
                            <Text c="dimmed">
                                {busqueda || categoriaSeleccionada !== 'todas' ? 
                                    'No se encontraron productos con los filtros aplicados' : 
                                    'Esta microempresa no tiene productos publicados aún'
                                }
                            </Text>
                            {(busqueda || categoriaSeleccionada !== 'todas') && (
                                <Button 
                                    variant="light" 
                                    onClick={() => {
                                        setBusqueda('');
                                        setCategoriaSeleccionada('todas');
                                    }}
                                >
                                    Limpiar filtros
                                </Button>
                            )}
                        </Stack>
                    </Center>
                )}

                {/* Categorías disponibles */}
                {categorias.length > 0 && (
                    <Card mt="xl" withBorder shadow="sm">
                        <Title order={4} mb="md">Categorías</Title>
                        <Group gap="xs">
                            {categorias.map(categoria => (
                                <Badge 
                                    key={categoria.nombre}
                                    size="lg"
                                    variant={categoriaSeleccionada === categoria.nombre ? 'filled' : 'light'}
                                    color="blue"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setCategoriaSeleccionada(
                                        categoriaSeleccionada === categoria.nombre ? 'todas' : categoria.nombre
                                    )}
                                    leftSection={<IconCategory size={14} />}
                                >
                                    {categoria.nombre} ({categoria.total_productos})
                                </Badge>
                            ))}
                        </Group>
                    </Card>
                )}
            </Container>

            {/* Footer del portal */}
            <Paper bg="dark.7" py="xl" mt="xl">
                <Container size="xl">
                    <Grid>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                            <Stack>
                                <Title order={4} c="white">{empresa.nombre}</Title>
                                <Text c="gray.5">{empresa.descripcion}</Text>
                                <Group>
                                    {empresa.direccion && (
                                        <Text size="sm" c="gray.5">
                                            <IconMapPin size={14} style={{ marginRight: 4 }} />
                                            {empresa.direccion}
                                        </Text>
                                    )}
                                    {empresa.telefono && (
                                        <Text size="sm" c="gray.5">
                                            <IconPhone size={14} style={{ marginRight: 4 }} />
                                            {empresa.telefono}
                                        </Text>
                                    )}
                                </Group>
                            </Stack>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                            <Stack align="flex-end">
                                <Text c="gray.5" size="sm">
                                    © {new Date().getFullYear()} {empresa.nombre}. Todos los derechos reservados.
                                </Text>
                                <Button 
                                    variant="light" 
                                    onClick={() => navigate('/')}
                                    leftSection={<IconHome size={16} />}
                                >
                                    Ver más microempresas
                                </Button>
                            </Stack>
                        </Grid.Col>
                    </Grid>
                </Container>
            </Paper>

            {/* Modal de detalle de producto */}
            <Modal 
                opened={modalProductoOpen} 
                onClose={() => setModalProductoOpen(false)}
                title="Detalles del Producto"
                size="lg"
                centered
            >
                {productoSeleccionado && (
                    <Stack gap="md">
                        {productoSeleccionado.imagen_url && (
                            <Center>
                                <Image
                                    src={`http://localhost:3000/uploads/productos/${productoSeleccionado.imagen_url}`}
                                    height={300}
                                    width="100%"
                                    alt={productoSeleccionado.nombre}
                                    radius="md"
                                    style={{ objectFit: 'cover' }}
                                />
                            </Center>
                        )}
                        
                        <div>
                            <Title order={3}>{productoSeleccionado.nombre}</Title>
                            {productoSeleccionado.categoria && (
                                <Badge variant="light" color="blue" mt={4}>
                                    {productoSeleccionado.categoria}
                                </Badge>
                            )}
                        </div>
                        
                        <Text>{productoSeleccionado.descripcion || 'Sin descripción'}</Text>
                        
                        <Grid gutter="md">
                            <Grid.Col span={6}>
                                <Paper withBorder p="md" radius="md">
                                    <Text size="sm" c="dimmed">Precio</Text>
                                    <Text fw={700} size="xl" c="green">
                                        ${parseFloat(productoSeleccionado.precio).toFixed(2)}
                                    </Text>
                                </Paper>
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <Paper withBorder p="md" radius="md">
                                    <Text size="sm" c="dimmed">Disponibilidad</Text>
                                    <Badge 
                                        size="lg" 
                                        color={productoSeleccionado.stock_actual > 0 ? 'green' : 'red'}
                                        variant="light"
                                    >
                                        {productoSeleccionado.stock_actual > 0 ? 
                                            `${productoSeleccionado.stock_actual} unidades disponibles` : 
                                            'Agotado'
                                        }
                                    </Badge>
                                </Paper>
                            </Grid.Col>
                        </Grid>
                        
                        {productoSeleccionado.stock_actual > 0 && (
                            <>
                                <Divider />
                                
                                <Grid gutter="md">
                                    <Grid.Col span={6}>
                                        <NumberInput 
                                            label="Cantidad"
                                            value={cantidadCarrito}
                                            onChange={setCantidadCarrito}
                                            min={1}
                                            max={productoSeleccionado.stock_actual}
                                            size="md"
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={6}>
                                        <Paper withBorder p="md" radius="md">
                                            <Text size="sm" c="dimmed">Subtotal</Text>
                                            <Text fw={700} size="lg">
                                                ${(productoSeleccionado.precio * cantidadCarrito).toFixed(2)}
                                            </Text>
                                        </Paper>
                                    </Grid.Col>
                                </Grid>
                                
                                <Group grow>
                                    <Button 
                                        variant="light" 
                                        color="blue"
                                        leftSection={<IconShoppingCart size={16} />}
                                        onClick={handleAgregarCarrito}
                                    >
                                        Agregar al carrito
                                    </Button>
                                    <Button 
                                        color="green"
                                        leftSection={<IconShoppingBag size={16} />}
                                        onClick={handleComprarAhora}
                                    >
                                        Comprar ahora
                                    </Button>
                                </Group>
                            </>
                        )}
                        
                        <Alert 
                            color="blue" 
                            variant="light"
                            title="Información de la empresa"
                            icon={<IconInfoCircle size={20} />}
                        >
                            <Text size="sm">
                                Este producto es ofrecido por <strong>{empresa.nombre}</strong>. 
                                Para consultas específicas sobre el producto, contacta directamente con la empresa.
                            </Text>
                        </Alert>
                    </Stack>
                )}
            </Modal>
        </Box>
    );
};

export default PortalMicroempresa;