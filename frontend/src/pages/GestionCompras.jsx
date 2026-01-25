import { 
    Container, Title, Text, Card, Table, Button, Group, Badge, Modal,
    TextInput, Select, Stack, ActionIcon, Tooltip, Center, Loader,
    Paper, SimpleGrid, NumberInput, Alert, Divider, Tabs, ScrollArea,
    Grid, Textarea, Pagination, ThemeIcon, Box
} from '@mantine/core';
import { 
    IconPlus, IconSearch, IconFilter, IconRefresh, IconEye,
    IconTrash, IconCheck, IconX, IconShoppingBag, IconTrendingUp,
    IconPackage, IconBuildingStore, IconCalendar, IconReceipt,
    IconCash, IconArrowRight, IconDownload, IconChartBar,
    IconListDetails, IconAlertCircle, IconInfoCircle, IconDeviceFloppy
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { getCurrentUser } from '../services/auth';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const GestionCompras = () => {
    const user = getCurrentUser();
    const navigate = useNavigate();
    
    // Estados principales
    const [compras, setCompras] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalDetallesOpen, setModalDetallesOpen] = useState(false);
    const [compraSeleccionada, setCompraSeleccionada] = useState(null);
    const [detallesCompra, setDetallesCompra] = useState(null);
    
    // Estados para formularios
    const [nuevaCompra, setNuevaCompra] = useState({
        proveedor_id: '',
        numero_factura: '',
        tipo_pago: 'efectivo',
        observaciones: '',
        productos: []
    });
    
    // Estado para productos en la compra
    const [productosCompra, setProductosCompra] = useState([]);
    
    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroProveedor, setFiltroProveedor] = useState('todos');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);
    const itemsPorPagina = 10;

    // Cargar datos iniciales
    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            // Cargar compras
            const params = new URLSearchParams();
            if (filtroProveedor !== 'todos') params.append('proveedor_id', filtroProveedor);
            if (fechaInicio) params.append('fecha_inicio', fechaInicio);
            if (fechaFin) params.append('fecha_fin', fechaFin);
            
            const resCompras = await api.get(`/compras?${params.toString()}`);
            setCompras(resCompras.data || []);
            
            // Cargar proveedores
            const resProveedores = await api.get('/proveedores/select');
            setProveedores(resProveedores.data || []);
            
            // Cargar productos
            const resProductos = await api.get('/compras/productos');
            setProductos(resProductos.data || []);
            
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

    // Handlers para productos en la compra
    const agregarProductoCompra = (producto) => {
        const existe = productosCompra.find(p => p.id_producto === producto.id_producto);
        
        if (existe) {
            setProductosCompra(prev => 
                prev.map(p => 
                    p.id_producto === producto.id_producto 
                    ? { ...p, cantidad: p.cantidad + 1 } 
                    : p
                )
            );
        } else {
            setProductosCompra(prev => [
                ...prev,
                {
                    id_producto: producto.id_producto,
                    producto_nombre: producto.nombre,
                    cantidad: 1,
                    precio_unitario: producto.precio_actual || 0,
                    stock_actual: producto.stock_actual
                }
            ]);
        }
    };

    const actualizarProductoCompra = (id, campo, valor) => {
        setProductosCompra(prev => 
            prev.map(p => 
                p.id_producto === id 
                ? { ...p, [campo]: valor } 
                : p
            )
        );
    };

    const eliminarProductoCompra = (id) => {
        setProductosCompra(prev => prev.filter(p => p.id_producto !== id));
    };

    // Calcular total de la compra
    const calcularTotalCompra = () => {
        return productosCompra.reduce((total, producto) => {
            return total + (producto.cantidad * producto.precio_unitario);
        }, 0);
    };

    // Handler para crear compra
    const handleCrearCompra = async () => {
        if (productosCompra.length === 0) {
            notifications.show({
                title: 'Error',
                message: 'Agrega al menos un producto a la compra',
                color: 'red'
            });
            return;
        }

        if (!nuevaCompra.proveedor_id) {
            notifications.show({
                title: 'Error',
                message: 'Selecciona un proveedor',
                color: 'red'
            });
            return;
        }

        try {
            const compraData = {
                ...nuevaCompra,
                productos: productosCompra.map(p => ({
                    id_producto: p.id_producto,
                    cantidad: p.cantidad,
                    precio_unitario: p.precio_unitario
                }))
            };

            await api.post('/compras', compraData);
            
            notifications.show({
                title: '✅ Compra registrada',
                message: 'La compra se registró exitosamente y el stock se actualizó',
                color: 'green',
                icon: <IconCheck size={20} />
            });

            // Limpiar formulario
            setNuevaCompra({
                proveedor_id: '',
                numero_factura: '',
                tipo_pago: 'efectivo',
                observaciones: '',
                productos: []
            });
            setProductosCompra([]);
            setModalOpen(false);
            cargarDatos();
            
        } catch (error) {
            notifications.show({
                title: '❌ Error',
                message: error.response?.data?.message || 'Error al registrar la compra',
                color: 'red',
                icon: <IconX size={20} />
            });
        }
    };

    // Handler para ver detalles
    const verDetallesCompra = async (id) => {
        try {
            const res = await api.get(`/compras/${id}`);
            setDetallesCompra(res.data);
            setCompraSeleccionada(id);
            setModalDetallesOpen(true);
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Error al cargar detalles',
                color: 'red'
            });
        }
    };

    // Filtrar compras
    const comprasFiltradas = compras.filter(compra => {
        const matchBusqueda = busqueda ? 
            compra.numero_factura?.toLowerCase().includes(busqueda.toLowerCase()) ||
            compra.proveedor_nombre?.toLowerCase().includes(busqueda.toLowerCase()) : true;
        
        return matchBusqueda;
    });

    // Paginación
    const totalPaginas = Math.ceil(comprasFiltradas.length / itemsPorPagina);
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    const comprasPaginadas = comprasFiltradas.slice(inicio, fin);

    // Renderizar estadísticas
    const renderEstadisticas = () => {
        const totalCompras = compras.length;
        const totalInvertido = compras.reduce((sum, c) => sum + parseFloat(c.total || 0), 0);
        const comprasEsteMes = compras.filter(c => {
            const fechaCompra = new Date(c.fecha);
            const hoy = new Date();
            return fechaCompra.getMonth() === hoy.getMonth() && 
                   fechaCompra.getFullYear() === hoy.getFullYear();
        }).length;

        return (
            <SimpleGrid cols={3} mb="lg">
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Total Compras</Text>
                            <Text fw={700} size="xl">{totalCompras}</Text>
                        </div>
                        <ThemeIcon color="blue" variant="light" size="lg">
                            <IconShoppingBag size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>
                
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Total Invertido</Text>
                            <Text fw={700} size="xl" c="green">
                                Bs {totalInvertido.toFixed(2)}
                            </Text>
                        </div>
                        <ThemeIcon color="green" variant="light" size="lg">
                            <IconTrendingUp size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>
                
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Compras este mes</Text>
                            <Text fw={700} size="xl" c="orange">{comprasEsteMes}</Text>
                        </div>
                        <ThemeIcon color="orange" variant="light" size="lg">
                            <IconCalendar size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>
            </SimpleGrid>
        );
    };

    return (
        <Container size="xl" py="xl">
            {/* Header */}
            <Group justify="space-between" align="flex-start" mb="lg">
                <div>
                    <Title order={2}>Gestión de Compras</Title>
                    <Text c="dimmed">Registro y seguimiento de compras a proveedores</Text>
                </div>
                <Button 
                    leftSection={<IconPlus size={18} />} 
                    color="blue"
                    onClick={() => setModalOpen(true)}
                >
                    Nueva Compra
                </Button>
            </Group>

            {renderEstadisticas()}
            
            {/* Barra de filtros */}
            <Paper p="md" mb="md" radius="md" withBorder>
                <Grid gutter="md">
                    <Grid.Col span={{ base: 12, md: 4 }}>
                        <TextInput 
                            placeholder="Buscar por factura o proveedor..."
                            leftSection={<IconSearch size={16} />}
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </Grid.Col>
                    <Grid.Col span={{ base: 6, md: 3 }}>
                        <Select 
                            placeholder="Filtrar por proveedor"
                            data={[
                                { value: 'todos', label: 'Todos los proveedores' },
                                ...proveedores.map(p => ({
                                    value: p.id_proveedor.toString(),
                                    label: p.nombre
                                }))
                            ]}
                            value={filtroProveedor}
                            onChange={(val) => {
                                setFiltroProveedor(val);
                                setTimeout(() => cargarDatos(), 100);
                            }}
                        />
                    </Grid.Col>
                    <Grid.Col span={{ base: 6, md: 3 }}>
                        <Group>
                            <TextInput
                                type="date"
                                placeholder="Fecha inicio"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                                size="xs"
                                style={{ flex: 1 }}
                            />
                            <TextInput
                                type="date"
                                placeholder="Fecha fin"
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                                size="xs"
                                style={{ flex: 1 }}
                            />
                        </Group>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 2 }}>
                        <Group justify="flex-end">
                            <ActionIcon 
                                variant="light" 
                                color="red" 
                                onClick={() => {
                                    setBusqueda('');
                                    setFiltroProveedor('todos');
                                    setFechaInicio('');
                                    setFechaFin('');
                                    cargarDatos();
                                }}
                                title="Limpiar filtros"
                            >
                                <IconFilter size={16} />
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

            {/* Tabla de compras */}
            <Card shadow="sm" padding={0} radius="md" withBorder>
                <ScrollArea>
                    <Table verticalSpacing="md" highlightOnHover>
                        <Table.Thead bg="gray.1">
                            <Table.Tr>
                                <Table.Th>Compra</Table.Th>
                                <Table.Th>Proveedor</Table.Th>
                                <Table.Th>Fecha</Table.Th>
                                <Table.Th>Factura</Table.Th>
                                <Table.Th>Total</Table.Th>
                                <Table.Th>Productos</Table.Th>
                                <Table.Th>Acciones</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {comprasPaginadas.map(compra => (
                                <Table.Tr key={compra.id_compra}>
                                    <Table.Td>
                                        <Text fw={500}>Compra #{compra.id_compra}</Text>
                                        <Text size="xs" c="dimmed">
                                            {compra.tipo_pago}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text>{compra.proveedor_nombre || 'Sin proveedor'}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text>{new Date(compra.fecha).toLocaleDateString()}</Text>
                                        <Text size="xs" c="dimmed">
                                            {new Date(compra.fecha).toLocaleTimeString()}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge variant="light" color="blue">
                                            {compra.numero_factura || 'Sin factura'}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text fw={600} c="green">
                                            Bs {parseFloat(compra.total || 0).toFixed(2)}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge color="blue" variant="light">
                                            {compra.total_productos || 0} productos
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <Tooltip label="Ver detalles">
                                                <ActionIcon 
                                                    variant="subtle" 
                                                    color="blue"
                                                    onClick={() => verDetallesCompra(compra.id_compra)}
                                                >
                                                    <IconEye size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                            <Tooltip label="Descargar">
                                                <ActionIcon variant="subtle" color="gray">
                                                    <IconDownload size={16} />
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
            {!loading && comprasPaginadas.length === 0 && (
                <Center py={40}>
                    <Stack align="center">
                        <IconShoppingBag size={48} color="gray" />
                        <Text c="dimmed">No se encontraron compras</Text>
                        <Button 
                            variant="light" 
                            onClick={() => setModalOpen(true)}
                        >
                            Registrar primera compra
                        </Button>
                    </Stack>
                </Center>
            )}

            {/* Modal para nueva compra */}
            <Modal 
                opened={modalOpen} 
                onClose={() => setModalOpen(false)}
                title="Registrar Nueva Compra"
                size="xl"
            >
                <Stack gap="md">
                    {/* Selección de proveedor */}
                    <Select 
                        label="Proveedor"
                        placeholder="Selecciona un proveedor"
                        required
                        data={proveedores.map(p => ({
                            value: p.id_proveedor.toString(),
                            label: p.nombre
                        }))}
                        value={nuevaCompra.proveedor_id}
                        onChange={(val) => setNuevaCompra({...nuevaCompra, proveedor_id: val})}
                        searchable
                    />
                    
                    {/* Información de factura */}
                    <Grid gutter="md">
                        <Grid.Col span={6}>
                            <TextInput 
                                label="Número de Factura"
                                placeholder="FAC-001-2024"
                                value={nuevaCompra.numero_factura}
                                onChange={(e) => setNuevaCompra({...nuevaCompra, numero_factura: e.target.value})}
                            />
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <Select 
                                label="Tipo de Pago"
                                data={[
                                    { value: 'efectivo', label: 'Efectivo' },
                                    { value: 'transferencia', label: 'Transferencia' },
                                    { value: 'tarjeta', label: 'Tarjeta' },
                                    { value: 'credito', label: 'Crédito' }
                                ]}
                                value={nuevaCompra.tipo_pago}
                                onChange={(val) => setNuevaCompra({...nuevaCompra, tipo_pago: val})}
                            />
                        </Grid.Col>
                    </Grid>
                    
                    {/* Selección de productos */}
                    <Card withBorder>
                        <Group justify="space-between" mb="md">
                            <Text fw={500}>Productos a Comprar</Text>
                            <Badge color="blue">
                                Total: Bs {calcularTotalCompra().toFixed(2)}
                            </Badge>
                        </Group>
                        
                        {/* Lista de productos disponibles */}
                        <Select 
                            placeholder="Buscar producto para agregar"
                            data={productos.map(p => ({
                                value: p.id_producto.toString(),
                                label: `${p.nombre} (Stock: ${p.stock_actual}) - Bs ${p.precio_actual}`
                            }))}
                            onChange={(val) => {
                                const producto = productos.find(p => p.id_producto.toString() === val);
                                if (producto) agregarProductoCompra(producto);
                            }}
                            searchable
                            clearable
                        />
                        
                        {/* Lista de productos agregados */}
                        {productosCompra.length > 0 && (
                            <ScrollArea h={200} mt="md">
                                <Stack gap="xs">
                                    {productosCompra.map(producto => (
                                        <Paper key={producto.id_producto} p="sm" withBorder>
                                            <Group justify="space-between">
                                                <div style={{ flex: 1 }}>
                                                    <Text size="sm" fw={500}>{producto.producto_nombre}</Text>
                                                    <Text size="xs" c="dimmed">
                                                        Stock actual: {producto.stock_actual}
                                                    </Text>
                                                </div>
                                                
                                                <Group>
                                                    <NumberInput 
                                                        value={producto.cantidad}
                                                        onChange={(val) => actualizarProductoCompra(producto.id_producto, 'cantidad', val)}
                                                        min={1}
                                                        size="xs"
                                                        w={80}
                                                    />
                                                    <NumberInput 
                                                        value={producto.precio_unitario}
                                                        onChange={(val) => actualizarProductoCompra(producto.id_producto, 'precio_unitario', val)}
                                                        min={0}
                                                        step={0.01}
                                                        size="xs"
                                                        w={100}
                                                        prefix="Bs "
                                                    />
                                                    <Text fw={600}>
                                                        Bs {(producto.cantidad * producto.precio_unitario).toFixed(2)}
                                                    </Text>
                                                    <ActionIcon 
                                                        color="red" 
                                                        variant="subtle"
                                                        onClick={() => eliminarProductoCompra(producto.id_producto)}
                                                    >
                                                        <IconTrash size={16} />
                                                    </ActionIcon>
                                                </Group>
                                            </Group>
                                        </Paper>
                                    ))}
                                </Stack>
                            </ScrollArea>
                        )}
                    </Card>
                    
                    {/* Observaciones */}
                    <Textarea 
                        label="Observaciones (opcional)"
                        placeholder="Notas adicionales sobre la compra..."
                        rows={3}
                        value={nuevaCompra.observaciones}
                        onChange={(e) => setNuevaCompra({...nuevaCompra, observaciones: e.target.value})}
                    />
                    
                    {/* Resumen final */}
                    <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                        <Group justify="space-between">
                            <Text fw={500}>Resumen de la compra:</Text>
                            <Text fw={700} size="lg">
                                Bs {calcularTotalCompra().toFixed(2)}
                            </Text>
                        </Group>
                        <Text size="sm">
                            {productosCompra.length} productos • Total unidades: {
                                productosCompra.reduce((sum, p) => sum + p.cantidad, 0)
                            }
                        </Text>
                    </Alert>
                    
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => setModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            color="green"
                            leftSection={<IconDeviceFloppy size={16} />}
                            onClick={handleCrearCompra}
                            disabled={productosCompra.length === 0}
                        >
                            Registrar Compra y Actualizar Stock
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Modal para ver detalles */}
            <Modal 
                opened={modalDetallesOpen} 
                onClose={() => setModalDetallesOpen(false)}
                title={`Detalles de Compra #${compraSeleccionada}`}
                size="lg"
            >
                {detallesCompra && (
                    <Stack gap="md">
                        {/* Información de la compra */}
                        <Paper withBorder p="md" radius="md">
                            <Group justify="space-between" mb="sm">
                                <div>
                                    <Text fw={700} size="lg">Compra #{detallesCompra.compra.id_compra}</Text>
                                    <Text c="dimmed">
                                        {new Date(detallesCompra.compra.fecha).toLocaleString()}
                                    </Text>
                                </div>
                                <Badge color="green" size="lg">
                                    Bs {parseFloat(detallesCompra.compra.total || 0).toFixed(2)}
                                </Badge>
                            </Group>
                            
                            <Grid>
                                <Grid.Col span={6}>
                                    <Text size="sm" c="dimmed">Proveedor</Text>
                                    <Text fw={500}>{detallesCompra.compra.proveedor_nombre || 'No especificado'}</Text>
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <Text size="sm" c="dimmed">Factura</Text>
                                    <Text fw={500}>{detallesCompra.compra.numero_factura || 'No especificada'}</Text>
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <Text size="sm" c="dimmed">Tipo de pago</Text>
                                    <Badge variant="light">{detallesCompra.compra.tipo_pago}</Badge>
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <Text size="sm" c="dimmed">Registrado por</Text>
                                    <Text fw={500}>
                                        {detallesCompra.compra.usuario_nombre} {detallesCompra.compra.usuario_apellido}
                                    </Text>
                                </Grid.Col>
                            </Grid>
                        </Paper>
                        
                        {/* Productos comprados */}
                        <Paper withBorder p="md" radius="md">
                            <Text fw={600} mb="sm">Productos Comprados</Text>
                            <ScrollArea h={300}>
                                <Table>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Producto</Table.Th>
                                            <Table.Th>Cantidad</Table.Th>
                                            <Table.Th>Precio Unit.</Table.Th>
                                            <Table.Th>Subtotal</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {detallesCompra.detalles.map(detalle => (
                                            <Table.Tr key={detalle.id_detalle_compra}>
                                                <Table.Td>
                                                    <Text>{detalle.producto_nombre}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge color="blue">{detalle.cantidad}</Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text>Bs {parseFloat(detalle.precio_unitario).toFixed(2)}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text fw={600}>Bs {parseFloat(detalle.subtotal).toFixed(2)}</Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </ScrollArea>
                        </Paper>
                        
                        {/* Resumen */}
                        <Paper withBorder p="md" radius="md">
                            <Group justify="space-between">
                                <div>
                                    <Text fw={500}>Total Productos</Text>
                                    <Text size="sm" c="dimmed">{detallesCompra.resumen.total_productos} productos</Text>
                                </div>
                                <div>
                                    <Text fw={500}>Total Unidades</Text>
                                    <Text size="sm" c="dimmed">{detallesCompra.resumen.total_unidades} unidades</Text>
                                </div>
                                <div>
                                    <Text fw={700}>Total Compra</Text>
                                    <Text fw={700} size="lg" c="green">
                                        Bs {parseFloat(detallesCompra.compra.total || 0).toFixed(2)}
                                    </Text>
                                </div>
                            </Group>
                        </Paper>
                    </Stack>
                )}
            </Modal>
        </Container>
    );
};

export default GestionCompras;