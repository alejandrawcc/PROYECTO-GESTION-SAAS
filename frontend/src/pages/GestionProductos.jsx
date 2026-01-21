import { 
    Container, Title, Text, Card, Table, Button, Group, Badge, Modal,
    TextInput, Select, Stack, ActionIcon, Tooltip, Center, Loader,
    Paper, SimpleGrid, NumberInput, Textarea, FileInput, Image,
    Alert, Divider, Tabs, ScrollArea, Grid, TextInput as MantineTextInput,
    rem, Box, Pagination, Switch, ThemeIcon, Notification
} from '@mantine/core';
import { 
    IconPlus, IconSearch, IconFilterOff, IconBuildingStore, 
    IconPencil, IconMail, IconUser, IconAlertCircle, IconCategory,
    IconPackage, IconPhoto, IconShoppingCart, IconEye, IconRefresh,
    IconTrash, IconCheck, IconX, IconBell, IconListDetails,
    IconUpload, IconEdit, IconEyeOff, IconEyeCheck, IconDeviceFloppy,
    IconArrowBack, IconArrowRight, IconInfoCircle, IconDiscount,
    IconCurrencyDollar, IconBasket, IconChartBar
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { getCurrentUser } from '../services/auth';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const GestionProductos = () => {
    const user = getCurrentUser();
    const isAdmin = ['administrador', 'super_admin'].includes(user?.rol);
    const navigate = useNavigate();

    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalCategoriaOpen, setModalCategoriaOpen] = useState(false);
    const [notificaciones, setNotificaciones] = useState([]);
    const [activeTab, setActiveTab] = useState('productos');
    
    // Estados para formularios
    const [nuevoProducto, setNuevoProducto] = useState({
        nombre: '',
        descripcion: '',
        precio: '',
        stock_actual: 1,
        categoria: '',
        stock_minimo: 5,
        imagen: null
    });
    
    const [nuevaCategoria, setNuevaCategoria] = useState({
        nombre: '',
        descripcion: ''
    });

    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState('todas');
    const [filtroStock, setFiltroStock] = useState('todas');
    const [paginaActual, setPaginaActual] = useState(1);
    const itemsPorPagina = 10;

    // Cargar datos
    useEffect(() => {
        cargarDatos();
    }, [activeTab]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            // Cargar productos
            const params = new URLSearchParams();
            if (filtroStock !== 'todas') {
                params.append('conStock', filtroStock === 'con-stock' ? 'true' : 'false');
            }
            if (filtroCategoria !== 'todas') {
                params.append('categoria', filtroCategoria);
            }

            const resProductos = await api.get(`/productos/empresa?${params.toString()}`);
            setProductos(resProductos.data || []);
            
            // Cargar categorías
            const resCategorias = await api.get('/categorias/empresa');
            setCategorias(resCategorias.data || []);

            // Cargar notificaciones (solo admin)
            if (isAdmin) {
                try {
                    const resNotificaciones = await api.get('/productos/notificaciones/stock');
                    setNotificaciones(resNotificaciones.data || []);
                } catch (error) {
                    console.warn("Error cargando notificaciones:", error);
                }
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
            notifications.show({ 
                title: 'Error', 
                message: 'Error al cargar datos', 
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
        
        const matchCategoria = filtroCategoria === 'todas' || 
            (filtroCategoria === 'sin-categoria' && !producto.categoria) ||
            producto.categoria === filtroCategoria;
        
        const matchStock = filtroStock === 'todas' ||
            (filtroStock === 'con-stock' && producto.stock_actual > 0) ||
            (filtroStock === 'sin-stock' && producto.stock_actual === 0);
        
        return matchBusqueda && matchCategoria && matchStock;
    });

    // Paginación
    const totalPaginas = Math.ceil(productosFiltrados.length / itemsPorPagina);
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    const productosPaginados = productosFiltrados.slice(inicio, fin);

    // Handlers
    const handleCrearProducto = async () => {
        try {
            const formData = new FormData();
            formData.append('nombre', nuevoProducto.nombre);
            formData.append('descripcion', nuevoProducto.descripcion);
            formData.append('precio', nuevoProducto.precio);
            formData.append('stock_actual', nuevoProducto.stock_actual);
            formData.append('categoria', nuevoProducto.categoria);
            formData.append('stock_minimo', nuevoProducto.stock_minimo);
            
            if (nuevoProducto.imagen) {
                formData.append('imagen', nuevoProducto.imagen);
            }

            const response = await api.post('/productos', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            notifications.show({
                title: 'Producto creado',
                message: `${nuevoProducto.nombre} ha sido agregado`,
                color: 'green',
                icon: <IconCheck size={20} />
            });

            setModalOpen(false);
            setNuevoProducto({
                nombre: '', descripcion: '', precio: '', stock_actual: 1,
                categoria: '', stock_minimo: 5, imagen: null
            });
            cargarDatos();
        } catch (error) {
            notifications.show({
                title: '❌ Error',
                message: error.response?.data?.message || 'No se pudo crear el producto',
                color: 'red',
                icon: <IconX size={20} />
            });
        }
    };

    const handleCrearCategoria = async () => {
        try {
            await api.post('/categorias', nuevaCategoria);
            
            notifications.show({
                title: 'Categoría creada',
                message: `Categoría "${nuevaCategoria.nombre}" agregada`,
                color: 'green',
                icon: <IconCheck size={20} />
            });

            setModalCategoriaOpen(false);
            setNuevaCategoria({ nombre: '', descripcion: '' });
            cargarDatos();
        } catch (error) {
            notifications.show({
                title: '❌ Error',
                message: error.response?.data?.message || 'No se pudo crear la categoría',
                color: 'red',
                icon: <IconX size={20} />
            });
        }
    };

    const handleActualizarStock = async (id, nuevoStock) => {
        try {
            await api.put(`/productos/${id}/stock`, { nuevoStock });
            
            notifications.show({
                title: 'Stock actualizado',
                message: `Stock modificado a ${nuevoStock} unidades`,
                color: 'green',
                icon: <IconCheck size={20} />
            });

            cargarDatos();
        } catch (error) {
            notifications.show({
                title: '❌ Error',
                message: 'No se pudo actualizar el stock',
                color: 'red',
                icon: <IconX size={20} />
            });
        }
    };

    const handleMarcarNotificacionLeida = async (id) => {
        try {
            await api.put(`/productos/notificaciones/${id}/leida`);
            
            setNotificaciones(prev => prev.filter(n => n.id_notificacion !== id));
            notifications.show({
                title: 'Notificación marcada',
                message: 'Notificación marcada como leída',
                color: 'blue',
                icon: <IconCheck size={20} />
            });
        } catch (error) {
            notifications.show({
                title: '❌ Error',
                message: 'No se pudo marcar la notificación',
                color: 'red',
                icon: <IconX size={20} />
            });
        }
    };

    const handleEliminarProducto = async (id, nombre) => {
        if (!confirm(`¿Estás seguro de eliminar el producto "${nombre}"?`)) return;
        
        try {
            await api.delete(`/productos/${id}`);
            
            notifications.show({
                title: 'Producto eliminado',
                message: `Producto "${nombre}" eliminado`,
                color: 'green',
                icon: <IconCheck size={20} />
            });

            cargarDatos();
        } catch (error) {
            notifications.show({
                title: '❌ Error',
                message: 'No se pudo eliminar el producto',
                color: 'red',
                icon: <IconX size={20} />
            });
        }
    };

    // Renderizar estadísticas
    const renderEstadisticas = () => {
        const totalProductos = productos.length;
        const conStock = productos.filter(p => p.stock_actual > 0).length;
        const sinStock = productos.filter(p => p.stock_actual === 0).length;
        const visiblePortal = productos.filter(p => p.visible_portal === 1).length;

        return (
            <SimpleGrid cols={4} mb="lg">
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Total Productos</Text>
                            <Text fw={700} size="xl">{totalProductos}</Text>
                        </div>
                        <ThemeIcon color="blue" variant="light" size="lg">
                            <IconPackage size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>
                
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Con Stock</Text>
                            <Text fw={700} size="xl" c="green">{conStock}</Text>
                        </div>
                        <ThemeIcon color="green" variant="light" size="lg">
                            <IconCheck size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>
                
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Sin Stock</Text>
                            <Text fw={700} size="xl" c="red">{sinStock}</Text>
                        </div>
                        <ThemeIcon color="red" variant="light" size="lg">
                            <IconX size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>
                
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Visibles en Portal</Text>
                            <Text fw={700} size="xl" c="blue">{visiblePortal}</Text>
                        </div>
                        <ThemeIcon color="cyan" variant="light" size="lg">
                            <IconEye size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>
            </SimpleGrid>
        );
    };

    // Renderizar productos
    const renderProductos = () => (
        <>
            {renderEstadisticas()}
            
            {/* Barra de filtros */}
            <Paper p="md" mb="md" radius="md" withBorder>
                <Grid gutter="md">
                    <Grid.Col span={{ base: 12, md: 4 }}>
                        <TextInput 
                            placeholder="Buscar productos..."
                            leftSection={<IconSearch size={16} />}
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </Grid.Col>
                    <Grid.Col span={{ base: 6, md: 3 }}>
                        <Select 
                            placeholder="Filtrar por categoría"
                            data={[
                                { value: 'todas', label: 'Todas las categorías' },
                                { value: 'sin-categoria', label: 'Sin categoría' },
                                ...categorias.map(c => ({
                                    value: c.nombre,
                                    label: `${c.nombre} (${c.total_productos || 0})`
                                }))
                            ]}
                            value={filtroCategoria}
                            onChange={setFiltroCategoria}
                        />
                    </Grid.Col>
                    <Grid.Col span={{ base: 6, md: 3 }}>
                        <Select 
                            placeholder="Filtrar por stock"
                            data={[
                                { value: 'todas', label: 'Todos' },
                                { value: 'con-stock', label: 'Con stock' },
                                { value: 'sin-stock', label: 'Sin stock' }
                            ]}
                            value={filtroStock}
                            onChange={setFiltroStock}
                        />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 2 }}>
                        <Group>
                            <ActionIcon 
                                variant="light" 
                                color="red" 
                                onClick={() => {
                                    setBusqueda('');
                                    setFiltroCategoria('todas');
                                    setFiltroStock('todas');
                                }}
                                title="Limpiar filtros"
                            >
                                <IconFilterOff size={16} />
                            </ActionIcon>
                            <Button 
                                variant="light" 
                                leftSection={<IconRefresh size={16} />}
                                onClick={cargarDatos}
                                loading={loading}
                            >
                                Actualizar
                            </Button>
                        </Group>
                    </Grid.Col>
                </Grid>
            </Paper>

            {/* Tabla de productos */}
            <Card shadow="sm" padding={0} radius="md" withBorder>
                <ScrollArea>
                    <Table verticalSpacing="md" highlightOnHover>
                        <Table.Thead bg="gray.1">
                            <Table.Tr>
                                <Table.Th>Producto</Table.Th>
                                <Table.Th>Categoría</Table.Th>
                                <Table.Th>Precio</Table.Th>
                                <Table.Th>Stock</Table.Th>
                                <Table.Th>Estado</Table.Th>
                                <Table.Th>Portal</Table.Th>
                                <Table.Th>Acciones</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {productosPaginados.map(producto => (
                                <Table.Tr key={producto.id_producto}>
                                    <Table.Td>
                                        <Group>
                                            {producto.imagen_url && (
                                                <Image 
                                                    src={`http://localhost:3000/uploads/productos/${producto.imagen_url}`}
                                                    width={50} 
                                                    height={50} 
                                                    radius="sm"
                                                    alt={producto.nombre}
                                                    style={{ objectFit: 'cover' }}
                                                />
                                            )}
                                            <div>
                                                <Text fw={500}>{producto.nombre}</Text>
                                                <Text size="xs" c="dimmed" lineClamp={1}>
                                                    {producto.descripcion || 'Sin descripción'}
                                                </Text>
                                            </div>
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge variant="light" color="blue">
                                            {producto.categoria || 'Sin categoría'}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text fw={600} c="green">
                                            ${parseFloat(producto.precio).toFixed(2)}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group>
                                            <NumberInput 
                                                value={producto.stock_actual}
                                                onChange={(val) => handleActualizarStock(producto.id_producto, val)}
                                                min={0}
                                                size="xs"
                                                w={80}
                                            />
                                            <Text size="xs" c="dimmed">
                                                Mín: {producto.stock_minimo || 5}
                                            </Text>
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge 
                                            color={producto.stock_actual > 0 ? 'green' : 'red'}
                                            variant="light"
                                        >
                                            {producto.stock_actual > 0 ? 'Disponible' : 'Agotado'}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge 
                                            color={producto.visible_portal ? 'blue' : 'gray'}
                                            variant="light"
                                            leftSection={producto.visible_portal ? 
                                                <IconEyeCheck size={12} /> : 
                                                <IconEyeOff size={12} />
                                            }
                                        >
                                            {producto.visible_portal ? 'Visible' : 'Oculto'}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <Tooltip label="Ver en portal">
                                                <ActionIcon 
                                                    variant="subtle" 
                                                    color="blue"
                                                    onClick={() => navigate(`/portal/${user.microempresa_id}`)}
                                                >
                                                    <IconEye size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                            <Tooltip label="Editar">
                                                <ActionIcon variant="subtle" color="yellow">
                                                    <IconPencil size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                            <Tooltip label="Eliminar">
                                                <ActionIcon 
                                                    variant="subtle" 
                                                    color="red"
                                                    onClick={() => handleEliminarProducto(producto.id_producto, producto.nombre)}
                                                >
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>

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

            {/* Sin resultados */}
            {!loading && productosPaginados.length === 0 && (
                <Center py={40}>
                    <Stack align="center">
                        <IconPackage size={48} color="gray" />
                        <Text c="dimmed">No se encontraron productos</Text>
                        <Button 
                            variant="light" 
                            onClick={() => setModalOpen(true)}
                        >
                            Crear primer producto
                        </Button>
                    </Stack>
                </Center>
            )}
        </>
    );

    // Renderizar notificaciones
    const renderNotificaciones = () => (
        <Stack>
            {notificaciones.length > 0 ? (
                notificaciones.map(notif => (
                    <Alert 
                        key={notif.id_notificacion}
                        color={notif.tipo === 'agotado' ? 'red' : 'orange'}
                        title={notif.tipo === 'agotado' ? 'Producto Agotado' : 'Stock Bajo'}
                        icon={notif.tipo === 'agotado' ? <IconX size={20} /> : <IconAlertCircle size={20} />}
                        variant="light"
                        radius="md"
                    >
                        <Group justify="space-between">
                            <div>
                                <Text fw={500}>{notif.producto_nombre}</Text>
                                <Text size="sm" c="dimmed">{notif.mensaje}</Text>
                                <Text size="xs" c="dimmed" mt={4}>
                                    Stock actual: {notif.stock_actual} | Stock mínimo: {notif.stock_minimo}
                                </Text>
                            </div>
                            <Button 
                                size="xs" 
                                variant="light"
                                onClick={() => handleMarcarNotificacionLeida(notif.id_notificacion)}
                            >
                                Marcar como leída
                            </Button>
                        </Group>
                    </Alert>
                ))
            ) : (
                <Center py={40}>
                    <Stack align="center">
                        <IconBell size={48} color="gray" />
                        <Text c="dimmed">No hay notificaciones</Text>
                    </Stack>
                </Center>
            )}
        </Stack>
    );

    return (
        <Container size="xl" py="xl">
            {/* Header */}
            <Group justify="space-between" align="flex-start" mb="lg">
                <div>
                    <Title order={2}>Gestión de Productos</Title>
                    <Text c="dimmed">Administra el catálogo de {user.empresa_nombre}</Text>
                </div>
                <Group>
                    <Button 
                        leftSection={<IconCategory size={18} />} 
                        variant="light"
                        onClick={() => setModalCategoriaOpen(true)}
                    >
                        Nueva Categoría
                    </Button>
                    <Button 
                        leftSection={<IconPlus size={18} />} 
                        color="blue"
                        onClick={() => setModalOpen(true)}
                    >
                        Nuevo Producto
                    </Button>
                </Group>
            </Group>

            {/* Tabs */}
            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List mb="md">
                    <Tabs.Tab 
                        value="productos" 
                        leftSection={<IconPackage size={16} />}
                        rightSection={
                            <Badge size="xs" variant="light" color="blue">
                                {productos.length}
                            </Badge>
                        }
                    >
                        Productos
                    </Tabs.Tab>
                    {isAdmin && (
                        <Tabs.Tab 
                            value="notificaciones" 
                            leftSection={<IconBell size={16} />}
                            rightSection={
                                <Badge size="xs" variant="light" color="red">
                                    {notificaciones.length}
                                </Badge>
                            }
                        >
                            Notificaciones
                        </Tabs.Tab>
                    )}
                </Tabs.List>

                {/* Contenido de los tabs */}
                <Tabs.Panel value="productos">
                    {loading ? (
                        <Center py={40}>
                            <Loader />
                        </Center>
                    ) : (
                        renderProductos()
                    )}
                </Tabs.Panel>

                <Tabs.Panel value="notificaciones">
                    {renderNotificaciones()}
                </Tabs.Panel>
            </Tabs>

            {/* Modal para crear producto */}
            <Modal 
                opened={modalOpen} 
                onClose={() => setModalOpen(false)}
                title="Crear Nuevo Producto"
                size="lg"
            >
                <form onSubmit={(e) => { e.preventDefault(); handleCrearProducto(); }}>
                    <Stack gap="md">
                        <TextInput 
                            label="Nombre del producto"
                            placeholder="Ej: Pijama infantil autosis"
                            required
                            value={nuevoProducto.nombre}
                            onChange={(e) => setNuevoProducto({...nuevoProducto, nombre: e.target.value})}
                        />
                        
                        <Textarea 
                            label="Descripción"
                            placeholder="Describe el producto..."
                            rows={3}
                            value={nuevoProducto.descripcion}
                            onChange={(e) => setNuevoProducto({...nuevoProducto, descripcion: e.target.value})}
                        />
                        
                        <Grid gutter="md">
                            <Grid.Col span={6}>
                                <NumberInput 
                                    label="Precio ($)"
                                    required
                                    min={0}
                                    step={0.01}
                                    value={nuevoProducto.precio}
                                    onChange={(val) => setNuevoProducto({...nuevoProducto, precio: val})}
                                    leftSection={<IconCurrencyDollar size={16} />}
                                />
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <NumberInput 
                                    label="Stock inicial"
                                    required
                                    min={0}
                                    value={nuevoProducto.stock_actual}
                                    onChange={(val) => setNuevoProducto({...nuevoProducto, stock_actual: val})}
                                    description={nuevoProducto.stock_actual === 0 ? 
                                        "⚠️ Producto no será visible en el portal" : 
                                        "✅ Producto será visible en el portal"
                                    }
                                />
                            </Grid.Col>
                        </Grid>
                        
                        <Grid gutter="md">
                            <Grid.Col span={6}>
                                <Select 
                                    label="Categoría"
                                    placeholder="Selecciona una categoría"
                                    data={categorias.map(c => ({
                                        value: c.nombre,
                                        label: c.nombre
                                    }))}
                                    value={nuevoProducto.categoria}
                                    onChange={(val) => setNuevoProducto({...nuevoProducto, categoria: val})}
                                    clearable
                                    searchable
                                />
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <NumberInput 
                                    label="Stock mínimo alerta"
                                    min={1}
                                    value={nuevoProducto.stock_minimo}
                                    onChange={(val) => setNuevoProducto({...nuevoProducto, stock_minimo: val})}
                                    description="Notificación cuando stock sea menor"
                                />
                            </Grid.Col>
                        </Grid>
                        
                        <FileInput 
                            label="Imagen del producto"
                            placeholder="Selecciona una imagen"
                            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                            value={nuevoProducto.imagen}
                            onChange={(file) => setNuevoProducto({...nuevoProducto, imagen: file})}
                            leftSection={<IconPhoto size={16} />}
                            clearable
                        />
                        
                        {nuevoProducto.imagen && (
                            <Box>
                                <Text size="sm" mb="xs">Vista previa:</Text>
                                <Image 
                                    src={URL.createObjectURL(nuevoProducto.imagen)}
                                    height={100}
                                    width={100}
                                    radius="sm"
                                    alt="Vista previa"
                                />
                            </Box>
                        )}
                        
                        <Group justify="flex-end" mt="md">
                            <Button variant="default" onClick={() => setModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                color="blue"
                                leftSection={<IconDeviceFloppy size={16} />}
                            >
                                Guardar Producto
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            {/* Modal para crear categoría */}
            <Modal 
                opened={modalCategoriaOpen} 
                onClose={() => setModalCategoriaOpen(false)}
                title="Crear Nueva Categoría"
                size="md"
            >
                <form onSubmit={(e) => { e.preventDefault(); handleCrearCategoria(); }}>
                    <Stack gap="md">
                        <TextInput 
                            label="Nombre de la categoría"
                            placeholder="Ej: Niños, Mujeres, Hogar"
                            required
                            value={nuevaCategoria.nombre}
                            onChange={(e) => setNuevaCategoria({...nuevaCategoria, nombre: e.target.value})}
                        />
                        
                        <Textarea 
                            label="Descripción (opcional)"
                            placeholder="Describe la categoría..."
                            rows={3}
                            value={nuevaCategoria.descripcion}
                            onChange={(e) => setNuevaCategoria({...nuevaCategoria, descripcion: e.target.value})}
                        />
                        
                        <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                            <Text size="sm">
                                Los productos se podrán clasificar en esta categoría para facilitar su búsqueda en el portal.
                            </Text>
                        </Alert>
                        
                        <Group justify="flex-end" mt="md">
                            <Button variant="default" onClick={() => setModalCategoriaOpen(false)}>
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                color="blue"
                                leftSection={<IconCategory size={16} />}
                            >
                                Crear Categoría
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Container>
    );
};

export default GestionProductos;