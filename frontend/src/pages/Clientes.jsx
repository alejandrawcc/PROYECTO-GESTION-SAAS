import { useState, useEffect } from 'react';
import { 
    Container, 
    Table, 
    Button, 
    Group, 
    Title, 
    Card, 
    Badge, 
    ActionIcon, 
    Text, 
    Modal, 
    TextInput,
    SimpleGrid,
    Paper,
    Loader,
    Center,
    Stack,
    Tooltip,
    Input,
    Tabs,
    ScrollArea,
    Grid,
    Select
} from '@mantine/core';
import { 
    IconUserPlus, 
    IconEdit, 
    IconSearch,
    IconRefresh,
    IconEye,
    IconMail,
    IconPhone,
    IconCalendar,
    IconToggleLeft,
    IconToggleRight,
    IconId,
    IconMapPin,
    IconBuildingStore,
    IconListDetails,
    IconCheck,
    IconX,
    IconUsers,
    IconPlus
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getCurrentUser } from '../services/auth';
import api from '../services/api';
import { useDisclosure } from '@mantine/hooks';

const Clientes = () => {
    const user = getCurrentUser();
    const isSuperAdmin = user?.rol === 'super_admin';

    const [clientes, setClientes] = useState([]);
    const [clientesInactivos, setClientesInactivos] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('activos');
    const [searchTerm, setSearchTerm] = useState('');

    // Estados para modales
    const [modalNuevoOpen, { open: openNuevo, close: closeNuevo }] = useDisclosure(false);
    const [modalEditarOpen, { open: openEditar, close: closeEditar }] = useDisclosure(false);
    const [modalDetallesOpen, { open: openDetalles, close: closeDetalles }] = useDisclosure(false);

    // Estados para formularios
    const [nuevoCliente, setNuevoCliente] = useState({ 
        nombre_razon_social: '', 
        ci_nit: '', 
        telefono: '', 
        email: '',
        estado: 'activo',
        microempresa_id_manual: null
    });
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [clienteParaEditar, setClienteParaEditar] = useState(null);

    // Cargar todos los datos
    // Cargar todos los datos
    const cargarDatos = async () => {
        setLoading(true);
        try {
            console.log("🔄 Cargando datos de clientes...");
            
            // 1. Pedimos TODOS los clientes en una sola llamada
            const res = await api.get('/clientes');
            const data = res.data || [];
            
            console.log("✅ Datos recibidos:", data);

            if (Array.isArray(data)) {
                // 2. Filtramos aquí mismo en el navegador
                const activos = data.filter(c => c.estado === 'activo');
                const inactivos = data.filter(c => c.estado === 'inactivo');

                setClientes(activos);
                setClientesInactivos(inactivos);
            } else {
                setClientes([]);
                setClientesInactivos([]);
            }

            // Si es super admin, cargar empresas
            if (isSuperAdmin) {
                try {
                    const resEmpresas = await api.get('/clientes/lista-empresas');
                    setEmpresas(resEmpresas.data || []);
                } catch (error) {
                    console.error("Error cargando empresas:", error);
                    setEmpresas([]);
                }
            }
            
        } catch (error) {
            console.error("❌ Error cargando clientes:", error);
            notifications.show({ 
                title: 'Error', 
                message: error.response?.data?.message || 'Error al cargar clientes', 
                color: 'red' 
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        cargarDatos(); 
    }, [activeTab, isSuperAdmin]);

    // Función para manejar el registro
    const handleRegistrar = async () => {
        try {
            console.log("📤 Enviando datos del cliente:", nuevoCliente);
            
            const response = await api.post('/clientes', nuevoCliente);
            console.log("✅ Respuesta del servidor:", response);
            
            notifications.show({ 
                title: '✅ Cliente registrado', 
                message: `${nuevoCliente.nombre} ha sido registrado con éxito`, 
                color: 'green' 
            });
            
            closeNuevo();
            cargarDatos();
            setNuevoCliente({ 
                nombre_razon_social: '', 
                ci_nit: '', 
                telefono: '', 
                email: '',
                estado: 'activo',
                microempresa_id_manual: null
            });
        } catch (error) {
            console.error("❌ Error registrando cliente:", error);
            notifications.show({ 
                title: 'Error', 
                message: error.response?.data?.message || 'No se pudo registrar el cliente', 
                color: 'red' 
            });
        }
    };

    // Función para manejar la edición
    const handleEditar = async () => {
        if (!clienteParaEditar) return;
        
        try {
            await api.put(`/clientes/${clienteParaEditar.id_cliente}`, {
                nombre_razon_social: clienteParaEditar.nombre_razon_social,
                ci_nit: clienteParaEditar.ci_nit,
                telefono: clienteParaEditar.telefono,
                email: clienteParaEditar.email,
                microempresa_id_manual: clienteParaEditar.microempresa_id_manual
            });
            
            notifications.show({ 
                title: '✅ Cliente actualizado', 
                message: 'Los datos han sido modificados', 
                color: 'green' 
            });
            
            closeEditar();
            cargarDatos();
            setClienteParaEditar(null);
        } catch (error) {
            notifications.show({ 
                title: 'Error', 
                message: error.response?.data?.message || 'No se pudo actualizar', 
                color: 'red' 
            });
        }
    };

    // Función para cambiar estado
    const handleToggleEstado = async (id, estadoActual, nombre) => {
        const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
        const accion = nuevoEstado === 'activo' ? 'activar' : 'desactivar';
        
        if (!confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} a ${nombre}?`)) return;
        
        try {
            // Actualización optimista
            if (nuevoEstado === 'inactivo') {
                setClientes(prev => prev.filter(c => c.id_cliente !== id));
            } else {
                setClientesInactivos(prev => prev.filter(c => c.id_cliente !== id));
            }
            
            await api.put(`/clientes/${id}/toggle`, { nuevoEstado });
            
            notifications.show({ 
                title: '✅ Estado Actualizado', 
                message: `Cliente ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'}`, 
                color: nuevoEstado === 'activo' ? 'green' : 'orange' 
            });
            
            // Recargar datos completos
            setTimeout(() => cargarDatos(), 500);
        } catch (error) {
            notifications.show({ 
                title: 'Error', 
                message: `No se pudo ${accion} el cliente`, 
                color: 'red' 
            });
            cargarDatos(); // Revertir cambios
        }
    };

    // Filtrar clientes según búsqueda
    const filtrarClientes = (lista) => {
        if (!searchTerm.trim()) return lista;
        
        const termino = searchTerm.toLowerCase();
        return lista.filter(cliente =>
            (cliente.nombre_razon_social?.toLowerCase().includes(termino) || false) ||
            (cliente.ci_nit?.toLowerCase().includes(termino) || false) ||
            (cliente.email?.toLowerCase().includes(termino) || false) ||
            (cliente.telefono?.includes(termino) || false) ||
            (cliente.empresa_nombre?.toLowerCase().includes(termino) || false)
        );
    };

    // Obtener lista filtrada según pestaña activa
    const obtenerListaFiltrada = () => {
        if (activeTab === 'activos') {
            return filtrarClientes(clientes);
        } else {
            return filtrarClientes(clientesInactivos);
        }
    };

    const listaFiltrada = obtenerListaFiltrada();

    // Renderizar filas de clientes
    const renderRows = (clientesLista) => {
        return clientesLista.map((cli) => (
            <Table.Tr key={cli.id_cliente} style={{ opacity: cli.estado === 'inactivo' ? 0.7 : 1 }}>
                {/* ID */}
                <Table.Td>
                    <Text size="xs" c="dimmed">#{cli.id_cliente}</Text>
                </Table.Td>
                
                {/* Nombre */}
                <Table.Td>
                    <Text fw={500}>{cli.nombre_razon_social}</Text>
                </Table.Td>
                
                {/* CI/NIT */}
                <Table.Td>
                    <Group gap={4}>
                        <IconId size={14} />
                        <Text size="sm">{cli.ci_nit}</Text>
                    </Group>
                </Table.Td>
                
                {/* Contacto */}
                <Table.Td>
                    <Stack gap={4}>
                        {cli.email && (
                            <Group gap={4}>
                                <IconMail size={12} />
                                <Text size="xs">{cli.email}</Text>
                            </Group>
                        )}
                        {cli.telefono && (
                            <Group gap={4}>
                                <IconPhone size={12} />
                                <Text size="xs">{cli.telefono}</Text>
                            </Group>
                        )}
                    </Stack>
                </Table.Td>
                
                {/* Empresa */}
                <Table.Td>
                    {isSuperAdmin && cli.empresa_nombre && (
                        <Group gap={4}>
                            <IconBuildingStore size={12} />
                            <Badge size="xs" variant="outline">{cli.empresa_nombre}</Badge>
                        </Group>
                    )}
                </Table.Td>
                
                {/* Estado */}
                <Table.Td>
                    <Badge 
                        size="sm" 
                        color={cli.estado === 'activo' ? 'green' : 'gray'}
                        variant="light"
                    >
                        {cli.estado?.toUpperCase() || 'ACTIVO'}
                    </Badge>
                </Table.Td>
                
                {/* Acciones */}
                <Table.Td>
                    <Group gap="xs">
                        <Tooltip label="Ver detalles">
                            <ActionIcon 
                                variant="subtle" 
                                color="blue" 
                                size="sm"
                                onClick={() => {
                                    setClienteSeleccionado(cli);
                                    openDetalles();
                                }}
                            >
                                <IconEye size={16} />
                            </ActionIcon>
                        </Tooltip>
                        
                        <Tooltip label="Editar">
                            <ActionIcon 
                                variant="subtle" 
                                color="yellow" 
                                size="sm"
                                onClick={() => {
                                    setClienteParaEditar({
                                        ...cli,
                                        microempresa_id_manual: isSuperAdmin ? String(cli.microempresa_id) : null
                                    });
                                    openEditar();
                                }}
                            >
                                <IconEdit size={16} />
                            </ActionIcon>
                        </Tooltip>
                        
                        <Tooltip label={activeTab === 'activos' ? 'Desactivar' : 'Activar'}>
                            <ActionIcon
                                variant="subtle"
                                color={activeTab === 'activos' ? 'orange' : 'green'}
                                size="sm"
                                onClick={() => handleToggleEstado(
                                    cli.id_cliente, 
                                    cli.estado, 
                                    cli.nombre
                                )}
                            >
                                {activeTab === 'activos' ? 
                                    <IconToggleLeft size={16} /> : 
                                    <IconToggleRight size={16} />
                                }
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Table.Td>
            </Table.Tr>
        ));
    };

    return (
        <Container size="xl" py="xl">
            {/* Header */}
            <Group justify="space-between" mb="lg">
                <div>
                    <Title order={2}>Gestión de Clientes</Title>
                    <Text c="dimmed" size="sm">
                        {isSuperAdmin 
                            ? 'Administra todos los clientes del sistema' 
                            : `Cartera de clientes de tu empresa`}
                    </Text>
                </div>
                
                <Group>
                    <Button 
                        leftSection={<IconUserPlus size={18} />} 
                        onClick={openNuevo}
                        variant="gradient"
                        gradient={{ from: 'blue', to: 'cyan' }}
                    >
                        Nuevo Cliente
                    </Button>
                </Group>
            </Group>

            {/* Tarjetas de estadísticas */}
            <SimpleGrid cols={3} mb="lg">
                <Paper p="md" withBorder radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Clientes Activos</Text>
                            <Text fw={700} size="xl">{clientes.length}</Text>
                        </div>
                        <IconCheck size={24} color="green" />
                    </Group>
                </Paper>
                
                <Paper p="md" withBorder radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Clientes Inactivos</Text>
                            <Text fw={700} size="xl" c="red.7">{clientesInactivos.length}</Text>
                        </div>
                        <IconX size={24} color="red" />
                    </Group>
                </Paper>
                
                <Paper p="md" withBorder radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Total Registrados</Text>
                            <Text fw={700} size="xl">{clientes.length + clientesInactivos.length}</Text>
                        </div>
                        <IconUsers size={24} color="blue" />
                    </Group>
                </Paper>
            </SimpleGrid>

            {/* Pestañas y barra de búsqueda */}
            <Card withBorder radius="md" mb="lg">
                <Tabs value={activeTab} onChange={setActiveTab}>
                    <Tabs.List grow mb="md">
                        <Tabs.Tab 
                            value="activos" 
                            leftSection={<IconCheck size={16} />}
                        >
                            Activos ({clientes.length})
                        </Tabs.Tab>
                        <Tabs.Tab 
                            value="inactivos" 
                            leftSection={<IconX size={16} />}
                        >
                            Inactivos ({clientesInactivos.length})
                        </Tabs.Tab>
                    </Tabs.List>

                    {/* Barra de herramientas */}
                    <Group justify="space-between" mb="md">
                        <Input
                            placeholder={`Buscar por nombre, CI/NIT, email...`}
                            leftSection={<IconSearch size={16} />}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        
                        <Button 
                            variant="light" 
                            leftSection={<IconRefresh size={18} />}
                            onClick={cargarDatos}
                            loading={loading}
                        >
                            Actualizar
                        </Button>
                    </Group>

                    {/* Tabla de clientes con scroll */}
                    {loading ? (
                        <Center py={40}>
                            <Loader />
                        </Center>
                    ) : (
                        <ScrollArea>
                            <Table striped highlightOnHover>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>ID</Table.Th>
                                        <Table.Th>Nombre</Table.Th>
                                        <Table.Th>CI/NIT</Table.Th>
                                        <Table.Th>Contacto</Table.Th>
                                        {isSuperAdmin && <Table.Th>Empresa</Table.Th>}
                                        <Table.Th>Estado</Table.Th>
                                        <Table.Th>Acciones</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {listaFiltrada.length > 0 ? 
                                        renderRows(listaFiltrada) : (
                                        <Table.Tr>
                                            <Table.Td colSpan={isSuperAdmin ? 7 : 6}>
                                                <Center py={40}>
                                                    <Stack align="center" gap="xs">
                                                        <IconListDetails size={48} color="gray" />
                                                        <Text c="dimmed">
                                                            {activeTab === 'activos' 
                                                                ? 'No hay clientes activos registrados' 
                                                                : 'No hay clientes inactivos'}
                                                        </Text>
                                                        {activeTab === 'activos' && (
                                                            <Button 
                                                                variant="light" 
                                                                size="sm"
                                                                onClick={openNuevo}
                                                            >
                                                                Registrar primer cliente
                                                            </Button>
                                                        )}
                                                    </Stack>
                                                </Center>
                                            </Table.Td>
                                        </Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                            
                            {/* Contador de resultados */}
                            <Text size="sm" c="dimmed" mt="md" ta="right">
                                Mostrando {listaFiltrada.length} {activeTab === 'activos' ? 'clientes activos' : 'clientes inactivos'}
                            </Text>
                        </ScrollArea>
                    )}
                </Tabs>
            </Card>

            {/* Modal para nuevo cliente */}
            <Modal 
                opened={modalNuevoOpen} 
                onClose={closeNuevo} 
                title="Registrar Nuevo Cliente"
                size="lg"
            >
                <Stack gap="md">
                    {isSuperAdmin && empresas.length > 0 && (
                        <Select
                            label="Asignar a Empresa"
                            placeholder="Selecciona una empresa"
                            searchable
                            clearable
                            data={empresas.map(e => ({ 
                                value: String(e.id_microempresa), 
                                label: e.nombre 
                            }))}
                            value={nuevoCliente.microempresa_id_manual}
                            onChange={(val) => setNuevoCliente({...nuevoCliente, microempresa_id_manual: val})}
                        />
                    )}
                    
                    <TextInput 
                        label="Nombre" 
                        placeholder="Ej: Juan Pérez"
                        required
                        value={nuevoCliente.nombre_razon_social}
                        onChange={(e) => setNuevoCliente({...nuevoCliente, nombre_razon_social: e.target.value})}
                    />
                    
                    <SimpleGrid cols={2}>
                        <TextInput 
                            label="CI / NIT" 
                            placeholder="12345678"
                            required
                            value={nuevoCliente.ci_nit}
                            onChange={(e) => setNuevoCliente({...nuevoCliente, ci_nit: e.target.value})}
                        />
                        <TextInput 
                            label="Teléfono" 
                            placeholder="+591 70000000"
                            value={nuevoCliente.telefono}
                            onChange={(e) => setNuevoCliente({...nuevoCliente, telefono: e.target.value})}
                        />
                    </SimpleGrid>
                    
                    <TextInput 
                        label="Email" 
                        placeholder="cliente@email.com"
                        type="email"
                        value={nuevoCliente.email}
                        onChange={(e) => setNuevoCliente({...nuevoCliente, email: e.target.value})}
                    />
                    
                    <Group justify="flex-end" mt="md">
                        <Button variant="light" onClick={closeNuevo}>
                            Cancelar
                        </Button>
                        <Button onClick={handleRegistrar}>
                            Guardar Cliente
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Modal para editar cliente */}
            <Modal 
                opened={modalEditarOpen} 
                onClose={closeEditar} 
                title="Editar Cliente"
                size="lg"
            >
                {clienteParaEditar && (
                    <Stack gap="md">
                        {isSuperAdmin && empresas.length > 0 && (
                            <Select
                                label="Asignar a Empresa"
                                placeholder="Selecciona una empresa"
                                searchable
                                clearable
                                data={empresas.map(e => ({ 
                                    value: String(e.id_microempresa), 
                                    label: e.nombre 
                                }))}
                                value={clienteParaEditar.microempresa_id_manual}
                                onChange={(val) => setClienteParaEditar({
                                    ...clienteParaEditar, 
                                    microempresa_id_manual: val
                                })}
                            />
                        )}
                        
                        <TextInput 
                            label="Nombre" 
                            value={clienteParaEditar.nombre_razon_social}
                            onChange={(e) => setClienteParaEditar({
                                ...clienteParaEditar, 
                                nombre_razon_social: e.target.value
                            })}
                            required
                        />
                        
                        <SimpleGrid cols={2}>
                            <TextInput 
                                label="CI / NIT" 
                                value={clienteParaEditar.ci_nit}
                                onChange={(e) => setClienteParaEditar({
                                    ...clienteParaEditar, 
                                    ci_nit: e.target.value
                                })}
                                required
                            />
                            <TextInput 
                                label="Teléfono" 
                                value={clienteParaEditar.telefono}
                                onChange={(e) => setClienteParaEditar({
                                    ...clienteParaEditar, 
                                    telefono: e.target.value
                                })}
                            />
                        </SimpleGrid>
                        
                        <TextInput 
                            label="Email" 
                            type="email"
                            value={clienteParaEditar.email}
                            onChange={(e) => setClienteParaEditar({
                                ...clienteParaEditar, 
                                email: e.target.value
                            })}
                        />
                        
                        <Group justify="flex-end" mt="md">
                            <Button variant="light" onClick={closeEditar}>
                                Cancelar
                            </Button>
                            <Button onClick={handleEditar}>
                                Guardar Cambios
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            {/* Modal para ver detalles */}
            <Modal 
                opened={modalDetallesOpen} 
                onClose={closeDetalles} 
                title="Detalles del Cliente"
                size="md"
            >
                {clienteSeleccionado && (
                    <Stack gap="md">
                        <Paper p="md" withBorder>
                            <Group justify="space-between">
                                <div>
                                    <Text fw={700} size="lg">{clienteSeleccionado.nombre_razon_social}</Text>
                        
                                    <Text c="dimmed" size="xs">{clienteSeleccionado.ci_nit}</Text>
                                </div>
                                <Badge 
                                    color={clienteSeleccionado.estado === 'activo' ? 'green' : 'gray'}
                                    size="lg"
                                >
                                    {clienteSeleccionado.estado?.toUpperCase() || 'ACTIVO'}
                                </Badge>
                            </Group>
                        </Paper>
                        
                        <Stack gap="sm">
                            {clienteSeleccionado.email && (
                                <Group gap="sm">
                                    <IconMail size={16} color="gray" />
                                    <Text>{clienteSeleccionado.email}</Text>
                                </Group>
                            )}
                            
                            {clienteSeleccionado.telefono && (
                                <Group gap="sm">
                                    <IconPhone size={16} color="gray" />
                                    <Text>{clienteSeleccionado.telefono}</Text>
                                </Group>
                            )}
                            
                            {isSuperAdmin && clienteSeleccionado.empresa_nombre && (
                                <Group gap="sm">
                                    <IconBuildingStore size={16} color="gray" />
                                    <Text>Empresa: {clienteSeleccionado.empresa_nombre}</Text>
                                </Group>
                            )}
                            
                            <Group gap="sm">
                                <IconId size={16} color="gray" />
                                <Text>ID: #{clienteSeleccionado.id_cliente}</Text>
                            </Group>
                        </Stack>
                        
                        <Group justify="flex-end" mt="md">
                            <Button 
                                variant="light" 
                                color={clienteSeleccionado.estado === 'activo' ? 'orange' : 'green'}
                                leftSection={clienteSeleccionado.estado === 'activo' ? 
                                    <IconToggleLeft size={16} /> : 
                                    <IconToggleRight size={16} />
                                }
                                onClick={() => {
                                    handleToggleEstado(
                                        clienteSeleccionado.id_cliente, 
                                        clienteSeleccionado.estado, 
                                        clienteSeleccionado.nombre
                                    );
                                    closeDetalles();
                                }}
                            >
                                {clienteSeleccionado.estado === 'activo' ? 'Desactivar' : 'Activar'}
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>
        </Container>
    );
};

export default Clientes;