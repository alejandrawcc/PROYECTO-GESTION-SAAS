import { 
    Container, Title, Text, Card, Table, Button, Group, Badge, Modal,
    TextInput, Select, Stack, ActionIcon, Tooltip, Center, Loader,
    Paper, Avatar, Switch, ScrollArea
} from '@mantine/core';
import { 
    IconPlus, IconSearch, IconFilterOff, 
    IconBuildingStore, IconPencil, IconMail, IconUser, IconAlertCircle
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { getCurrentUser } from '../services/auth';
import api, { usuarioService } from '../services/api'; 
import { useNavigate } from 'react-router-dom'; // Opcional, si quieres redirigir

const Usuarios = () => {
    // --- 1. ESTADOS Y HOOKS ---
    const user = getCurrentUser();
    const isSuperAdmin = user?.rol === 'super_admin';
    const navigate = useNavigate(); // Útil si quieres redirigir al módulo de clientes

    const [usuarios, setUsuarios] = useState([]);
    const [empresas, setEmpresas] = useState([]); 
    const [loading, setLoading] = useState(true);
    
    // Estados para el Modal (Solo para Usuarios del Sistema)
    const [modalOpen, setModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false); 

    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroRol, setFiltroRol] = useState(null);
    const [filtroEstado, setFiltroEstado] = useState(null);
    const [filtroEmpresa, setFiltroEmpresa] = useState(null);

    // Estado del Formulario (Solo Usuarios)
    const [currentUsuario, setCurrentUsuario] = useState({
        id_usuario: null,
        nombre: '', apellido: '', email: '', password: '', rol_id: '',
        nombre_empresa: '' 
    });

    // --- 2. CARGA DE DATOS ---
    useEffect(() => {
        const cargarDatos = async () => {
            setLoading(true);
            try {
                // Cargar Lista Unificada (Usuarios + Clientes)
                const response = await usuarioService.getAll();
                setUsuarios(Array.isArray(response.data) ? response.data : []);

                // Cargar Empresas (Solo si es Super Admin para el filtro)
                if (isSuperAdmin) {
                    try {
                        const resEmpresas = await api.get('/usuarios/lista-empresas');
                        const lista = resEmpresas.data.map(e => ({
                            value: String(e.id_microempresa),
                            label: e.nombre
                        }));
                        setEmpresas(lista);
                    } catch (errEmpresa) {
                        console.warn("No se pudo cargar la lista de empresas:", errEmpresa);
                    }
                }
            } catch (error) {
                console.error("Error general:", error);
                notifications.show({ title: 'Error', message: 'No se pudieron cargar los datos', color: 'red' });
            } finally {
                setLoading(false);
            }
        };
        cargarDatos();
    }, [isSuperAdmin]);

    // --- 3. LÓGICA DE FILTRADO ---
    const usuariosFiltrados = usuarios.filter((u) => {
        const term = busqueda.toLowerCase();
        const rolUsuario = (u.tipo_rol || u.rol || '').toLowerCase();
        
        // Búsqueda general en texto
        const matchTexto = 
            (u.nombre || '').toLowerCase().includes(term) || 
            (u.apellido || '').toLowerCase().includes(term) ||
            (u.email || '').toLowerCase().includes(term) ||
            (u.empresa_nombre || '').toLowerCase().includes(term); 

        // Filtros específicos
        const matchRol = filtroRol ? rolUsuario === filtroRol.toLowerCase() : true;
        const matchEstado = filtroEstado ? u.estado === filtroEstado : true;
        const idEmpresaUsuario = String(u.microempresa_id || u.id_microempresa || '');
        const matchEmpresa = filtroEmpresa ? idEmpresaUsuario === filtroEmpresa : true;

        return matchTexto && matchRol && matchEstado && matchEmpresa;
    });

    // --- 4. ACCIONES ---
    
    // Crear Usuario (Abre Modal)
    const handleCreateClick = () => {
        setIsEditing(false);
        setCurrentUsuario({
            id_usuario: null, nombre: '', apellido: '', email: '', password: '', rol_id: '', nombre_empresa: '' 
        });
        setModalOpen(true);
    };

    // Editar Usuario (Detecta si es Cliente o Usuario)
    const handleEditClick = (usuario) => {
        // DETECCIÓN DE CLIENTE
        // Si el ID empieza con 'cli-' (según el backend nuevo) o el rol es 'cliente'
        const esCliente = String(usuario.id_usuario).startsWith('cli-') || usuario.tipo_rol === 'cliente';

        if (esCliente) {
            notifications.show({
                title: 'Gestión de Clientes',
                message: 'Para editar los datos de este cliente (NIT, Razón Social, etc.), por favor ve al módulo de "Clientes".',
                color: 'grape',
                icon: <IconAlertCircle size={18} />,
                autoClose: 5000
            });
            // Opcional: navigate('/clientes');
            return;
        }

        // Si es usuario normal, abrimos el modal
        setIsEditing(true);
        setCurrentUsuario({
            id_usuario: usuario.id_usuario,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email,
            password: '', 
            rol_id: usuario.rol_id ? String(usuario.rol_id) : '3',
            nombre_empresa: usuario.empresa_nombre || '' 
        });
        setModalOpen(true);
    };

    // Cambiar Estado
    const handleToggleEstado = async (id, estadoActual, rol) => {
        // Bloqueo para clientes si la API de usuarios no soporta clientes
        if (String(id).startsWith('cli-') || rol === 'cliente') {
             notifications.show({ title: 'Aviso', message: 'Cambia el estado del cliente desde su módulo.', color: 'yellow' });
             return;
        }

        const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
        // Actualización optimista en UI
        setUsuarios(prev => prev.map(u => u.id_usuario === id ? { ...u, estado: nuevoEstado } : u));

        try {
            await usuarioService.updateEstado(id, nuevoEstado);
            notifications.show({ title: 'Estado actualizado', message: `Usuario ${nuevoEstado}`, color: 'green', autoClose: 1500 });
        } catch (error) {
            // Revertir si falla
            setUsuarios(prev => prev.map(u => u.id_usuario === id ? { ...u, estado: estadoActual } : u));
            notifications.show({ title: 'Error', message: 'No se pudo cambiar el estado', color: 'red' });
        }
    };

    // Enviar Formulario (Crear/Editar Usuario Sistema)
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await usuarioService.update(currentUsuario.id_usuario, currentUsuario);
                notifications.show({ title: 'Actualizado', message: 'Datos actualizados correctamente', color: 'blue' });
            } else {
                await usuarioService.create(currentUsuario);
                notifications.show({ title: 'Creado', message: 'Usuario registrado correctamente', color: 'green' });
            }
            setModalOpen(false);
            // Recargar datos
            const res = await usuarioService.getAll();
            setUsuarios(res.data);
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || 'Error al guardar',
                color: 'red'
            });
        }
    };

    // --- 5. RENDERIZADO ---
    if (loading) return <Center h="50vh"><Loader size="lg" variant="bars" /></Center>;

    return (
        <Container size="xl" py="xl">
            {/* CABECERA */}
            <Group justify="space-between" mb="lg">
                <div>
                    <Title order={2}>Gestión de Usuarios</Title>
                    <Text c="dimmed">Administración Global del Sistema</Text>
                </div>
                <Button leftSection={<IconPlus size={18} />} onClick={handleCreateClick} color="blue">
                    Nuevo Usuario
                </Button>
            </Group>

            {/* --- BARRA DE FILTROS --- */}
            <Paper p="sm" mb="md" radius="md" bg="white" withBorder>
                <Group gap="sm">
                    {/* BUSCADOR (Flexible) */}
                    <TextInput 
                        placeholder="Buscar por nombre, email, empresa..."
                        leftSection={<IconSearch size={16} />}
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.currentTarget.value)}
                        style={{ flex: 1 }} 
                    />
                    
                    {/* FILTRO EMPRESA (Solo Super Admin) */}
                    {isSuperAdmin && (
                        <Select 
                            placeholder="Filtrar por Empresa"
                            data={empresas}
                            value={filtroEmpresa}
                            onChange={setFiltroEmpresa}
                            clearable
                            searchable
                            w={200}
                            leftSection={<IconBuildingStore size={16} />}
                        />
                    )}

                    {/* FILTRO ROL (Incluye Cliente) */}
                    <Select 
                        placeholder="Rol"
                        data={[
                            { value: 'administrador', label: 'Administrador' },
                            { value: 'vendedor', label: 'Vendedor' },
                            { value: 'cliente', label: 'Cliente' }, 
                            { value: 'super_admin', label: 'Super Admin' }
                        ]}
                        clearable 
                        value={filtroRol} 
                        onChange={setFiltroRol} 
                        w={150} 
                    />

                    {/* FILTRO ESTADO */}
                    <Select 
                        placeholder="Estado"
                        data={[
                            { value: 'activo', label: 'Activo' }, 
                            { value: 'inactivo', label: 'Inactivo' }
                        ]}
                        clearable 
                        value={filtroEstado} 
                        onChange={setFiltroEstado} 
                        w={120} 
                    />
                    
                    {/* BOTÓN LIMPIAR */}
                    <Tooltip label="Limpiar filtros">
                        <ActionIcon 
                            variant="light" 
                            color="red" 
                            size="lg" 
                            radius="md"
                            disabled={!busqueda && !filtroRol && !filtroEstado && !filtroEmpresa}
                            onClick={() => { 
                                setBusqueda(''); 
                                setFiltroRol(null); 
                                setFiltroEstado(null); 
                                setFiltroEmpresa(null); 
                            }}
                        >
                            <IconFilterOff size={18} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Paper>

            {/* TABLA DE RESULTADOS */}
            <Card shadow="sm" padding="0" radius="md" withBorder>
                <ScrollArea>
                    <Table verticalSpacing="sm" highlightOnHover>
                        <Table.Thead bg="gray.1">
                            <Table.Tr>
                                <Table.Th>Usuario / Cliente</Table.Th>
                                <Table.Th>Contacto</Table.Th>
                                <Table.Th>Rol</Table.Th>
                                <Table.Th>Empresa</Table.Th>
                                <Table.Th>Estado</Table.Th>
                                <Table.Th>Registro</Table.Th>
                                <Table.Th>Acciones</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {usuariosFiltrados.length > 0 ? (
                                usuariosFiltrados.map((u) => {
                                    const rolNormalizado = (u.tipo_rol || u.rol || 'vendedor').toLowerCase();
                                    const esCliente = rolNormalizado === 'cliente' || String(u.id_usuario).startsWith('cli-');

                                    return (
                                        <Table.Tr key={u.id_usuario}>
                                            <Table.Td>
                                                <Group gap="sm">
                                                    <Avatar color={esCliente ? 'grape' : 'blue'} radius="xl">
                                                        {u.nombre ? u.nombre.charAt(0).toUpperCase() : <IconUser size={16}/>}
                                                    </Avatar>
                                                    <div>
                                                        <Text size="sm" fw={500}>{u.nombre} {u.apellido}</Text>
                                                        <Text size="xs" c="dimmed">
                                                            {esCliente ? 'Cliente Externo' : `ID: ${u.id_usuario}`}
                                                        </Text>
                                                    </div>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap="xs">
                                                    <IconMail size={14} color="gray" />
                                                    <Text size="sm" style={{maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                                        {u.email || 'Sin email'}
                                                    </Text>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge 
                                                    variant="light" 
                                                    color={
                                                        rolNormalizado === 'super_admin' ? 'red' : 
                                                        rolNormalizado === 'administrador' ? 'blue' : 
                                                        rolNormalizado === 'cliente' ? 'grape' : // MORADO PARA CLIENTE
                                                        'teal'
                                                    }
                                                >
                                                    {rolNormalizado.toUpperCase().replace('_', ' ')}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap={5}>
                                                    <IconBuildingStore size={14} color="gray" />
                                                    <Text size="sm" fw={500}>{u.empresa_nombre || '---'}</Text>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge variant="dot" color={u.estado === 'activo' ? 'green' : 'gray'}>
                                                    {u.estado?.toUpperCase()}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" c="dimmed">
                                                    {u.fecha_creacion ? new Date(u.fecha_creacion).toLocaleDateString() : '-'}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap="sm">
                                                    {/* Switch de Estado */}
                                                    <Switch 
                                                        size="md" 
                                                        onLabel="ON" offLabel="OFF"
                                                        checked={u.estado === 'activo'}
                                                        onChange={() => handleToggleEstado(u.id_usuario, u.estado, rolNormalizado)}
                                                        disabled={esCliente} // Deshabilitamos si es cliente para evitar errores
                                                    />
                                                    
                                                    {/* Botón Editar */}
                                                    <ActionIcon variant="subtle" color="blue" onClick={() => handleEditClick(u)}>
                                                        <IconPencil size={18} />
                                                    </ActionIcon>
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })
                            ) : (
                                <Table.Tr>
                                    <Table.Td colSpan={7}>
                                        <Center py="xl">
                                            <Stack align="center" gap="xs">
                                                <IconSearch size={40} color="gray" opacity={0.5} />
                                                <Text c="dimmed">No se encontraron resultados.</Text>
                                            </Stack>
                                        </Center>
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            </Card>

            {/* MODAL (Crear/Editar Usuarios) */}
            <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={isEditing ? "Editar Usuario" : "Crear Usuario"} centered size="lg">
                <form onSubmit={handleSubmit}>
                    <Stack>
                        <Group grow>
                            <TextInput label="Nombre" required value={currentUsuario.nombre} onChange={(e) => setCurrentUsuario({...currentUsuario, nombre: e.target.value})} />
                            <TextInput label="Apellido" required value={currentUsuario.apellido} onChange={(e) => setCurrentUsuario({...currentUsuario, apellido: e.target.value})} />
                        </Group>
                        <TextInput label="Email" type="email" required value={currentUsuario.email} onChange={(e) => setCurrentUsuario({...currentUsuario, email: e.target.value})} />
                        
                        {isSuperAdmin && isEditing && (
                            <Paper withBorder p="xs" bg="gray.0">
                                <TextInput label="Nombre Empresa (Global)" value={currentUsuario.nombre_empresa} onChange={(e) => setCurrentUsuario({...currentUsuario, nombre_empresa: e.target.value})} />
                            </Paper>
                        )}

                        <Group grow>
                            <TextInput label="Contraseña" type="password" required={!isEditing} value={currentUsuario.password} onChange={(e) => setCurrentUsuario({...currentUsuario, password: e.target.value})} />
                            
                            {/* SELECTOR DE ROL */}
                            <Select 
                                label="Rol" 
                                required
                                data={[
                                    { value: '3', label: 'Vendedor' },
                                    { value: '2', label: 'Administrador' },
                                    // Nota: Si permites crear clientes desde aquí, asegúrate que tu backend lo soporte. 
                                    // Si no, quita esta opción y deja que los clientes se creen solo en "Cartera de Clientes".
                                    { value: '4', label: 'Cliente (Usuario)' } 
                                ]} 
                                value={currentUsuario.rol_id} 
                                onChange={(val) => setCurrentUsuario({...currentUsuario, rol_id: val})} 
                            />
                        </Group>
                        <Group justify="flex-end" mt="md">
                            <Button variant="default" onClick={() => setModalOpen(false)}>Cancelar</Button>
                            <Button type="submit">{isEditing ? "Guardar" : "Registrar"}</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Container>
    );
};

export default Usuarios;