import { 
  Container, 
  Paper, 
  Title, 
  Text, 
  TextInput, 
  Button, 
  Stack, 
  Select, 
  SimpleGrid,
  Card,
  Badge,
  rem
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconBuilding, IconId, IconPhone, IconMapPin } from '@tabler/icons-react';
import { getCurrentUser } from '../services/auth';
import axios from 'axios';

export const SetupEmpresa = () => {
  const user = getCurrentUser();

  const form = useForm({
    initialValues: {
      nombre: '',
      nit: '',
      direccion: '',
      telefono: '',
      sector: 'Ventas',
      plan_id: 2, // Por defecto el Básico que quieres resaltar
      admin_id: user?.id || '',
    },
    validate: {
      nombre: (value) => (value.length < 2 ? 'Nombre de empresa requerido' : null),
      nit: (value) => (value.length < 5 ? 'NIT inválido' : null),
    },
  });

  const handleSubmit = async (values) => {
    try {
      // 1. Llamada al backend para crear la microempresa
      const res = await axios.post('http://localhost:3000/api/microempresas', values);
      
      if (res.status === 201 || res.status === 200) {
        notifications.show({
          title: '¡Configuración Exitosa!',
          message: `La empresa ${values.nombre} ha sido registrada.`,
          color: 'green',
        });

        // 2. ACTUALIZAMOS EL LOCALSTORAGE
        // Importante para que el MainLayout y Dashboard lean el nuevo ID
        const updatedUser = { 
          ...user, 
          microempresa_id: res.data.id,
          empresa_nombre: values.nombre,
          rol: 'administrador' // Aseguramos el rol de dueño
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // 3. Redirigir al Dashboard
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error(error);
      notifications.show({
        title: 'Error de registro',
        message: error.response?.data?.mensaje || 'No pudimos registrar tu empresa',
        color: 'red',
      });
    }
  };

  return (
    <Container size="md" py={40}>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="xl">
          <Paper withBorder shadow="md" p={30} radius="md">
            <Title order={2} ta="center" mb="sm">🏢 Configura tu Microempresa</Title>
            <Text c="dimmed" ta="center" mb="xl">Necesitamos estos datos para activar tu espacio de trabajo</Text>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <TextInput 
                label="Nombre de la Empresa" 
                placeholder="Ej. Pollos Pepe" 
                required 
                leftSection={<IconBuilding size={16} />}
                {...form.getInputProps('nombre')} 
              />
              <TextInput 
                label="NIT / Identificación" 
                placeholder="12345678" 
                required 
                leftSection={<IconId size={16} />}
                {...form.getInputProps('nit')} 
              />
              <TextInput 
                label="Dirección" 
                placeholder="Av. 6 de Agosto..." 
                leftSection={<IconMapPin size={16} />}
                {...form.getInputProps('direccion')} 
              />
              <TextInput 
                label="Teléfono" 
                placeholder="70000000" 
                leftSection={<IconPhone size={16} />}
                {...form.getInputProps('telefono')} 
              />
              <Select 
                label="Sector / Rubro" 
                data={['Ventas', 'Alimentos', 'Servicios', 'Tecnología', 'Otros']} 
                {...form.getInputProps('sector')} 
              />
              <Select 
                label="Plan Inicial" 
                data={[
                  { value: '1', label: 'Plan Free' },
                  { value: '2', label: 'Plan Básico' },
                  { value: '3', label: 'Plan Premium' }
                ]} 
                {...form.getInputProps('plan_id')} 
              />
            </SimpleGrid>

            <Button 
              type="submit" 
              fullWidth 
              size="md" 
              mt="xl" 
              variant="gradient" 
              gradient={{ from: 'blue', to: 'cyan' }}
            >
              Comenzar a usar el sistema
            </Button>
          </Paper>
        </Stack>
      </form>
    </Container>
  );
};