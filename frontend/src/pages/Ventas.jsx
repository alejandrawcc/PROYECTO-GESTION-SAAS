import React, { useState, useEffect, useRef } from 'react';
import {
    Container, Title, Card, Group, Button, Table,
    TextInput, Select, NumberInput, Modal, Stack,
    Text, Badge, Paper, Divider, ActionIcon,
    SimpleGrid, Loader, Alert, Grid, Box,
    Combobox, InputBase, useCombobox,
    ScrollArea, Avatar, Indicator, Center
} from '@mantine/core';
import {
    IconShoppingCart, IconPlus, IconTrash, IconReceipt,
    IconUserPlus, IconSearch, IconUser, IconCash,
    IconDownload, IconRefresh, IconUsers,
    IconCheck, IconX, IconId, IconMail, IconPhone
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getCurrentUser } from '../services/auth';
import api from '../services/api';
import PdfService from '../services/pdfService';

const Ventas = () => {
    const user = getCurrentUser();
    const [loading, setLoading] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [modalAbierto, setModalAbierto] = useState(false);
    
    // Estados para la venta
    const [productos, setProductos] = useState([]);
    const [productosFiltrados, setProductosFiltrados] = useState([]);
    const [carrito, setCarrito] = useState([]);
    const [cliente, setCliente] = useState(null);
    const [metodoPago, setMetodoPago] = useState('efectivo');
    
    // Estados para búsqueda y filtros
    const [busqueda, setBusqueda] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
    const [categorias, setCategorias] = useState([]);
    
    // Estados para gestión de clientes
    const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
    const [modalBuscarClienteAbierto, setModalBuscarClienteAbierto] = useState(false);
    const [clientesRegistrados, setClientesRegistrados] = useState([]);
    const [clientesFiltrados, setClientesFiltrados] = useState([]);
    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [cargandoClientes, setCargandoClientes] = useState(false);
    
    // Estados para cliente nuevo
    const [nuevoCliente, setNuevoCliente] = useState({
        nombre_razon_social: '',
        ci_nit: '',
        telefono: '',
        email: ''
    });

    // Cargar productos disponibles
    const cargarProductos = async () => {
        try {
            setLoading(true);
            const response = await api.get('/productos/empresa');
            
            // Filtrar y formatear productos
            const productosFormateados = response.data
                .filter(p => p.stock_actual > 0)
                .map(p => ({
                    ...p,
                    id_producto: parseInt(p.id_producto) || 0,
                    nombre: p.nombre || 'Producto sin nombre',
                    precio: parseFloat(p.precio || 0),
                    stock_actual: parseInt(p.stock_actual || 0),
                    categoria: p.categoria || 'Sin categoría',
                    descripcion: p.descripcion || ''
                }));
            
            setProductos(productosFormateados);
            setProductosFiltrados(productosFormateados);
            
            // Extraer categorías únicas
            const cats = [...new Set(productosFormateados
                .map(p => p.categoria)
                .filter(Boolean)
                .sort())];
            
            setCategorias(cats);
            
        } catch (error) {
            console.error('Error cargando productos:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudieron cargar los productos',
                color: 'red'
            });
            setProductos([]);
            setProductosFiltrados([]);
        } finally {
            setLoading(false);
        }
    };

    // Cargar clientes registrados
    const cargarClientes = async () => {
        try {
            setCargandoClientes(true);
            const response = await api.get('/clientes');
            
            // Filtrar solo clientes activos
            const clientesActivos = response.data
                .filter(c => c.estado === 'activo')
                .map(c => ({
                    ...c,
                    id_cliente: parseInt(c.id_cliente) || 0,
                    nombre_razon_social: c.nombre_razon_social || 'Sin nombre',
                    ci_nit: c.ci_nit || 'Sin CI/NIT',
                    telefono: c.telefono || 'Sin teléfono',
                    email: c.email || 'Sin email'
                }));
            
            setClientesRegistrados(clientesActivos);
            setClientesFiltrados(clientesActivos);
            
        } catch (error) {
            console.error('Error cargando clientes:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudieron cargar los clientes',
                color: 'red'
            });
            setClientesRegistrados([]);
            setClientesFiltrados([]);
        } finally {
            setCargandoClientes(false);
        }
    };

    useEffect(() => {
        cargarProductos();
        cargarClientes();
    }, []);

    // Filtrar productos
    useEffect(() => {
        let filtrados = productos;
        
        if (busqueda) {
            const termino = busqueda.toLowerCase();
            filtrados = filtrados.filter(p =>
                p.nombre.toLowerCase().includes(termino) ||
                p.descripcion?.toLowerCase().includes(termino)
            );
        }
        
        if (categoriaFiltro !== 'todas') {
            filtrados = filtrados.filter(p => p.categoria === categoriaFiltro);
        }
        
        setProductosFiltrados(filtrados);
    }, [busqueda, categoriaFiltro, productos]);

    // Filtrar clientes en tiempo real
    useEffect(() => {
        if (!busquedaCliente.trim()) {
            setClientesFiltrados(clientesRegistrados);
            return;
        }
        
        const termino = busquedaCliente.toLowerCase().trim();
        const filtrados = clientesRegistrados.filter(cliente =>
            cliente.nombre_razon_social.toLowerCase().includes(termino) ||
            (cliente.ci_nit && cliente.ci_nit.toLowerCase().includes(termino)) ||
            (cliente.email && cliente.email.toLowerCase().includes(termino)) ||
            (cliente.telefono && cliente.telefono.includes(termino))
        );
        
        setClientesFiltrados(filtrados);
    }, [busquedaCliente, clientesRegistrados]);

    // Funciones del carrito
    const agregarAlCarrito = (producto) => {
        const existente = carrito.find(p => p.id_producto === producto.id_producto);
        
        if (existente) {
            if (existente.cantidad >= producto.stock_actual) {
                notifications.show({
                    title: 'Stock insuficiente',
                    message: `No hay suficiente stock de ${producto.nombre}`,
                    color: 'red'
                });
                return;
            }
            
            setCarrito(carrito.map(p =>
                p.id_producto === producto.id_producto
                    ? { 
                        ...p, 
                        cantidad: p.cantidad + 1,
                        subtotal: (p.cantidad + 1) * parseFloat(p.precio || 0)
                    }
                    : p
            ));
        } else {
            if (producto.stock_actual < 1) {
                notifications.show({
                    title: 'Sin stock',
                    message: `${producto.nombre} no tiene stock disponible`,
                    color: 'red'
                });
                return;
            }
            
            setCarrito([
                ...carrito,
                {
                    ...producto,
                    cantidad: 1,
                    precio: parseFloat(producto.precio || 0),
                    subtotal: parseFloat(producto.precio || 0)
                }
            ]);
        }
    };

    const actualizarCantidad = (productoId, nuevaCantidad) => {
        if (nuevaCantidad < 1) {
            eliminarDelCarrito(productoId);
            return;
        }
        
        const producto = carrito.find(p => p.id_producto === productoId);
        const productoOriginal = productos.find(p => p.id_producto === productoId);
        
        if (nuevaCantidad > productoOriginal.stock_actual) {
            notifications.show({
                title: 'Stock insuficiente',
                message: `Solo hay ${productoOriginal.stock_actual} unidades disponibles`,
                color: 'red'
            });
            return;
        }
        
        setCarrito(carrito.map(p =>
            p.id_producto === productoId
                ? {
                    ...p,
                    cantidad: nuevaCantidad,
                    precio: parseFloat(p.precio || 0),
                    subtotal: nuevaCantidad * parseFloat(p.precio || 0)
                }
                : p
        ));
    };

    const eliminarDelCarrito = (productoId) => {
        setCarrito(carrito.filter(p => p.id_producto !== productoId));
    };

    // Calcular total
    const calcularTotal = () => {
        return carrito.reduce((total, producto) => {
            return total + parseFloat(producto.subtotal || 0);
        }, 0);
    };

    // Seleccionar cliente
    const seleccionarCliente = (clienteSeleccionado) => {
        setCliente({
            id_cliente: clienteSeleccionado.id_cliente,
            nombre: clienteSeleccionado.nombre_razon_social,
            ci_nit: clienteSeleccionado.ci_nit,
            telefono: clienteSeleccionado.telefono,
            email: clienteSeleccionado.email
        });
        setModalBuscarClienteAbierto(false);
        setBusquedaCliente('');
        
        notifications.show({
            title: 'Cliente seleccionado',
            message: `${clienteSeleccionado.nombre_razon_social} ha sido seleccionado`,
            color: 'green',
            autoClose: 2000
        });
    };

    // Registrar cliente nuevo
    const registrarCliente = async () => {
        // Validar datos mínimos
        if (!nuevoCliente.nombre_razon_social.trim()) {
            notifications.show({
                title: 'Error',
                message: 'El nombre es obligatorio',
                color: 'red'
            });
            return;
        }

        try {
            const response = await api.post('/clientes', {
                nombre_razon_social: nuevoCliente.nombre_razon_social.trim(),
                ci_nit: nuevoCliente.ci_nit?.trim() || null,
                telefono: nuevoCliente.telefono?.trim() || null,
                email: nuevoCliente.email?.trim() || null
            });
            
            notifications.show({
                title: 'Cliente registrado',
                message: `${nuevoCliente.nombre_razon_social} ha sido registrado exitosamente`,
                color: 'green'
            });
            
            // Seleccionar automáticamente el nuevo cliente
            const nuevoClienteRegistrado = {
                id_cliente: response.data.id || Date.now(), // Usar ID temporal si no viene del backend
                nombre: nuevoCliente.nombre_razon_social,
                ci_nit: nuevoCliente.ci_nit,
                telefono: nuevoCliente.telefono,
                email: nuevoCliente.email
            };
            
            setCliente(nuevoClienteRegistrado);
            
            // Recargar lista de clientes
            cargarClientes();
            
            // Cerrar modal y limpiar formulario
            setModalClienteAbierto(false);
            setNuevoCliente({
                nombre_razon_social: '',
                ci_nit: '',
                telefono: '',
                email: ''
            });
            
        } catch (error) {
            console.error('Error registrando cliente:', error.response?.data || error);
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || 'No se pudo registrar el cliente',
                color: 'red'
            });
        }
    };

    // Quitar cliente seleccionado
    const quitarCliente = () => {
        setCliente(null);
        notifications.show({
            title: 'Cliente removido',
            message: 'Se ha removido el cliente de la venta',
            color: 'blue'
        });
    };

    // Vaciar carrito
    const vaciarCarrito = () => {
        setCarrito([]);
        notifications.show({
            title: 'Carrito vaciado',
            message: 'Se ha limpiado el carrito',
            color: 'blue'
        });
    };

    // Procesar venta
    const procesarVenta = async () => {
        if (carrito.length === 0) {
            notifications.show({
                title: 'Carrito vacío',
                message: 'Agrega productos al carrito antes de procesar la venta',
                color: 'yellow'
            });
            return;
        }

        setProcesando(true);
        try {
            // 1. PRIMERO: Crear el carrito temporal en el backend
            // Necesitamos agregar productos al carrito antes de procesar la venta
            const carritoId = `venta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            console.log("🔄 1. Creando carrito con ID:", carritoId);
            console.log("📦 Productos en carrito:", carrito);
            
            // Agregar cada producto al carrito en el backend
            for (const producto of carrito) {
                try {
                    await api.post('/carrito/agregar', {
                        microempresaId: user.microempresa_id,
                        productoId: producto.id_producto,
                        cantidad: producto.cantidad,
                        carritoId: carritoId,
                        clienteData: cliente || null
                    });
                    console.log(`✅ Producto agregado: ${producto.nombre}`);
                } catch (error) {
                    console.error(`❌ Error agregando producto ${producto.nombre}:`, error);
                    throw new Error(`No se pudo agregar el producto ${producto.nombre} al carrito`);
                }
            }
            
            // 2. Preparar datos de la venta EXACTAMENTE como espera el backend
            const ventaData = {
                carritoId: carritoId,
                clienteData: cliente || {
                    nombre_razon_social: 'Cliente no registrado',
                    ci_nit: '',
                    telefono: '',
                    email: ''
                },
                metodoPago: metodoPago
            };
            
            console.log("📤 2. Datos que enviamos al backend:", JSON.stringify(ventaData, null, 2));
            
            // 3. Procesar la venta
            console.log("🔄 3. Procesando venta...");
            const response = await api.post('/carrito/procesar-venta', ventaData);
            
            console.log("✅ 4. Respuesta del servidor:", response.data);

            // 4. Preparar datos para el PDF
            const facturaData = {
                pedido_id: response.data.pedido_id,
                fecha: response.data.fecha || new Date().toISOString(),
                cliente_nombre: cliente?.nombre || ventaData.clienteData.nombre_razon_social,
                cliente_ci: cliente?.ci_nit || ventaData.clienteData.ci_nit || '',
                cliente_email: cliente?.email || ventaData.clienteData.email || '',
                cliente_telefono: cliente?.telefono || ventaData.clienteData.telefono || '',
                productos: carrito.map(p => ({
                    nombre: p.nombre,
                    cantidad: p.cantidad,
                    precio_unitario: parseFloat(p.precio || 0),
                    subtotal: parseFloat(p.subtotal || 0)
                })),
                total: calcularTotal(),
                metodo_pago: metodoPago,
                vendedor: `${user.nombre} ${user.apellido}`,
                empresa_nombre: user.empresa_nombre || 'Mi Microempresa',
                empresa_nit: '123456789',
                empresa_direccion: 'Av. Principal #123',
                empresa_telefono: '+591 70000000'
            };

            // 5. Generar PDF
            try {
                console.log("🖨️ 5. Generando PDF...");
                PdfService.generarComprobanteVenta(facturaData);
            } catch (pdfError) {
                console.error("⚠️ Error generando PDF:", pdfError);
                // No interrumpir el flujo si falla el PDF
            }

            // 6. Mostrar notificación y limpiar
            notifications.show({
                title: '✅ Venta completada',
                message: `Pedido #${response.data.pedido_id} procesado exitosamente`,
                color: 'green',
                autoClose: 3000
            });

            // 7. Limpiar todo
            setCarrito([]);
            setCliente(null);
            setModalAbierto(false);
            
            // 8. Recargar productos para actualizar stock
            setTimeout(() => cargarProductos(), 1000);

        } catch (error) {
            console.error('❌ Error procesando venta:', error);
            
            // Mostrar mensaje detallado
            let errorMessage = 'No se pudo procesar la venta';
            let errorDetails = '';
            
            if (error.response) {
                console.error('📋 Detalles del error:', error.response.data);
                errorMessage = error.response.data?.message || error.response.data?.error || errorMessage;
                errorDetails = error.response.data?.details || '';
                
                // Mostrar error específico si viene del backend
                if (error.response.data?.sqlError) {
                    errorDetails += `\nError SQL: ${error.response.data.sqlError}`;
                }
            } else if (error.request) {
                console.error('📡 No hubo respuesta del servidor:', error.request);
                errorMessage = 'El servidor no respondió. Verifica tu conexión.';
            } else {
                console.error('⚡ Error al configurar la petición:', error.message);
                errorMessage = `Error: ${error.message}`;
            }
            
            notifications.show({
                title: 'Error en la venta',
                message: `${errorMessage}${errorDetails ? '\n' + errorDetails : ''}`,
                color: 'red',
                autoClose: 5000
            });
        } finally {
            setProcesando(false);
        }
    };

    return (
        <Container size="xl" py="xl">
            <Group justify="space-between" mb="lg">
                <div>
                    <Title order={2}>Punto de Venta</Title>
                    <Text c="dimmed">Vendedor: {user.nombre} {user.apellido}</Text>
                </div>
                
                <Group>
                    <Button
                        leftSection={<IconRefresh size={18} />}
                        onClick={() => {
                            cargarProductos();
                            cargarClientes();
                        }}
                        variant="light"
                    >
                        Actualizar
                    </Button>
                    
                    <Button
                        leftSection={<IconShoppingCart size={18} />}
                        onClick={() => setModalAbierto(true)}
                        disabled={carrito.length === 0}
                        color="blue"
                    >
                        Ver Carrito ({carrito.length})
                    </Button>
                </Group>
            </Group>

            <Grid>
                {/* Columna izquierda: Productos */}
                <Grid.Col span={8}>
                    <Card withBorder radius="md" shadow="sm">
                        <Stack>
                            <Group justify="space-between">
                                <Title order={4}>Productos Disponibles</Title>
                                <Badge color="green">
                                    {productosFiltrados.length} productos
                                </Badge>
                            </Group>
                            
                            {/* Filtros */}
                            <Group>
                                <TextInput
                                    placeholder="Buscar producto..."
                                    leftSection={<IconSearch size={16} />}
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.currentTarget.value)}
                                    style={{ flex: 1 }}
                                />
                                
                                <Select
                                    placeholder="Todas las categorías"
                                    data={[
                                        { value: 'todas', label: 'Todas las categorías' },
                                        ...categorias.map(cat => ({ value: cat, label: cat }))
                                    ]}
                                    value={categoriaFiltro}
                                    onChange={setCategoriaFiltro}
                                />
                            </Group>
                            
                            {/* Lista de productos */}
                            {loading ? (
                                <Loader />
                            ) : (
                                <SimpleGrid cols={3} spacing="md">
                                    {productosFiltrados.map(producto => (
                                        <Card
                                            key={producto.id_producto}
                                            withBorder
                                            padding="sm"
                                            radius="md"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => agregarAlCarrito(producto)}
                                        >
                                            <Stack gap="xs">
                                                <Text fw={500} lineClamp={1}>
                                                    {producto.nombre}
                                                </Text>
                                                <Text size="sm" c="dimmed" lineClamp={2}>
                                                    {producto.descripcion || 'Sin descripción'}
                                                </Text>
                                                <Group justify="space-between">
                                                    <Badge color="blue">
                                                        Bs {parseFloat(producto.precio).toFixed(2)}
                                                    </Badge>
                                                    <Badge color={producto.stock_actual > 5 ? 'green' : 'orange'}>
                                                        Stock: {producto.stock_actual}
                                                    </Badge>
                                                </Group>
                                                <Button
                                                    size="xs"
                                                    fullWidth
                                                    leftSection={<IconPlus size={14} />}
                                                >
                                                    Agregar al carrito
                                                </Button>
                                            </Stack>
                                        </Card>
                                    ))}
                                </SimpleGrid>
                            )}
                        </Stack>
                    </Card>
                </Grid.Col>
                
                {/* Columna derecha: Carrito y Cliente */}
                <Grid.Col span={4}>
                    {/* Tarjeta de Cliente */}
                    <Card withBorder radius="md" shadow="sm" mb="md">
                        <Stack>
                            <Group justify="space-between">
                                <Title order={4}>Cliente</Title>
                                <Badge color={cliente ? 'green' : 'orange'}>
                                    {cliente ? 'Seleccionado' : 'Sin cliente'}
                                </Badge>
                            </Group>
                            
                            {cliente ? (
                                <Paper p="md" withBorder>
                                    <Stack gap="xs">
                                        <Group justify="space-between">
                                            <Group gap="xs">
                                                <Avatar size="sm" color="blue" radius="xl">
                                                    {cliente.nombre?.charAt(0) || 'C'}
                                                </Avatar>
                                                <div>
                                                    <Text fw={500}>{cliente.nombre}</Text>
                                                    {cliente.ci_nit && (
                                                        <Text size="xs" c="dimmed">CI: {cliente.ci_nit}</Text>
                                                    )}
                                                </div>
                                            </Group>
                                            <ActionIcon
                                                color="red"
                                                size="sm"
                                                variant="subtle"
                                                onClick={quitarCliente}
                                            >
                                                <IconX size={16} />
                                            </ActionIcon>
                                        </Group>
                                        
                                        {(cliente.telefono || cliente.email) && (
                                            <Stack gap={4} mt="xs">
                                                {cliente.telefono && (
                                                    <Group gap="xs">
                                                        <IconPhone size={14} color="gray" />
                                                        <Text size="xs">{cliente.telefono}</Text>
                                                    </Group>
                                                )}
                                                {cliente.email && (
                                                    <Group gap="xs">
                                                        <IconMail size={14} color="gray" />
                                                        <Text size="xs">{cliente.email}</Text>
                                                    </Group>
                                                )}
                                            </Stack>
                                        )}
                                        
                                        {cliente.id_cliente && (
                                            <Badge size="xs" variant="outline" color="blue">
                                                ID: #{cliente.id_cliente}
                                            </Badge>
                                        )}
                                    </Stack>
                                </Paper>
                            ) : (
                                <Alert color="yellow" icon={<IconUsers size={16} />}>
                                    <Text size="sm">Selecciona o registra un cliente</Text>
                                </Alert>
                            )}
                            
                            <Group grow>
                                <Button
                                    variant="light"
                                    leftSection={<IconSearch size={16} />}
                                    onClick={() => {
                                        setModalBuscarClienteAbierto(true);
                                        cargarClientes();
                                    }}
                                >
                                    Buscar Cliente
                                </Button>
                                
                                <Button
                                    variant="light"
                                    color="blue"
                                    leftSection={<IconUserPlus size={16} />}
                                    onClick={() => setModalClienteAbierto(true)}
                                >
                                    Nuevo Cliente
                                </Button>
                            </Group>
                        </Stack>
                    </Card>
                    
                    {/* Tarjeta del Carrito */}
                    <Card withBorder radius="md" shadow="sm">
                        <Stack>
                            <Title order={4}>Carrito de Venta</Title>
                            
                            {carrito.length === 0 ? (
                                <Alert color="blue" title="Carrito vacío">
                                    Agrega productos desde la lista de la izquierda
                                </Alert>
                            ) : (
                                <>
                                    <ScrollArea h={200} type="always">
                                        <Table>
                                            <Table.Tbody>
                                                {carrito.map(producto => (
                                                    <Table.Tr key={producto.id_producto}>
                                                        <Table.Td>
                                                            <Text size="sm" fw={500} lineClamp={1}>
                                                                {producto.nombre}
                                                            </Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <NumberInput
                                                                value={producto.cantidad || 1}
                                                                onChange={(val) => actualizarCantidad(producto.id_producto, val)}
                                                                min={1}
                                                                max={producto.stock_actual}
                                                                size="xs"
                                                                w={60}
                                                            />
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm">
                                                                Bs {parseFloat(producto.subtotal || 0).toFixed(2)}
                                                            </Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <ActionIcon
                                                                color="red"
                                                                size="sm"
                                                                onClick={() => eliminarDelCarrito(producto.id_producto)}
                                                            >
                                                                <IconTrash size={14} />
                                                            </ActionIcon>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    </ScrollArea>
                                    
                                    <Divider />
                                    
                                    <Group justify="space-between">
                                        <Text fw={700}>Total:</Text>
                                        <Title order={3} c="green">
                                            Bs {calcularTotal().toFixed(2)}
                                        </Title>
                                    </Group>
                                    
                                    <Button
                                        fullWidth
                                        color="green"
                                        leftSection={<IconCash size={18} />}
                                        onClick={() => setModalAbierto(true)}
                                        disabled={!cliente}
                                    >
                                        {cliente ? 'Proceder al Pago' : 'Selecciona un cliente primero'}
                                    </Button>
                                    
                                    <Button
                                        fullWidth
                                        variant="light"
                                        color="red"
                                        leftSection={<IconTrash size={16} />}
                                        onClick={vaciarCarrito}
                                    >
                                        Vaciar Carrito
                                    </Button>
                                </>
                            )}
                        </Stack>
                    </Card>
                </Grid.Col>
            </Grid>

            {/* Modal para procesar venta */}
            <Modal
                opened={modalAbierto}
                onClose={() => setModalAbierto(false)}
                title="Confirmar Venta"
                size="lg"
            >
                <Stack>
                    <Alert color="blue">
                        <Text>Revise los detalles de la venta antes de confirmar</Text>
                    </Alert>
                    
                    {/* Resumen */}
                    <Paper p="md" withBorder>
                        <Stack>
                            <Text fw={600}>Resumen de la Venta</Text>
                            {carrito.map(p => (
                                <Group key={p.id_producto} justify="space-between">
                                    <Text size="sm">{p.nombre} x {p.cantidad}</Text>
                                    <Text size="sm">Bs {parseFloat(p.subtotal || 0).toFixed(2)}</Text>
                                </Group>
                            ))}
                            <Divider />
                            <Group justify="space-between">
                                <Text fw={700}>Total:</Text>
                                <Text fw={700} size="lg" c="green">
                                    Bs {calcularTotal().toFixed(2)}
                                </Text>
                            </Group>
                        </Stack>
                    </Paper>
                    
                    {/* Información del cliente */}
                    <Paper p="md" withBorder>
                        <Stack>
                            <Text fw={600}>Cliente</Text>
                            {cliente ? (
                                <Stack gap="xs">
                                    <Text>{cliente.nombre}</Text>
                                    {cliente.ci_nit && <Text size="sm">CI/NIT: {cliente.ci_nit}</Text>}
                                    {cliente.telefono && <Text size="sm">Teléfono: {cliente.telefono}</Text>}
                                    {cliente.email && <Text size="sm">Email: {cliente.email}</Text>}
                                </Stack>
                            ) : (
                                <Text c="orange">Cliente no registrado</Text>
                            )}
                        </Stack>
                    </Paper>
                    
                    {/* Método de pago */}
                    <Select
                        label="Método de Pago"
                        value={metodoPago}
                        onChange={setMetodoPago}
                        data={[
                            { value: 'efectivo', label: 'Efectivo' },
                            { value: 'tarjeta', label: 'Tarjeta' },
                            { value: 'transferencia', label: 'Transferencia' },
                            { value: 'qr', label: 'QR' }
                        ]}
                    />
                    
                    {/* Botones de acción */}
                    <Group justify="flex-end" mt="md">
                        <Button
                            variant="light"
                            onClick={() => setModalAbierto(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            color="green"
                            loading={procesando}
                            onClick={procesarVenta}
                            leftSection={<IconReceipt size={18} />}
                        >
                            Confirmar y Generar Factura
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Modal para buscar cliente */}
            <Modal
                opened={modalBuscarClienteAbierto}
                onClose={() => {
                    setModalBuscarClienteAbierto(false);
                    setBusquedaCliente('');
                }}
                title="Buscar Cliente"
                size="lg"
            >
                <Stack>
                    <TextInput
                        placeholder="Buscar por nombre, CI/NIT, email o teléfono..."
                        leftSection={<IconSearch size={16} />}
                        value={busquedaCliente}
                        onChange={(e) => setBusquedaCliente(e.target.value)}
                    />
                    
                    {cargandoClientes ? (
                        <Center py={40}>
                            <Loader />
                        </Center>
                    ) : (
                        <ScrollArea h={300} type="always">
                            {clientesFiltrados.length === 0 ? (
                                <Center py={40}>
                                    <Stack align="center" gap="md">
                                        <IconUsers size={48} color="gray" />
                                        <Text c="dimmed">
                                            {busquedaCliente 
                                                ? 'No se encontraron clientes con esa búsqueda' 
                                                : 'No hay clientes registrados'}
                                        </Text>
                                        <Button
                                            variant="light"
                                            leftSection={<IconUserPlus size={16} />}
                                            onClick={() => {
                                                setModalBuscarClienteAbierto(false);
                                                setModalClienteAbierto(true);
                                            }}
                                        >
                                            Registrar nuevo cliente
                                        </Button>
                                    </Stack>
                                </Center>
                            ) : (
                                <Stack gap="xs">
                                    {clientesFiltrados.map(clienteItem => (
                                        <Paper
                                            key={clienteItem.id_cliente}
                                            p="md"
                                            withBorder
                                            radius="md"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => seleccionarCliente(clienteItem)}
                                        >
                                            <Group justify="space-between">
                                                <Group gap="sm">
                                                    <Avatar size="md" color="blue" radius="xl">
                                                        {clienteItem.nombre_razon_social?.charAt(0) || 'C'}
                                                    </Avatar>
                                                    <Stack gap={2}>
                                                        <Text fw={500}>{clienteItem.nombre_razon_social}</Text>
                                                        <Group gap="xs">
                                                            <IconId size={12} color="gray" />
                                                            <Text size="xs" c="dimmed">
                                                                {clienteItem.ci_nit || 'Sin CI/NIT'}
                                                            </Text>
                                                        </Group>
                                                    </Stack>
                                                </Group>
                                                
                                                <Group gap="xs">
                                                    {clienteItem.telefono && (
                                                        <Badge size="xs" variant="outline" leftSection={<IconPhone size={10} />}>
                                                            {clienteItem.telefono}
                                                        </Badge>
                                                    )}
                                                    <IconCheck size={16} color="green" />
                                                </Group>
                                            </Group>
                                            
                                            {clienteItem.email && (
                                                <Group gap="xs" mt="xs">
                                                    <IconMail size={12} color="gray" />
                                                    <Text size="xs" c="dimmed">
                                                        {clienteItem.email}
                                                    </Text>
                                                </Group>
                                            )}
                                        </Paper>
                                    ))}
                                </Stack>
                            )}
                        </ScrollArea>
                    )}
                    
                    <Divider />
                    
                    <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                            {clientesFiltrados.length} cliente(s) encontrado(s)
                        </Text>
                        <Button
                            variant="light"
                            leftSection={<IconUserPlus size={16} />}
                            onClick={() => {
                                setModalBuscarClienteAbierto(false);
                                setModalClienteAbierto(true);
                            }}
                        >
                            Registrar nuevo cliente
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Modal para registrar cliente nuevo */}
            <Modal
                opened={modalClienteAbierto}
                onClose={() => setModalClienteAbierto(false)}
                title="Registrar Nuevo Cliente"
                size="md"
            >
                <Stack>
                    <TextInput
                        label="Nombre / Razón Social"
                        placeholder="Ej: Juan Pérez o Empresa XYZ"
                        value={nuevoCliente.nombre_razon_social}
                        onChange={(e) => setNuevoCliente({
                            ...nuevoCliente,
                            nombre_razon_social: e.target.value
                        })}
                        required
                        withAsterisk
                    />
                    
                    <TextInput
                        label="CI / NIT"
                        placeholder="12345678"
                        value={nuevoCliente.ci_nit}
                        onChange={(e) => setNuevoCliente({
                            ...nuevoCliente,
                            ci_nit: e.target.value
                        })}
                        leftSection={<IconId size={16} />}
                    />
                    
                    <TextInput
                        label="Teléfono"
                        placeholder="+591 70000000"
                        value={nuevoCliente.telefono}
                        onChange={(e) => setNuevoCliente({
                            ...nuevoCliente,
                            telefono: e.target.value
                        })}
                        leftSection={<IconPhone size={16} />}
                    />
                    
                    <TextInput
                        label="Email"
                        placeholder="cliente@email.com"
                        type="email"
                        value={nuevoCliente.email}
                        onChange={(e) => setNuevoCliente({
                            ...nuevoCliente,
                            email: e.target.value
                        })}
                        leftSection={<IconMail size={16} />}
                    />
                    
                    <Group justify="flex-end" mt="md">
                        <Button
                            variant="light"
                            onClick={() => setModalClienteAbierto(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={registrarCliente}
                            disabled={!nuevoCliente.nombre_razon_social.trim()}
                        >
                            Registrar Cliente
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
};

export default Ventas;