import { 
    Modal, Paper, Group, Stack, Text, Button, Badge, 
    NumberInput, ActionIcon, Divider, Title, Alert,
    TextInput, Select, Loader, Center, ScrollArea,
    Tabs
} from '@mantine/core';
import { 
    IconShoppingCart, IconTrash, IconX, IconCheck, 
    IconUser, IconCash, IconPackage, IconReceipt,
    IconLogin, IconUserPlus, IconLock,
    IconArrowBack, IconArrowRight, IconId, 
    IconMail, IconPhone, IconKey 
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import api from '../services/api';
import clientePublicoService from '../services/clientePublicoService'; 
import PdfService from '../services/pdfService';

const CarritoModal = ({ 
    opened, 
    onClose, 
    microempresaId,
    carritoId,
    datosCliente, 
    onActualizarCarrito 
}) => {
    const [carrito, setCarrito] = useState(null);
    const [loading, setLoading] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [pasoVenta, setPasoVenta] = useState(1);
    
    // Nuevos estados para manejo de cliente
    const [tabCliente, setTabCliente] = useState('login'); // 'login' o 'registro'
    const [clienteAutenticado, setClienteAutenticado] = useState(datosCliente || null);
    
    // Formularios para login/registro
    const [formLogin, setFormLogin] = useState({
        email: '',
        password: ''
    });
    
    const [formRegistro, setFormRegistro] = useState({
        nombre: '',
        ci:'',
        email: '',
        telefono: '',
        password: '',
        confirmPassword: ''
    });
    
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [clienteNuevo, setClienteNuevo] = useState({
        nombre_razon_social: '',
        ci_nit: '',
        telefono: '',
        email: ''
    });

    useEffect(() => {
        // Si ya viene con datos del cliente logueado
        if (datosCliente) {
            setClienteAutenticado(datosCliente);
        }
        
        if (opened && carritoId) {
            cargarCarrito();
        }
    }, [opened, carritoId, datosCliente]);

    const cargarCarrito = async () => {
        if (!carritoId) {
            setCarrito(null);
            return;
        }
        
        try {
            setLoading(true);
            const response = await api.get(`/carrito/${carritoId}`);
            setCarrito(response.data.carrito);
            setPasoVenta(1);
        } catch (error) {
            console.error("Error cargando carrito:", error);
            setCarrito(null);
        } finally {
            setLoading(false);
        }
    };

    // FUNCIONES PARA MANEJO DE CLIENTES
    const handleLoginCliente = async () => {
        try {
            setLoading(true);
            const response = await clientePublicoService.login(formLogin);
            
            // Guardar datos del cliente autenticado
            clientePublicoService.setToken(response.data.token);
            clientePublicoService.setClienteData(response.data.cliente);
            setClienteAutenticado(response.data.cliente);
            
            notifications.show({
                title: 'Login exitoso',
                message: `Bienvenido ${response.data.cliente.nombre}`,
                color: 'green'
            });
            
            setFormLogin({ email: '', password: '' });
            setPasoVenta(3);
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || 'Credenciales incorrectas',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRegistroCliente = async () => {
        // Validar contraseñas coincidan
        if (formRegistro.password !== formRegistro.confirmPassword) {
            notifications.show({
                title: 'Error',
                message: 'Las contraseñas no coinciden',
                color: 'red'
            });
            return;
        }
        
        // Validar que el CI no esté vacío
        if (!formRegistro.ci.trim()) {
            notifications.show({
                title: 'Error',
                message: 'El CI es requerido',
                color: 'red'
            });
            return;
        }
        
        try {
            setLoading(true);
            const response = await clientePublicoService.registrar({
                nombre: formRegistro.nombre,
                ci: formRegistro.ci,  // Incluir CI
                email: formRegistro.email,
                telefono: formRegistro.telefono,
                password: formRegistro.password
            });
            
            // Guardar datos del cliente registrado
            clientePublicoService.setToken(response.data.token);
            clientePublicoService.setClienteData(response.data.cliente);
            setClienteAutenticado(response.data.cliente);
            
            notifications.show({
                title: 'Registro exitoso',
                message: `Cuenta creada para ${formRegistro.nombre}`,
                color: 'green'
            });
            
            // Limpiar formulario
            setFormRegistro({
                nombre: '',
                ci: '',
                email: '',
                telefono: '',
                password: '',
                confirmPassword: ''
            });
            setPasoVenta(3); 
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || 'Error al registrar cliente',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleContinuarSinLogin = () => {
        // Si el cliente decide continuar sin registrarse/login
        // Usaremos datos manuales ingresados
        if (!clienteNuevo.nombre_razon_social.trim()) {
            notifications.show({
                title: 'Error',
                message: 'Ingresa al menos un nombre para el cliente',
                color: 'red'
            });
            return;
        }
        
        setClienteAutenticado({
            id: null, // Indica que no es cliente registrado
            nombre: clienteNuevo.nombre_razon_social,
            email: clienteNuevo.email,
            telefono: clienteNuevo.telefono,
            ci_nit: clienteNuevo.ci_nit
        });
        setPasoVenta(3);
    };

    const actualizarCantidad = async (productoId, nuevaCantidad) => {
        try {
            const producto = carrito.productos.find(p => p.id_producto === productoId);
            if (!producto) return;
            
            await api.delete(`/carrito/${carritoId}/producto/${productoId}`);
            
            if (nuevaCantidad > 0) {
                await api.post('/carrito/agregar', {
                    microempresaId,
                    productoId,
                    cantidad: nuevaCantidad,
                    carritoId
                });
            }
            
            cargarCarrito();
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudo actualizar la cantidad',
                color: 'red'
            });
        }
    };

    const eliminarProducto = async (productoId) => {
        try {
            await api.delete(`/carrito/${carritoId}/producto/${productoId}`);
            cargarCarrito();
            
            if (onActualizarCarrito) {
                onActualizarCarrito();
            }
            
            notifications.show({
                title: 'Producto eliminado',
                message: 'Producto removido del carrito',
                color: 'green'
            });
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudo eliminar el producto',
                color: 'red'
            });
        }
    };

    const vaciarCarrito = async () => {
        try {
            await api.delete(`/carrito/${carritoId}/vaciar`);
            setCarrito(null);
            onClose();
            
            if (onActualizarCarrito) {
                onActualizarCarrito();
            }
            
            notifications.show({
                title: 'Carrito vaciado',
                message: 'Todos los productos han sido removidos',
                color: 'blue'
            });
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudo vaciar el carrito',
                color: 'red'
            });
        }
    };

    const procesarVenta = async () => {
        setProcesando(true);
        try {
            // Preparar datos del cliente según el tipo
            let datosParaEnviar;
            
            if (clienteAutenticado && clienteAutenticado.id) {
                // Cliente registrado (con ID)
                datosParaEnviar = {
                    id_cliente: clienteAutenticado.id,
                    nombre_razon_social: clienteAutenticado.nombre,
                    email: clienteAutenticado.email,
                    telefono: clienteAutenticado.telefono || '',
                    ci_nit: clienteAutenticado.ci_nit || ''
                };
            } else if (clienteAutenticado && clienteAutenticado.nombre) {
                // Cliente no registrado (datos manuales)
                datosParaEnviar = {
                    nombre_razon_social: clienteAutenticado.nombre,
                    email: clienteAutenticado.email || '',
                    telefono: clienteAutenticado.telefono || '',
                    ci_nit: clienteAutenticado.ci_nit || ''
                };
            } else {
                // Cliente genérico
                datosParaEnviar = {
                    nombre_razon_social: 'Cliente no registrado'
                };
            }

            const response = await api.post('/carrito/procesar-venta', {
                carritoId,
                clienteData: datosParaEnviar,
                metodoPago
            });

            const ventaData = {
                pedido_id: response.data.pedido_id,
                fecha: response.data.fecha,
                cliente_nombre: clienteAutenticado?.nombre || datosParaEnviar.nombre_razon_social,
                cliente_ci: clienteAutenticado?.ci || clienteAutenticado?.ci_nit || datosParaEnviar.ci_nit,
                cliente_email: clienteAutenticado?.email || datosParaEnviar.email,
                cliente_telefono: clienteAutenticado?.telefono || datosParaEnviar.telefono,
                productos: response.data.productos_vendidos || carrito.productos,
                total: response.data.total || carrito.total,
                metodo_pago: response.data.metodo_pago || metodoPago
            };

            // Generar PDF automáticamente
            setTimeout(() => {
                PdfService.generarComprobanteVenta(ventaData);
            }, 1000);
            
            notifications.show({
                title: 'Venta completada!',
                message: `Pedido #${response.data.pedido_id} procesado exitosamente`,
                color: 'green',
                icon: <IconCheck size={20} />
            });
            
            // Limpiar todo
            setCarrito(null);
            setClienteAutenticado(null);
            setPasoVenta(1);
            setTabCliente('login');
            setClienteNuevo({
                nombre_razon_social: '',
                ci_nit: '',
                telefono: '',
                email: ''
            });
            
            // Limpiar carrito del localStorage
            localStorage.removeItem(`carrito_${microempresaId}`);
            
            // Cerrar modal
            setTimeout(() => {
                onClose();
            }, 1500);
            
            // Notificar al componente padre
            if (onActualizarCarrito) {
                onActualizarCarrito({ vaciado: true, carritoId: carritoId });
            }
            
        } catch (error) {
            notifications.show({
                title: 'Error en la venta',
                message: error.response?.data?.message || 'No se pudo procesar la venta',
                color: 'red'
            });
        } finally {
            setProcesando(false);
        }
    };

    if (loading) {
        return (
            <Modal opened={opened} onClose={onClose} size="lg" title="Carrito de Compras">
                <Center py={40}>
                    <Loader />
                </Center>
            </Modal>
        );
    }

    if (!carrito || !carrito.productos || carrito.productos.length === 0) {
        return (
            <Modal opened={opened} onClose={onClose} size="md" title="Carrito de Compras">
                <Stack align="center" py={40}>
                    <IconShoppingCart size={48} color="gray" />
                    <Text c="dimmed">El carrito está vacío</Text>
                    <Button onClick={onClose} variant="light">
                        Continuar comprando
                    </Button>
                </Stack>
            </Modal>
        );
    }

    return (
        <Modal 
            opened={opened} 
            onClose={onClose} 
            size={pasoVenta === 1 ? 'lg' : 'md'}
            title={
                pasoVenta === 1 ? "Carrito de Compras" : 
                pasoVenta === 2 ? "Identificación del Cliente" : 
                "Confirmar Compra"
            }
        >
            {pasoVenta === 1 && (
                <>
                    <ScrollArea h={400}>
                        <Stack gap="md">
                            {carrito.productos.map((producto) => (
                                <Paper key={producto.id_producto} p="md" withBorder radius="md">
                                    <Group justify="space-between">
                                        <div style={{ flex: 1 }}>
                                            <Text fw={500}>{producto.nombre}</Text>
                                            <Text size="sm" c="dimmed">
                                                Bs {parseFloat(producto.precio || 0).toFixed(2)} c/u
                                            </Text>
                                        </div>
                                        
                                        <Group>
                                            <NumberInput
                                                value={producto.cantidad}
                                                onChange={(val) => actualizarCantidad(producto.id_producto, val)}
                                                min={1}
                                                max={producto.stock_disponible}
                                                size="xs"
                                                w={80}
                                            />
                                            <Text fw={600} c="green">
                                                Bs {(producto.cantidad * parseFloat(producto.precio || 0)).toFixed(2)}
                                            </Text>
                                            <ActionIcon 
                                                color="red" 
                                                variant="subtle"
                                                onClick={() => eliminarProducto(producto.id_producto)}
                                            >
                                                <IconTrash size={16} />
                                            </ActionIcon>
                                        </Group>
                                    </Group>
                                </Paper>
                            ))}
                        </Stack>
                    </ScrollArea>
                    
                    <Divider my="md" />
                    
                    <Group justify="space-between">
                        <Button 
                            variant="light" 
                            color="red"
                            leftSection={<IconTrash size={16} />}
                            onClick={vaciarCarrito}
                        >
                            Vaciar Carrito
                        </Button>
                        
                        <Stack gap={0} align="flex-end">
                            <Text size="sm" c="dimmed">Total:</Text>
                            <Title order={3} c="green">
                                Bs {parseFloat(carrito.total || 0).toFixed(2)}
                            </Title>
                        </Stack>
                    </Group>
                    
                    <Button 
                        fullWidth 
                        mt="md"
                        size="lg"
                        color="blue"
                        leftSection={<IconReceipt size={20} />}
                        onClick={() => setPasoVenta(2)}
                        disabled={carrito.productos.length === 0}
                    >
                        Proceder al Pago
                    </Button>
                </>
            )}
            
            {pasoVenta === 2 && (
                <Stack gap="md">
                    <Alert color="blue" icon={<IconUser size={16} />}>
                        <Text size="sm">
                            {clienteAutenticado ? 
                                `Ya estás identificado como: ${clienteAutenticado.nombre}` :
                                'Para continuar con la compra, inicia sesión o regístrate'
                            }
                        </Text>
                    </Alert>
                    
                    {clienteAutenticado ? (
                        // Cliente ya autenticado
                        <Stack>
                            <Paper p="md" withBorder>
                                <Group>
                                    <IconUser size={20} color="green" />
                                    <div>
                                        <Text fw={500}>{clienteAutenticado.nombre}</Text>
                                        {clienteAutenticado.email && (
                                            <Text size="sm" c="dimmed">{clienteAutenticado.email}</Text>
                                        )}
                                    </div>
                                </Group>
                            </Paper>
                            <Button 
                                onClick={() => setPasoVenta(3)}
                                fullWidth
                            >
                                Continuar con estos datos
                            </Button>
                        </Stack>
                    ) : (
                        // Formularios de login/registro
                        <Tabs value={tabCliente} onChange={setTabCliente}>
                            <Tabs.List grow mb="md">
                                <Tabs.Tab value="login" leftSection={<IconLogin size={16} />}>
                                    Iniciar Sesión
                                </Tabs.Tab>
                                <Tabs.Tab value="registro" leftSection={<IconUserPlus size={16} />}>
                                    Registrarse
                                </Tabs.Tab>
                            </Tabs.List>
                            
                            <Tabs.Panel value="login">
                                <Stack gap="md">
                                    <TextInput
                                        label="Email"
                                        placeholder="cliente@email.com"
                                        type="email"
                                        value={formLogin.email}
                                        onChange={(e) => setFormLogin({...formLogin, email: e.target.value})}
                                        required
                                    />
                                    <TextInput
                                        label="Contraseña"
                                        type="password"
                                        placeholder="Tu contraseña"
                                        value={formLogin.password}
                                        onChange={(e) => setFormLogin({...formLogin, password: e.target.value})}
                                        required
                                    />
                                    <Button 
                                        onClick={handleLoginCliente}
                                        loading={loading}
                                        fullWidth
                                    >
                                        Iniciar Sesión
                                    </Button>
                                </Stack>
                            </Tabs.Panel>
                            <Tabs.Panel value="registro">
                                <Stack gap="md">
                                    <TextInput
                                        label="Nombre Completo"
                                        placeholder="Juan Pérez"
                                        value={formRegistro.nombre}
                                        onChange={(e) => setFormRegistro({...formRegistro, nombre: e.target.value})}
                                        required
                                    />
                                    <TextInput
                                        label="CI (Cédula de Identidad)"
                                        placeholder="12345678"
                                        value={formRegistro.ci}
                                        onChange={(e) => setFormRegistro({...formRegistro, ci: e.target.value})}
                                        required
                                    />
                                    <TextInput
                                        label="Email"
                                        placeholder="cliente@email.com"
                                        type="email"
                                        value={formRegistro.email}
                                        onChange={(e) => setFormRegistro({...formRegistro, email: e.target.value})}
                                        required
                                    />
                                    <TextInput
                                        label="Teléfono"
                                        placeholder="+591 70000000"
                                        value={formRegistro.telefono}
                                        onChange={(e) => setFormRegistro({...formRegistro, telefono: e.target.value})}
                                    />
                                    <TextInput
                                        label="Contraseña"
                                        type="password"
                                        placeholder="Mínimo 6 caracteres"
                                        value={formRegistro.password}
                                        onChange={(e) => setFormRegistro({...formRegistro, password: e.target.value})}
                                        required
                                    />
                                    <TextInput
                                        label="Confirmar Contraseña"
                                        type="password"
                                        placeholder="Repite tu contraseña"
                                        value={formRegistro.confirmPassword}
                                        onChange={(e) => setFormRegistro({...formRegistro, confirmPassword: e.target.value})}
                                        required
                                    />
                                    <Button 
                                        onClick={handleRegistroCliente}
                                        loading={loading}
                                        fullWidth
                                    >
                                        Registrarse
                                    </Button>
                                </Stack>
                            </Tabs.Panel>
                            
                            <Tabs.Panel value="sin-login">
                                <Stack gap="md">
                                    <Alert color="yellow">
                                        <Text size="sm">
                                            Puedes continuar sin registrarte. Se creará un cliente temporal para esta compra.
                                        </Text>
                                    </Alert>
                                    <TextInput
                                        label="Nombre/Razón Social"
                                        placeholder="Ej: Juan Pérez o Empresa XYZ"
                                        value={clienteNuevo.nombre_razon_social}
                                        onChange={(e) => setClienteNuevo({...clienteNuevo, nombre_razon_social: e.target.value})}
                                        required
                                    />
                                    <TextInput
                                        label="CI/NIT (Opcional)"
                                        placeholder="12345678"
                                        value={clienteNuevo.ci_nit}
                                        onChange={(e) => setClienteNuevo({...clienteNuevo, ci_nit: e.target.value})}
                                    />
                                    <TextInput
                                        label="Teléfono (Opcional)"
                                        placeholder="+591 70000000"
                                        value={clienteNuevo.telefono}
                                        onChange={(e) => setClienteNuevo({...clienteNuevo, telefono: e.target.value})}
                                    />
                                    <TextInput
                                        label="Email (Opcional)"
                                        placeholder="cliente@email.com"
                                        type="email"
                                        value={clienteNuevo.email}
                                        onChange={(e) => setClienteNuevo({...clienteNuevo, email: e.target.value})}
                                    />
                                    <Button 
                                        onClick={handleContinuarSinLogin}
                                        variant="light"
                                        fullWidth
                                    >
                                        Continuar sin registrarse
                                    </Button>
                                </Stack>
                            </Tabs.Panel>
                        </Tabs>
                    )}
                    
                    <Group justify="space-between" mt="md">
                        <Button 
                            variant="light" 
                            onClick={() => setPasoVenta(1)}
                        >
                            Volver al Carrito
                        </Button>
                    </Group>
                </Stack>
            )}
            
            {pasoVenta === 3 && (
                <Stack gap="md">
                    <Alert color="green" icon={<IconCheck size={20} />}>
                        <Text fw={500}>Resumen de la Compra</Text>
                    </Alert>
                    
                    {/* Información DETALLADA del cliente */}
                    <Paper p="md" withBorder radius="md" shadow="sm">
                        <Stack gap="xs">
                            <Group justify="space-between" mb="sm">
                                <Text fw={600} size="md">Información del Cliente</Text>
                                <Badge color={clienteAutenticado?.id ? "teal" : "blue"}>
                                    {clienteAutenticado?.id ? "Cliente Registrado" : "Cliente Temporal"}
                                </Badge>
                            </Group>
                            
                            {/* Nombre/Razón Social */}
                            <Group justify="space-between">
                                <Group gap="xs">
                                    <IconUser size={16} color="gray" />
                                    <Text size="sm" fw={500}>Nombre:</Text>
                                </Group>
                                <Text fw={600} size="sm">
                                    {clienteAutenticado?.nombre || clienteAutenticado?.nombre_razon_social || 'No especificado'}
                                </Text>
                            </Group>
                            
                            {/* CI/NIT */}
                            {(clienteAutenticado?.ci_nit || clienteAutenticado?.ci) && (
                                <Group justify="space-between">
                                    <Group gap="xs">
                                        <IconId size={16} color="gray" />
                                        <Text size="sm" fw={500}>CI/NIT:</Text>
                                    </Group>
                                    <Text size="sm">
                                        {clienteAutenticado?.ci_nit || clienteAutenticado?.ci}
                                    </Text>
                                </Group>
                            )}
                            
                            {/* Email */}
                            {clienteAutenticado?.email && (
                                <Group justify="space-between">
                                    <Group gap="xs">
                                        <IconMail size={16} color="gray" />
                                        <Text size="sm" fw={500}>Email:</Text>
                                    </Group>
                                    <Text size="sm" c="blue">
                                        {clienteAutenticado.email}
                                    </Text>
                                </Group>
                            )}
                            
                            {/* Teléfono */}
                            {clienteAutenticado?.telefono && (
                                <Group justify="space-between">
                                    <Group gap="xs">
                                        <IconPhone size={16} color="gray" />
                                        <Text size="sm" fw={500}>Teléfono:</Text>
                                    </Group>
                                    <Text size="sm">
                                        {clienteAutenticado.telefono}
                                    </Text>
                                </Group>
                            )}
                            
                            {/* ID del cliente (si está registrado) */}
                            {clienteAutenticado?.id && (
                                <Group justify="space-between">
                                    <Group gap="xs">
                                        <IconKey size={16} color="gray" />
                                        <Text size="sm" fw={500}>ID Cliente:</Text>
                                    </Group>
                                    <Badge size="sm" variant="outline" color="gray">
                                        #{clienteAutenticado.id}
                                    </Badge>
                                </Group>
                            )}
                            
                            {/* Si faltan datos */}
                            {(!clienteAutenticado?.email && !clienteAutenticado?.telefono) && (
                                <Alert color="yellow" size="xs" p="xs" mt="xs">
                                    <Text size="xs">El cliente no tiene email ni teléfono registrados</Text>
                                </Alert>
                            )}
                        </Stack>
                    </Paper>
                    
                    {/* Método de pago */}
                    <Paper p="md" withBorder radius="md" shadow="sm">
                        <Stack gap="xs">
                            <Text fw={600} size="md">Método de Pago</Text>
                            <Select
                                value={metodoPago}
                                onChange={setMetodoPago}
                                data={[
                                    { value: 'tarjeta', label: 'Tarjeta de Crédito/Débito' },
                                    { value: 'transferencia', label: 'Transferencia Bancaria' },
                                    { value: 'qr', label: 'QR' },
                                ]}
                                size="md"
                            />
                            {metodoPago === 'efectivo' && (
                                <Alert color="blue" size="xs" p="xs">
                                    <Text size="xs">Prepare el cambio correspondiente</Text>
                                </Alert>
                            )}
                        </Stack>
                    </Paper>
                    
                    {/* Resumen del carrito */}
                    <Paper p="md" withBorder radius="md" shadow="sm">
                        <Stack gap="xs">
                            <Text fw={600} size="md">Resumen del Pedido</Text>
                            
                            {/* Lista de productos */}
                            <ScrollArea h={150} type="auto">
                                <Stack gap="xs">
                                    {carrito.productos.map((producto, index) => (
                                        <Group key={producto.id_producto} justify="space-between">
                                            <Text size="sm">
                                                {index + 1}. {producto.nombre}
                                            </Text>
                                            <Group gap="xs">
                                                <Badge size="xs">x{producto.cantidad}</Badge>
                                                <Text size="sm" fw={600}>
                                                    Bs {(producto.cantidad * parseFloat(producto.precio || 0)).toFixed(2)}
                                                </Text>
                                            </Group>
                                        </Group>
                                    ))}
                                </Stack>
                            </ScrollArea>
                            
                            <Divider my="xs" />
                            
                            {/* Totales */}
                            <Group justify="space-between">
                                <Text size="sm">Cantidad de productos:</Text>
                                <Badge size="sm" color="blue">
                                    {carrito.productos.length}
                                </Badge>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm">Unidades totales:</Text>
                                <Badge size="sm" color="green">
                                    {carrito.productos.reduce((sum, p) => sum + p.cantidad, 0)}
                                </Badge>
                            </Group>
                            <Group justify="space-between" mt="xs">
                                <Text fw={700} size="lg">Total a pagar:</Text>
                                <Title order={3} c="green">
                                    Bs {parseFloat(carrito.total || 0).toFixed(2)}
                                </Title>
                            </Group>
                        </Stack>
                    </Paper>
                    
                    {/* Alertas importantes */}
                    <Alert color="yellow" icon={<IconPackage size={20} />}>
                        <Stack gap={4}>
                            <Text size="sm" fw={600}>Verificaciones importantes:</Text>
                            <Text size="xs">• Se verificará el stock antes de procesar</Text>
                            <Text size="xs">• Si algún producto no tiene stock suficiente, la venta será cancelada</Text>
                            <Text size="xs">• Se generará un comprobante de venta</Text>
                        </Stack>
                    </Alert>
                    
                    {/* Botones de acción */}
                    <Group justify="space-between" mt="md">
                        <Button 
                            variant="light" 
                            color="gray"
                            leftSection={<IconArrowBack size={16} />}
                            onClick={() => setPasoVenta(2)}
                        >
                            Editar datos del cliente
                        </Button>
                        <Button 
                            color="green"
                            size="lg"
                            loading={procesando}
                            onClick={procesarVenta}
                            leftSection={<IconCash size={20} />}
                            rightSection={<IconArrowRight size={20} />}
                        >
                            Confirmar Venta
                        </Button>
                    </Group>
                    
                    {/* Pequeño texto informativo */}
                    <Text size="xs" c="dimmed" ta="center" mt="md">
                        Los datos del cliente se guardarán en el historial de ventas
                    </Text>
                </Stack>
            )}

        </Modal>
    );
};

export default CarritoModal;