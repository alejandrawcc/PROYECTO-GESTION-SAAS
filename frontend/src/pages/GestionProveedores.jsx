import { 
    Container, Title, Text, Card, Table, Button, Group, Badge, Modal,
    TextInput, Select, Stack, ActionIcon, Tooltip, Center, Loader,
    Paper, SimpleGrid, Textarea, Alert, Divider, Tabs, ScrollArea,
    Grid, NumberInput, Pagination, ThemeIcon, Box, Switch
} from '@mantine/core';
import { 
    IconPlus, IconSearch, IconBuildingStore, IconPencil, 
    IconTrash, IconEye, IconRefresh, IconCheck, IconX,
    IconUser, IconPhone, IconMail, IconMapPin, IconId,
    IconPackage, IconShoppingCart, IconListDetails, IconAlertCircle,
    IconFilter, IconArrowRight, IconInfoCircle, IconDeviceFloppy,
    IconUsers, IconUserOff, IconChartBar, IconEyeOff
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { getCurrentUser } from '../services/auth';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const GestionProveedores = () => {
    const user = getCurrentUser();
    const navigate = useNavigate();
    
    const [proveedores, setProveedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalDetallesOpen, setModalDetallesOpen] = useState(false);
    const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
    const [detallesProveedor, setDetallesProveedor] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Estados para formularios
    const [nuevoProveedor, setNuevoProveedor] = useState({
        nombre: '',
        nombre_contacto: '',
        direccion: '',
        telefono: '',
        email: '',
        ci_nit: '',
        descripcion: '',
        estado: 'activo'
    });
    
    // FILTROS MEJORADOS
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos', 'activo', 'inactivo'
    const [mostrarInactivos, setMostrarInactivos] = useState(false); // Switch para mostrar/ocultar
    const [paginaActual, setPaginaActual] = useState(1);
    const itemsPorPagina = 10;

    // Cargar todos los proveedores (incluyendo inactivos)
    const cargarProveedores = async () => {
        setLoading(true);
        try {
            console.log("🔄 Cargando todos los proveedores...");
            
            // Cargar TODOS los proveedores (activos e inactivos)
            const res = await api.get('/proveedores?incluir_inactivos=true');
            setProveedores(res.data || []);
            
            console.log(`✅ Total proveedores cargados: ${res.data?.length || 0}`);
            
        } catch (error) {
            console.error('Error cargando proveedores:', error);
            notifications.show({ 
                title: 'Error', 
                message: error.response?.data?.message || 'Error al cargar proveedores', 
                color: 'red' 
            });
            
            setProveedores([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarProveedores();
    }, []);

    // Cargar detalles de un proveedor
    const cargarDetallesProveedor = async (id) => {
        try {
            const res = await api.get(`/proveedores/${id}`);
            setDetallesProveedor(res.data);
            setProveedorSeleccionado(id);
            setModalDetallesOpen(true);
        } catch (error) {
            notifications.show({ 
                title: 'Error', 
                message: 'Error al cargar detalles', 
                color: 'red' 
            });
        }
    };

    // Filtrar proveedores según todos los filtros
    const filtrarProveedores = () => {
        let filtrados = [...proveedores];
        
        // 1. Filtrar por estado
        if (filtroEstado !== 'todos') {
            filtrados = filtrados.filter(p => p.estado === filtroEstado);
        }
        
        // 2. Filtrar por búsqueda
        if (busqueda.trim()) {
            const termino = busqueda.toLowerCase();
            filtrados = filtrados.filter(proveedor =>
                proveedor.nombre?.toLowerCase().includes(termino) ||
                (proveedor.nombre_contacto && proveedor.nombre_contacto.toLowerCase().includes(termino)) ||
                (proveedor.ci_nit && proveedor.ci_nit.toLowerCase().includes(termino)) ||
                (proveedor.email && proveedor.email.toLowerCase().includes(termino)) ||
                (proveedor.telefono && proveedor.telefono.includes(termino))
            );
        }
        
        // 3. Ordenar: activos primero, luego por nombre
        filtrados.sort((a, b) => {
            if (a.estado === 'activo' && b.estado !== 'activo') return -1;
            if (a.estado !== 'activo' && b.estado === 'activo') return 1;
            return a.nombre?.localeCompare(b.nombre);
        });
        
        return filtrados;
    };

    const proveedoresFiltrados = filtrarProveedores();

    // Paginación
    const totalPaginas = Math.ceil(proveedoresFiltrados.length / itemsPorPagina);
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    const proveedoresPaginados = proveedoresFiltrados.slice(inicio, fin);

    // Calcular estadísticas
    const calcularEstadisticas = () => {
        const totalActivos = proveedores.filter(p => p.estado === 'activo').length;
        const totalInactivos = proveedores.filter(p => p.estado === 'inactivo').length;
        const totalGeneral = totalActivos + totalInactivos;
        const conProductos = proveedores.filter(p => p.total_productos > 0).length;
        
        return { totalActivos, totalInactivos, totalGeneral, conProductos };
    };

    const estadisticas = calcularEstadisticas();

    // Handlers
    const handleCrearProveedor = async () => {
        try {
            if (isEditing && proveedorSeleccionado) {
                await api.put(`/proveedores/${proveedorSeleccionado}`, nuevoProveedor);
                notifications.show({
                    title: '✅ Proveedor actualizado',
                    message: `${nuevoProveedor.nombre} ha sido actualizado`,
                    color: 'green'
                });
            } else {
                await api.post('/proveedores', nuevoProveedor);
                notifications.show({
                    title: '✅ Proveedor creado',
                    message: `${nuevoProveedor.nombre} ha sido registrado`,
                    color: 'green'
                });
            }

            setModalOpen(false);
            setNuevoProveedor({
                nombre: '', nombre_contacto: '', direccion: '', telefono: '',
                email: '', ci_nit: '', descripcion: '', estado: 'activo'
            });
            setIsEditing(false);
            setProveedorSeleccionado(null);
            cargarProveedores();
            
        } catch (error) {
            notifications.show({
                title: '❌ Error',
                message: error.response?.data?.message || 'Error al guardar proveedor',
                color: 'red'
            });
        }
    };

    const handleDesactivarProveedor = async (id, nombre) => {
        if (!confirm(`¿Estás seguro de desactivar al proveedor "${nombre}"?`)) return;
        
        try {
            await api.put(`/proveedores/${id}/estado`, { estado: 'inactivo' });
            
            notifications.show({
                title: '✅ Proveedor desactivado',
                message: `Proveedor "${nombre}" ha sido desactivado`,
                color: 'orange'
            });
            
            cargarProveedores();
        } catch (error) {
            notifications.show({
                title: '❌ Error',
                message: error.response?.data?.message || 'No se pudo desactivar el proveedor',
                color: 'red'
            });
        }
    };

    const handleActivarProveedor = async (id, nombre) => {
        try {
            await api.put(`/proveedores/${id}/estado`, { estado: 'activo' });
            
            notifications.show({
                title: '✅ Proveedor activado',
                message: `Proveedor "${nombre}" ha sido activado`,
                color: 'green'
            });
            
            cargarProveedores();
        } catch (error) {
            notifications.show({
                title: '❌ Error',
                message: error.response?.data?.message || 'No se pudo activar el proveedor',
                color: 'red'
            });
        }
    };

    const handleEditarProveedor = (proveedor) => {
        setNuevoProveedor({
            nombre: proveedor.nombre,
            nombre_contacto: proveedor.nombre_contacto || '',
            direccion: proveedor.direccion || '',
            telefono: proveedor.telefono || '',
            email: proveedor.email || '',
            ci_nit: proveedor.ci_nit || '',
            descripcion: proveedor.descripcion || '',
            estado: proveedor.estado || 'activo'
        });
        setProveedorSeleccionado(proveedor.id_proveedor);
        setIsEditing(true);
        setModalOpen(true);
    };

    // Renderizar estadísticas
    const renderEstadisticas = () => {
        return (
            <SimpleGrid cols={4} mb="lg">
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Total Proveedores</Text>
                            <Text fw={700} size="xl">{estadisticas.totalGeneral}</Text>
                        </div>
                        <ThemeIcon color="blue" variant="light" size="lg">
                            <IconUsers size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>
                
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Activos</Text>
                            <Text fw={700} size="xl" c="green">{estadisticas.totalActivos}</Text>
                        </div>
                        <ThemeIcon color="green" variant="light" size="lg">
                            <IconCheck size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>
                
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Inactivos</Text>
                            <Text fw={700} size="xl" c="orange">{estadisticas.totalInactivos}</Text>
                        </div>
                        <ThemeIcon color="orange" variant="light" size="lg">
                            <IconX size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>
                
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text size="xs" c="dimmed">Con Productos</Text>
                            <Text fw={700} size="xl" c="cyan">{estadisticas.conProductos}</Text>
                        </div>
                        <ThemeIcon color="cyan" variant="light" size="lg">
                            <IconPackage size={24} />
                        </ThemeIcon>
                    </Group>
                </Paper>
            </SimpleGrid>
        );
    };

    // Renderizar filas de proveedores
    const renderRows = (proveedoresLista) => {
        return proveedoresLista.map(proveedor => (
            <Table.Tr key={proveedor.id_proveedor} style={{ opacity: proveedor.estado === 'inactivo' ? 0.8 : 1 }}>
                <Table.Td>
                    <Stack gap={2}>
                        <Text fw={500}>{proveedor.nombre}</Text>
                        {proveedor.ci_nit && (
                            <Text size="xs" c="dimmed">
                                <IconId size={12} /> {proveedor.ci_nit}
                            </Text>
                        )}
                        {proveedor.direccion && (
                            <Text size="xs" c="dimmed" lineClamp={1}>
                                <IconMapPin size={12} /> {proveedor.direccion}
                            </Text>
                        )}
                    </Stack>
                </Table.Td>
                <Table.Td>
                    <Stack gap={2}>
                        {proveedor.nombre_contacto && (
                            <Text size="sm">
                                <IconUser size={14} /> {proveedor.nombre_contacto}
                            </Text>
                        )}
                        {proveedor.telefono && (
                            <Text size="sm">
                                <IconPhone size={14} /> {proveedor.telefono}
                            </Text>
                        )}
                        {proveedor.email && (
                            <Text size="sm">
                                <IconMail size={14} /> {proveedor.email}
                            </Text>
                        )}
                    </Stack>
                </Table.Td>
                <Table.Td>
                    <Group gap="xs">
                        <Badge color="blue" variant="light">
                            <IconPackage size={12} /> {proveedor.total_productos || 0}
                        </Badge>
                        <Badge color="green" variant="light">
                            <IconShoppingCart size={12} /> {proveedor.total_compras || 0}
                        </Badge>
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Badge 
                        color={proveedor.estado === 'activo' ? 'green' : 'gray'}
                        variant="light"
                        size="sm"
                    >
                        {proveedor.estado === 'activo' ? 'ACTIVO' : 'INACTIVO'}
                    </Badge>
                </Table.Td>
                <Table.Td>
                    <Group gap="xs">
                        <Tooltip label="Ver detalles">
                            <ActionIcon 
                                variant="subtle" 
                                color="blue"
                                onClick={() => cargarDetallesProveedor(proveedor.id_proveedor)}
                            >
                                <IconEye size={16} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Editar">
                            <ActionIcon 
                                variant="subtle" 
                                color="yellow"
                                onClick={() => handleEditarProveedor(proveedor)}
                            >
                                <IconPencil size={16} />
                            </ActionIcon>
                        </Tooltip>
                        
                        {proveedor.estado === 'activo' ? (
                            <Tooltip label="Desactivar">
                                <ActionIcon 
                                    variant="subtle" 
                                    color="orange"
                                    onClick={() => handleDesactivarProveedor(
                                        proveedor.id_proveedor, 
                                        proveedor.nombre
                                    )}
                                >
                                    <IconX size={16} />
                                </ActionIcon>
                            </Tooltip>
                        ) : (
                            <Tooltip label="Activar">
                                <ActionIcon 
                                    variant="subtle" 
                                    color="green"
                                    onClick={() => handleActivarProveedor(
                                        proveedor.id_proveedor, 
                                        proveedor.nombre
                                    )}
                                >
                                    <IconCheck size={16} />
                                </ActionIcon>
                            </Tooltip>
                        )}
                    </Group>
                </Table.Td>
            </Table.Tr>
        ));
    };

    return (
        <Container size="xl" py="xl">
            {/* Header */}
            <Group justify="space-between" align="flex-start" mb="lg">
                <div>
                    <Title order={2}>Gestión de Proveedores</Title>
                    <Text c="dimmed">Administra los proveedores de {user.empresa_nombre}</Text>
                </div>
                <Button 
                    leftSection={<IconPlus size={18} />} 
                    color="blue"
                    onClick={() => {
                        setIsEditing(false);
                        setProveedorSeleccionado(null);
                        setNuevoProveedor({
                            nombre: '', nombre_contacto: '', direccion: '', telefono: '',
                            email: '', ci_nit: '', descripcion: '', estado: 'activo'
                        });
                        setModalOpen(true);
                    }}
                >
                    Nuevo Proveedor
                </Button>
            </Group>

            {renderEstadisticas()}
            
            {/* BARRA DE FILTROS MEJORADA */}
            <Paper p="md" mb="md" radius="md" withBorder>
                <Grid gutter="md">
                    {/* Buscador */}
                    <Grid.Col span={{ base: 12, md: 4 }}>
                        <TextInput 
                            placeholder="Buscar por nombre, CI/NIT, email..."
                            leftSection={<IconSearch size={16} />}
                            value={busqueda}
                            onChange={(e) => {
                                setBusqueda(e.target.value);
                                setPaginaActual(1); // Resetear a primera página al buscar
                            }}
                        />
                    </Grid.Col>
                    
                    {/* Filtro por estado */}
                    <Grid.Col span={{ base: 6, md: 3 }}>
                        <Select 
                            placeholder="Filtrar por estado"
                            data={[
                                { value: 'todos', label: 'Todos los estados' },
                                { value: 'activo', label: 'Solo activos' },
                                { value: 'inactivo', label: 'Solo inactivos' }
                            ]}
                            value={filtroEstado}
                            onChange={(val) => {
                                setFiltroEstado(val);
                                setPaginaActual(1);
                            }}
                            clearable
                        />
                    </Grid.Col>
                    
                    {/* Switch para mostrar/ocultar inactivos */}
                    <Grid.Col span={{ base: 6, md: 3 }}>
                        <Group justify="center">
                            <Switch
                                label="Mostrar inactivos"
                                checked={mostrarInactivos}
                                onChange={(event) => {
                                    setMostrarInactivos(event.currentTarget.checked);
                                    // Si activamos mostrar inactivos y el filtro está en "solo activos", cambiar a "todos"
                                    if (event.currentTarget.checked && filtroEstado === 'activo') {
                                        setFiltroEstado('todos');
                                    }
                                }}
                                size="sm"
                                color="orange"
                                thumbIcon={
                                    mostrarInactivos ? 
                                    <IconEye size={12} /> : 
                                    <IconEyeOff size={12} />
                                }
                            />
                        </Group>
                    </Grid.Col>
                    
                    {/* Botones de acción */}
                    <Grid.Col span={{ base: 12, md: 2 }}>
                        <Group justify="flex-end">
                            <ActionIcon 
                                variant="light" 
                                color="red" 
                                onClick={() => {
                                    setBusqueda('');
                                    setFiltroEstado('todos');
                                    setMostrarInactivos(false);
                                    setPaginaActual(1);
                                }}
                                title="Limpiar todos los filtros"
                            >
                                <IconFilter size={16} />
                            </ActionIcon>
                            <Button 
                                variant="light" 
                                leftSection={<IconRefresh size={16} />}
                                onClick={cargarProveedores}
                                loading={loading}
                            >
                                Actualizar
                            </Button>
                        </Group>
                    </Grid.Col>
                </Grid>
                
                {/* Indicadores de filtros activos */}
                {(busqueda || filtroEstado !== 'todos' || mostrarInactivos) && (
                    <Paper p="xs" mt="md" bg="blue.0" radius="sm">
                        <Group gap="xs">
                            <Text size="xs" fw={500}>Filtros activos:</Text>
                            {busqueda && (
                                <Badge size="xs" color="blue" variant="outline">
                                    Buscando: "{busqueda}"
                                </Badge>
                            )}
                            {filtroEstado !== 'todos' && (
                                <Badge size="xs" color={filtroEstado === 'activo' ? 'green' : 'gray'} variant="outline">
                                    Estado: {filtroEstado === 'activo' ? 'Activos' : 'Inactivos'}
                                </Badge>
                            )}
                            {mostrarInactivos && (
                                <Badge size="xs" color="orange" variant="outline">
                                    Mostrando inactivos
                                </Badge>
                            )}
                            <Button 
                                size="xs" 
                                variant="subtle" 
                                color="red"
                                onClick={() => {
                                    setBusqueda('');
                                    setFiltroEstado('todos');
                                    setMostrarInactivos(false);
                                }}
                            >
                                Limpiar filtros
                            </Button>
                        </Group>
                    </Paper>
                )}
            </Paper>

            {/* Tabla de proveedores */}
            <Card shadow="sm" padding={0} radius="md" withBorder>
                {loading ? (
                    <Center py={40}>
                        <Loader />
                    </Center>
                ) : (
                    <>
                        <ScrollArea>
                            <Table verticalSpacing="md" highlightOnHover>
                                <Table.Thead bg="gray.1">
                                    <Table.Tr>
                                        <Table.Th>Proveedor</Table.Th>
                                        <Table.Th>Contacto</Table.Th>
                                        <Table.Th>Productos/Compras</Table.Th>
                                        <Table.Th>Estado</Table.Th>
                                        <Table.Th>Acciones</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {proveedoresPaginados.length > 0 ? (
                                        renderRows(proveedoresPaginados)
                                    ) : (
                                        <Table.Tr>
                                            <Table.Td colSpan={5}>
                                                <Center py={40}>
                                                    <Stack align="center" gap="xs">
                                                        <IconBuildingStore size={48} color="gray" />
                                                        <Text c="dimmed">No se encontraron proveedores</Text>
                                                        <Text size="sm" c="dimmed">
                                                            {busqueda ? 
                                                                `No hay resultados para "${busqueda}"` : 
                                                                'No hay proveedores registrados'
                                                            }
                                                        </Text>
                                                        <Button 
                                                            variant="light" 
                                                            size="sm"
                                                            onClick={() => setModalOpen(true)}
                                                        >
                                                            Registrar primer proveedor
                                                        </Button>
                                                    </Stack>
                                                </Center>
                                            </Table.Td>
                                        </Table.Tr>
                                    )}
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
                    </>
                )}
            </Card>

            {/* Contador de resultados */}
            {!loading && proveedoresPaginados.length > 0 && (
                <Text size="sm" c="dimmed" mt="md" ta="right">
                    Mostrando {proveedoresPaginados.length} de {proveedoresFiltrados.length} proveedores
                    {filtroEstado !== 'todos' && ` (Estado: ${filtroEstado === 'activo' ? 'Activos' : 'Inactivos'})`}
                </Text>
            )}

            {/* Modal para crear/editar proveedor */}
            <Modal 
                opened={modalOpen} 
                onClose={() => setModalOpen(false)}
                title={isEditing ? "Editar Proveedor" : "Crear Nuevo Proveedor"}
                size="lg"
            >
                <form onSubmit={(e) => { e.preventDefault(); handleCrearProveedor(); }}>
                    <Stack gap="md">
                        <Grid gutter="md">
                            <Grid.Col span={6}>
                                <TextInput 
                                    label="Nombre del proveedor"
                                    placeholder="Ej: Distribuidora XYZ"
                                    required
                                    value={nuevoProveedor.nombre}
                                    onChange={(e) => setNuevoProveedor({...nuevoProveedor, nombre: e.target.value})}
                                />
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <TextInput 
                                    label="Nombre de contacto"
                                    placeholder="Ej: Juan Pérez"
                                    value={nuevoProveedor.nombre_contacto}
                                    onChange={(e) => setNuevoProveedor({...nuevoProveedor, nombre_contacto: e.target.value})}
                                />
                            </Grid.Col>
                        </Grid>
                        
                        <Grid gutter="md">
                            <Grid.Col span={6}>
                                <TextInput 
                                    label="CI/NIT"
                                    placeholder="12345678"
                                    value={nuevoProveedor.ci_nit}
                                    onChange={(e) => setNuevoProveedor({...nuevoProveedor, ci_nit: e.target.value})}
                                />
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <TextInput 
                                    label="Teléfono"
                                    placeholder="+591 70000000"
                                    value={nuevoProveedor.telefono}
                                    onChange={(e) => setNuevoProveedor({...nuevoProveedor, telefono: e.target.value})}
                                />
                            </Grid.Col>
                        </Grid>
                        
                        <TextInput 
                            label="Email"
                            placeholder="proveedor@email.com"
                            type="email"
                            value={nuevoProveedor.email}
                            onChange={(e) => setNuevoProveedor({...nuevoProveedor, email: e.target.value})}
                        />
                        
                        <Textarea 
                            label="Dirección"
                            placeholder="Dirección completa del proveedor"
                            rows={2}
                            value={nuevoProveedor.direccion}
                            onChange={(e) => setNuevoProveedor({...nuevoProveedor, direccion: e.target.value})}
                        />
                        
                        <Textarea 
                            label="Descripción (opcional)"
                            placeholder="Información adicional sobre el proveedor..."
                            rows={3}
                            value={nuevoProveedor.descripcion}
                            onChange={(e) => setNuevoProveedor({...nuevoProveedor, descripcion: e.target.value})}
                        />
                        
                        {isEditing && (
                            <Select 
                                label="Estado"
                                data={[
                                    { value: 'activo', label: 'Activo' },
                                    { value: 'inactivo', label: 'Inactivo' }
                                ]}
                                value={nuevoProveedor.estado}
                                onChange={(val) => setNuevoProveedor({...nuevoProveedor, estado: val})}
                            />
                        )}
                        
                        <Group justify="flex-end" mt="md">
                            <Button variant="default" onClick={() => setModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button 
                                type="submit"
                                color="blue"
                            >
                                {isEditing ? 'Actualizar Proveedor' : 'Guardar Proveedor'}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            {/* Modal para ver detalles */}
            <Modal 
                opened={modalDetallesOpen} 
                onClose={() => setModalDetallesOpen(false)}
                title="Detalles del Proveedor"
                size="lg"
            >
                {detallesProveedor && (
                    <Stack gap="md">
                        {/* Información principal */}
                        <Paper withBorder p="md" radius="md">
                            <Group justify="space-between">
                                <div>
                                    <Title order={3}>{detallesProveedor.proveedor.nombre}</Title>
                                    <Text c="dimmed">
                                        {detallesProveedor.proveedor.ci_nit && `CI/NIT: ${detallesProveedor.proveedor.ci_nit}`}
                                    </Text>
                                </div>
                                <Badge 
                                    color={detallesProveedor.proveedor.estado === 'activo' ? 'green' : 'gray'}
                                    size="lg"
                                >
                                    {detallesProveedor.proveedor.estado.toUpperCase()}
                                </Badge>
                            </Group>
                        </Paper>
                        
                        {/* Información de contacto */}
                        <Paper withBorder p="md" radius="md">
                            <Title order={4} mb="sm">Información de Contacto</Title>
                            <Stack gap="sm">
                                {detallesProveedor.proveedor.nombre_contacto && (
                                    <Group>
                                        <IconUser size={16} color="gray" />
                                        <Text>{detallesProveedor.proveedor.nombre_contacto}</Text>
                                    </Group>
                                )}
                                {detallesProveedor.proveedor.telefono && (
                                    <Group>
                                        <IconPhone size={16} color="gray" />
                                        <Text>{detallesProveedor.proveedor.telefono}</Text>
                                    </Group>
                                )}
                                {detallesProveedor.proveedor.email && (
                                    <Group>
                                        <IconMail size={16} color="gray" />
                                        <Text>{detallesProveedor.proveedor.email}</Text>
                                    </Group>
                                )}
                                {detallesProveedor.proveedor.direccion && (
                                    <Group align="flex-start">
                                        <IconMapPin size={16} color="gray" style={{ marginTop: 2 }} />
                                        <Text>{detallesProveedor.proveedor.direccion}</Text>
                                    </Group>
                                )}
                                {detallesProveedor.proveedor.descripcion && (
                                    <Group align="flex-start">
                                        <IconInfoCircle size={16} color="gray" style={{ marginTop: 2 }} />
                                        <Text>{detallesProveedor.proveedor.descripcion}</Text>
                                    </Group>
                                )}
                            </Stack>
                        </Paper>
                        
                        {/* Estadísticas */}
                        <Paper withBorder p="md" radius="md">
                            <Title order={4} mb="sm">Estadísticas</Title>
                            <SimpleGrid cols={3}>
                                <Stack align="center" gap={2}>
                                    <ThemeIcon color="blue" size="lg" radius="xl">
                                        <IconPackage size={20} />
                                    </ThemeIcon>
                                    <Text fw={700} size="xl">
                                        {detallesProveedor.estadisticas.total_productos}
                                    </Text>
                                    <Text size="xs" c="dimmed">Productos</Text>
                                </Stack>
                                
                                <Stack align="center" gap={2}>
                                    <ThemeIcon color="green" size="lg" radius="xl">
                                        <IconShoppingCart size={20} />
                                    </ThemeIcon>
                                    <Text fw={700} size="xl">
                                        {detallesProveedor.estadisticas.total_compras}
                                    </Text>
                                    <Text size="xs" c="dimmed">Compras</Text>
                                </Stack>
                                
                                <Stack align="center" gap={2}>
                                    <ThemeIcon color="cyan" size="lg" radius="xl">
                                        <IconBuildingStore size={20} />
                                    </ThemeIcon>
                                    <Text fw={700} size="xl">
                                        Bs {detallesProveedor.estadisticas.valor_total_compras.toFixed(2)}
                                    </Text>
                                    <Text size="xs" c="dimmed">Valor Total</Text>
                                </Stack>
                            </SimpleGrid>
                        </Paper>
                        
                        {/* Productos del proveedor */}
                        {detallesProveedor.productos.length > 0 && (
                            <Paper withBorder p="md" radius="md">
                                <Title order={4} mb="sm">Productos ({detallesProveedor.productos.length})</Title>
                                <ScrollArea h={200}>
                                    <Stack gap="xs">
                                        {detallesProveedor.productos.map(producto => (
                                            <Group key={producto.id_producto} justify="space-between" p="xs" bg="gray.0">
                                                <Text size="sm">{producto.nombre}</Text>
                                                <Badge color={producto.stock_actual > 0 ? 'green' : 'red'}>
                                                    Stock: {producto.stock_actual}
                                                </Badge>
                                            </Group>
                                        ))}
                                    </Stack>
                                </ScrollArea>
                            </Paper>
                        )}
                        
                        <Group justify="flex-end" mt="md">
                            <Button 
                                variant="light" 
                                onClick={() => {
                                    setModalDetallesOpen(false);
                                    handleEditarProveedor(detallesProveedor.proveedor);
                                }}
                                leftSection={<IconPencil size={16} />}
                            >
                                Editar Proveedor
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>
        </Container>
    );
};

export default GestionProveedores;