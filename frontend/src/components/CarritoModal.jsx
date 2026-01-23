import { 
    Modal, Paper, Group, Stack, Text, Button, Badge, 
    NumberInput, ActionIcon, Divider, Title, Alert,
    TextInput, Select, Loader, Center, ScrollArea
} from '@mantine/core';
import { 
    IconShoppingCart, IconTrash, IconX, IconCheck, 
    IconUser, IconCash, IconPackage, IconReceipt
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import api from '../services/api';

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
    
    // Renombrar estado local para evitar conflicto
    const [formularioCliente, setFormularioCliente] = useState({
        tipo: 'nuevo',
        nombre_razon_social: '',
        ci_nit: '',
        telefono: '',
        email: '',
        id_cliente: null
    });
    
    const [metodoPago, setMetodoPago] = useState('efectivo');

    useEffect(() => {
        // Si ya viene con datos del cliente logueado, usarlos
        if (datosCliente) {
            setFormularioCliente({
                tipo: 'existente',
                nombre_razon_social: datosCliente.nombre || '',
                ci_nit: '',
                telefono: datosCliente.telefono || '',
                email: datosCliente.email || '',
                id_cliente: datosCliente.id
            });
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
            // Si ya viene con datos del cliente logueado, usarlos automáticamente
            let datosParaEnviar;
            
            if (datosCliente && datosCliente.id) {
                // Usar datos del cliente logueado
                datosParaEnviar = {
                    id_cliente: datosCliente.id,
                    nombre_razon_social: datosCliente.nombre,
                    email: datosCliente.email,
                    telefono: datosCliente.telefono || ''
                };
            } else if (formularioCliente.tipo === 'existente' && formularioCliente.id_cliente) {
                // Usar ID del cliente existente
                datosParaEnviar = { id_cliente: formularioCliente.id_cliente };
            } else {
                // Usar datos del formulario para nuevo cliente
                datosParaEnviar = {
                    nombre_razon_social: formularioCliente.nombre_razon_social,
                    ci_nit: formularioCliente.ci_nit,
                    telefono: formularioCliente.telefono,
                    email: formularioCliente.email
                };
            }

            const response = await api.post('/carrito/procesar-venta', {
                carritoId,
                clienteData: datosParaEnviar,
                metodoPago
            });
            
            notifications.show({
                title: 'Venta completada!',
                message: `Pedido #${response.data.pedido_id} procesado exitosamente`,
                color: 'green',
                icon: <IconCheck size={20} />
            });
            
            // Limpiar carrito localmente
            setCarrito(null);
            setPasoVenta(1);
            
            // Limpiar carrito del localStorage
            localStorage.removeItem(`carrito_${microempresaId}`);
            
            // Cerrar modal después de un breve delay
            setTimeout(() => {
                onClose();
            }, 1500);
            
            // Notificar al componente padre que el carrito fue vaciado
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
            title={pasoVenta === 1 ? "Carrito de Compras" : pasoVenta === 2 ? "Datos del Cliente" : "Confirmar Compra"}
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
                    {/* Mostrar datos del cliente logueado si existen */}
                    {datosCliente && datosCliente.id ? (
                        <Alert color="teal" icon={<IconUser size={16} />}>
                            <Text size="sm" fw={500}>Cliente registrado</Text>
                            <Text size="xs">Nombre: {datosCliente.nombre} | Email: {datosCliente.email}</Text>
                            <Text size="xs" mt={4}>Los datos de tu cuenta se usarán para la compra.</Text>
                        </Alert>
                    ) : (
                        <>
                            <Select
                                label="Tipo de Cliente"
                                value={formularioCliente.tipo}
                                onChange={(val) => setFormularioCliente({...formularioCliente, tipo: val})}
                                data={[
                                    { value: 'nuevo', label: 'Registrarse' },
                                    { value: 'existente', label: 'Iniciar Sesión' }
                                ]}
                            />
                            
                            {formularioCliente.tipo === 'nuevo' ? (
                                <>
                                    <TextInput
                                        label="Nombre/Razón Social"
                                        placeholder="Juan Pérez o Empresa XYZ"
                                        value={formularioCliente.nombre_razon_social}
                                        onChange={(e) => setFormularioCliente({...formularioCliente, nombre_razon_social: e.target.value})}
                                        required
                                    />
                                    <TextInput
                                        label="CI/NIT"
                                        placeholder="12345678"
                                        value={formularioCliente.ci_nit}
                                        onChange={(e) => setFormularioCliente({...formularioCliente, ci_nit: e.target.value})}
                                    />
                                    <TextInput
                                        label="Teléfono"
                                        placeholder="+591 70000000"
                                        value={formularioCliente.telefono}
                                        onChange={(e) => setFormularioCliente({...formularioCliente, telefono: e.target.value})}
                                    />
                                    <TextInput
                                        label="Email"
                                        placeholder="cliente@email.com"
                                        type="email"
                                        value={formularioCliente.email}
                                        onChange={(e) => setFormularioCliente({...formularioCliente, email: e.target.value})}
                                    />
                                    <TextInput
                                        label="Email"
                                        placeholder="cliente@email.com"
                                        type="email"
                                        value={formularioCliente.email}
                                        onChange={(e) => setFormularioCliente({...formularioCliente, email: e.target.value})}
                                    />
                                </>
                            ) : (
                                <TextInput
                                    label="ID de Cliente Registrado"
                                    placeholder="Ingrese el ID del cliente"
                                    value={formularioCliente.id_cliente || ''}
                                    onChange={(e) => setFormularioCliente({...formularioCliente, id_cliente: e.target.value})}
                                    description="Si no conoce el ID, seleccione 'Cliente Nuevo'"
                                />
                            )}
                        </>
                    )}
                    
                    <Select
                        label="Método de Pago"
                        value={metodoPago}
                        onChange={setMetodoPago}
                        data={[
                            { value: 'efectivo', label: 'Efectivo' },
                            { value: 'tarjeta', label: 'Tarjeta de Crédito/Débito' },
                            { value: 'transferencia', label: 'Transferencia Bancaria' },
                            { value: 'qr', label: 'QR' }
                        ]}
                    />
                    
                    <Group justify="space-between" mt="md">
                        <Button 
                            variant="light" 
                            onClick={() => setPasoVenta(1)}
                        >
                            Volver al Carrito
                        </Button>
                        <Button 
                            onClick={() => setPasoVenta(3)}
                            disabled={formularioCliente.tipo === 'nuevo' && !formularioCliente.nombre_razon_social && !datosCliente}
                        >
                            Continuar
                        </Button>
                    </Group>
                </Stack>
            )}
            
            {pasoVenta === 3 && (
                <Stack gap="md">
                    <Alert color="green" icon={<IconCheck size={20} />}>
                        <Text fw={500}>Resumen de la Compra</Text>
                    </Alert>
                    
                    <Paper p="md" withBorder>
                        <Stack gap="xs">
                            <Group justify="space-between">
                                <Text size="sm">Productos:</Text>
                                <Text fw={500}>{carrito.productos.length}</Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm">Total:</Text>
                                <Text fw={500} size="lg" c="green">Bs {parseFloat(carrito.total || 0).toFixed(2)}</Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm">Método de Pago:</Text>
                                <Badge>{metodoPago}</Badge>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm">Cliente:</Text>
                                <Text size="sm">
                                    {datosCliente 
                                        ? `${datosCliente.nombre} (Registrado)`
                                        : formularioCliente.tipo === 'existente' 
                                            ? `ID: ${formularioCliente.id_cliente}`
                                            : formularioCliente.nombre_razon_social
                                    }
                                </Text>
                            </Group>
                        </Stack>
                    </Paper>
                    
                    <Alert color="yellow" icon={<IconPackage size={20} />}>
                        <Text size="sm">
                            Se verificará el stock antes de procesar. Si algún producto no tiene stock suficiente, la venta será cancelada.
                        </Text>
                    </Alert>
                    
                    <Group justify="space-between" mt="md">
                        <Button 
                            variant="light" 
                            onClick={() => setPasoVenta(2)}
                        >
                            Atrás
                        </Button>
                        <Button 
                            color="green"
                            loading={procesando}
                            onClick={procesarVenta}
                            leftSection={<IconCash size={20} />}
                        >
                            Confirmar y Procesar Venta
                        </Button>
                    </Group>
                </Stack>
            )}
        </Modal>
    );
};

export default CarritoModal;