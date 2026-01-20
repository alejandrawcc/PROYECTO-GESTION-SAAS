import { 
    Container, Title, Text, Card, Group, Button, Badge, 
    SimpleGrid, NumberInput, TextInput, Modal, Stack, Table,
    ScrollArea, LoadingOverlay, Divider, Center, Loader,
    Alert, Select
} from '@mantine/core';
import { IconCheck, IconUsers, IconBox, IconLock, IconCreditCard, IconArrowsExchange } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { getCurrentUser } from '../services/auth';
import api from '../services/api';

const Suscripcion = () => {
    const user = getCurrentUser();
    const isSuperAdmin = user?.rol === 'super_admin';

    const [planes, setPlanes] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Estados Admin
    const [modalEditar, setModalEditar] = useState(false);
    const [modalEmpresas, setModalEmpresas] = useState(false);
    const [planSeleccionado, setPlanSeleccionado] = useState(null); // Plan que estamos editando/viendo
    const [listaEmpresas, setListaEmpresas] = useState([]);
    const [loadingEmpresas, setLoadingEmpresas] = useState(false);

    // Estado para CAMBIAR DE PLAN A UNA EMPRESA (Admin)
    const [modalMover, setModalMover] = useState(false);
    const [empresaAMover, setEmpresaAMover] = useState(null); // { id, nombre }
    const [nuevoPlanId, setNuevoPlanId] = useState(null);

    // Estados Pasarela (Usuario)
    const [modalPago, setModalPago] = useState(false);
    const [planAPagar, setPlanAPagar] = useState(null);
    const [procesandoPago, setProcesandoPago] = useState(false);
    const [datosTarjeta, setDatosTarjeta] = useState({ numero: '', exp: '', cvv: '', titular: '' });

    useEffect(() => {
        fetchPlanes();
    }, []);

    const fetchPlanes = async () => {
        try {
            const res = await api.get('/planes');
            setPlanes(res.data);
        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: 'Error cargando planes', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    // --- FUNCIONES ADMIN ---
    const handleEditClick = (plan) => {
        setPlanSeleccionado({ ...plan });
        setModalEditar(true);
    };

    const handleVerEmpresas = async (plan) => {
        setPlanSeleccionado(plan);
        setModalEmpresas(true);
        setLoadingEmpresas(true);
        try {
            const res = await api.get(`/planes/${plan.id_plan}/empresas`);
            setListaEmpresas(res.data);
        } catch (error) {
            notifications.show({ title: 'Error', message: 'No se pudieron cargar empresas', color: 'red' });
        } finally {
            setLoadingEmpresas(false);
        }
    };

    const guardarCambiosPlan = async () => {
        try {
            await api.put(`/planes/${planSeleccionado.id_plan}`, planSeleccionado);
            notifications.show({ title: 'Éxito', message: 'Plan actualizado', color: 'green' });
            setModalEditar(false);
            fetchPlanes();
        } catch (error) {
            notifications.show({ title: 'Error', message: 'No se pudo actualizar', color: 'red' });
        }
    };

    // Lógica para abrir modal de mover empresa
    const abrirModalMover = (empresa) => {
        setEmpresaAMover(empresa);
        setNuevoPlanId(null); // Reset
        setModalMover(true);
    };

    const ejecutarCambioPlan = async () => {
        if (!nuevoPlanId) return;
        try {
            await api.post('/planes/asignar', {
                id_microempresa: empresaAMover.id_microempresa,
                id_plan: nuevoPlanId
            });
            
            notifications.show({ title: 'Cambio realizado', message: `Empresa movida correctamente`, color: 'green' });
            setModalMover(false);
            
            // Recargamos la lista de empresas del plan actual para ver que desaparezca (o se quede si es el mismo)
            if (planSeleccionado) {
                handleVerEmpresas(planSeleccionado);
            }
            fetchPlanes(); // Actualizar contadores
        } catch (error) {
            notifications.show({ title: 'Error', message: 'No se pudo cambiar el plan', color: 'red' });
        }
    };

    // --- FUNCIONES USUARIO (PAGO) ---
    const handleSeleccionarPlan = (plan) => {
        setPlanAPagar(plan);
        setModalPago(true);
    };

    const procesarPagoSimulado = async (e) => {
        e.preventDefault();
        setProcesandoPago(true);
        setTimeout(async () => {
            try {
                await api.post('/suscripciones/cambiar', {
                    nuevo_plan_id: planAPagar.id_plan,
                    metodo_pago: 'tarjeta_simulada'
                });
                notifications.show({ title: '¡Pago Exitoso!', message: `Bienvenido al plan ${planAPagar.nombre_plan}`, color: 'green', autoClose: 5000 });
                setModalPago(false);
                setDatosTarjeta({ numero: '', exp: '', cvv: '', titular: '' });
                fetchPlanes(); 
            } catch (error) {
                notifications.show({ title: 'Pago Rechazado', message: 'Error en la transacción', color: 'red' });
            } finally {
                setProcesandoPago(false);
            }
        }, 2000);
    };

    if (loading) return <Center h="50vh"><Loader /></Center>;

    return (
        <Container size="xl" py="xl">
            <Stack mb="xl">
                <Title order={2}>{isSuperAdmin ? 'Administración de Planes' : 'Planes y Suscripción'}</Title>
                <Text c="dimmed">{isSuperAdmin ? 'Gestiona la oferta comercial y suscripciones.' : 'Elige el plan ideal para tu negocio.'}</Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                {planes.map((plan) => (
                    <Card key={plan.id_plan} shadow="sm" padding="lg" radius="md" withBorder style={{ display: 'flex', flexDirection: 'column' }}>
                        <Group justify="space-between" mb="xs">
                            <Badge color={plan.nombre_plan.includes('Premium') ? 'grape' : plan.nombre_plan.includes('Basico') ? 'blue' : 'gray'} variant="light" size="lg">
                                {plan.nombre_plan}
                            </Badge>
                        </Group>
                        <Title order={3} mb="md">${plan.precio} <Text span size="sm" c="dimmed" fw={400}>/ mes</Text></Title>
                        <Stack gap="xs" mb="lg" style={{ flex: 1 }}>
                            <Group><IconUsers size={18} color="gray" /><Text size="sm">{plan.limite_usuarios || 'Ilimitados'} Usuarios</Text></Group>
                            <Group><IconBox size={18} color="gray" /><Text size="sm">{plan.limite_productos || 'Ilimitados'} Productos</Text></Group>
                            <Group><IconCheck size={18} color="teal" /><Text size="sm">Soporte 24/7</Text></Group>
                        </Stack>
                        
                        {isSuperAdmin ? (
                            <Stack gap="sm">
                                <Button variant="light" color="blue" fullWidth onClick={() => handleEditClick(plan)}>Editar Plan</Button>
                                <Button variant="outline" color="dark" fullWidth onClick={() => handleVerEmpresas(plan)}>
                                    Ver Clientes ({plan.total_empresas})
                                </Button>
                            </Stack>
                        ) : (
                            <Button 
                                variant={plan.nombre_plan.includes('Premium') ? 'gradient' : 'outline'} 
                                gradient={{ from: 'blue', to: 'cyan' }}
                                fullWidth radius="md" onClick={() => handleSeleccionarPlan(plan)}
                            >
                                {plan.precio === "0.00" ? 'Plan Gratuito' : 'Suscribirse Ahora'}
                            </Button>
                        )}
                    </Card>
                ))}
            </SimpleGrid>

            {/* --- MODALES --- */}

            {/* 1. Modal Editar Plan (Admin) */}
            {isSuperAdmin && planSeleccionado && (
                <Modal opened={modalEditar} onClose={() => setModalEditar(false)} title="Editar Plan">
                     <Stack>
                        <TextInput label="Nombre" value={planSeleccionado.nombre_plan} onChange={(e) => setPlanSeleccionado({...planSeleccionado, nombre_plan: e.target.value})} />
                        <NumberInput label="Precio" value={planSeleccionado.precio} onChange={(val) => setPlanSeleccionado({...planSeleccionado, precio: val})} />
                        <Group grow>
                            <NumberInput label="Límite Usuarios" value={planSeleccionado.limite_usuarios} onChange={(val) => setPlanSeleccionado({...planSeleccionado, limite_usuarios: val})} />
                            <NumberInput label="Límite Productos" value={planSeleccionado.limite_productos} onChange={(val) => setPlanSeleccionado({...planSeleccionado, limite_productos: val})} />
                        </Group>
                        <Button mt="md" onClick={guardarCambiosPlan}>Guardar</Button>
                    </Stack>
                </Modal>
            )}

            {/* 2. Modal Ver Empresas (Admin) */}
            <Modal opened={modalEmpresas} onClose={() => setModalEmpresas(false)} title={`Empresas en: ${planSeleccionado?.nombre_plan}`} size="lg">
                 <ScrollArea h={300}>
                    {loadingEmpresas ? <Center py="xl"><Loader /></Center> : (
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr><Table.Th>Empresa</Table.Th><Table.Th>Email</Table.Th><Table.Th>Acción</Table.Th></Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {listaEmpresas.length > 0 ? (
                                    listaEmpresas.map(e => (
                                        <Table.Tr key={e.id_microempresa}>
                                            <Table.Td fw={500}>{e.nombre}</Table.Td>
                                            <Table.Td c="dimmed">{e.email || 'Sin email'}</Table.Td>
                                            <Table.Td>
                                                <Button 
                                                    size="xs" variant="light" color="orange" 
                                                    leftSection={<IconArrowsExchange size={14}/>}
                                                    onClick={() => abrirModalMover(e)}
                                                >
                                                    Mover
                                                </Button>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))
                                ) : (
                                    <Table.Tr><Table.Td colSpan={3} ta="center" c="dimmed">No hay empresas en este plan</Table.Td></Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    )}
                </ScrollArea>
            </Modal>

            {/* 3. Modal Mover Empresa de Plan (Admin) */}
            <Modal opened={modalMover} onClose={() => setModalMover(false)} title="Mover Empresa de Plan" centered>
                <Text mb="md">Selecciona el nuevo plan para <b>{empresaAMover?.nombre}</b>:</Text>
                <Select 
                    label="Nuevo Plan"
                    placeholder="Selecciona un plan"
                    data={planes.map(p => ({ value: String(p.id_plan), label: `${p.nombre_plan} ($${p.precio})` }))}
                    value={nuevoPlanId}
                    onChange={setNuevoPlanId}
                    mb="lg"
                />
                <Group justify="flex-end">
                    <Button variant="default" onClick={() => setModalMover(false)}>Cancelar</Button>
                    <Button color="orange" onClick={ejecutarCambioPlan} disabled={!nuevoPlanId}>Confirmar Cambio</Button>
                </Group>
            </Modal>

            {/* 4. Modal Pago (Usuario) */}
            <Modal opened={modalPago} onClose={() => setModalPago(false)} title="Pago Seguro" centered>
                <form onSubmit={procesarPagoSimulado}>
                    <LoadingOverlay visible={procesandoPago} />
                    <Stack>
                        <Alert color="blue">Plan: <b>{planAPagar?.nombre_plan}</b> (${planAPagar?.precio}/mes)</Alert>
                        <TextInput label="Titular" required value={datosTarjeta.titular} onChange={(e) => setDatosTarjeta({...datosTarjeta, titular: e.target.value})} />
                        <TextInput label="Tarjeta" required maxLength={19} value={datosTarjeta.numero} onChange={(e) => setDatosTarjeta({...datosTarjeta, numero: e.target.value})} />
                        <Group grow>
                            <TextInput label="Exp" required maxLength={5} value={datosTarjeta.exp} onChange={(e) => setDatosTarjeta({...datosTarjeta, exp: e.target.value})} />
                            <TextInput label="CVC" required maxLength={3} type="password" value={datosTarjeta.cvv} onChange={(e) => setDatosTarjeta({...datosTarjeta, cvv: e.target.value})} />
                        </Group>
                        <Button type="submit" color="green" mt="md" loading={procesandoPago}>Pagar Ahora</Button>
                    </Stack>
                </form>
            </Modal>

        </Container>
    );
};

export default Suscripcion;