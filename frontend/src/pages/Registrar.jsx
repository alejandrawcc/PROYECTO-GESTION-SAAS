import { 
  TextInput, 
  PasswordInput, 
  Button, 
  Paper, 
  Title, 
  Container, 
  Select, 
  Group, 
  Stack,
  Center,
  Box,
  Divider,
  Textarea
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { login } from '../services/auth';
import api from '../services/api';

export function Registrar() {
  const navigate = useNavigate();
  const [microempresas, setMicroempresas] = useState([]);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      confirmPassword: '',
      rol_id: '',
      // Campos para Administrador (crear empresa)
      nombre_empresa: '',
      nit_empresa: '',
      direccion_empresa: '',
      rubro_empresa: '',
      rubro_otro: '',
      descripcion_empresa: '',
      telefono_empresa: '',
      moneda_empresa: 'USD',
      // Campo para Vendedor (seleccionar empresa)
      microempresa_id: '',
    },

    validate: {
      nombre: (value) => (value.length < 2 ? 'Nombre muy corto' : null),
      apellido: (value) => (value.length < 2 ? 'Apellido muy corto' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
      password: (value) => (value.length < 6 ? 'La contraseña debe tener al menos 6 caracteres' : null),
      confirmPassword: (value, values) => 
        value !== values.password ? 'Las contraseñas no coinciden' : null,
      rol_id: (value) => (value ? null : 'Selecciona un rol'),
      nombre_empresa: (value, values) => 
        values.rol_id === '2' && !value ? 'Nombre de empresa es requerido' : null,
      nit_empresa: (value, values) => 
        values.rol_id === '2' && !value ? 'NIT es requerido' : null,
      direccion_empresa: (value, values) => 
        values.rol_id === '2' && !value ? 'Dirección es requerida' : null,
      telefono_empresa: (value, values) => 
        values.rol_id === '2' && !value ? 'Teléfono es requerido' : null,
      rubro_empresa: (value, values) => 
        values.rol_id === '2' && !value ? 'Debes seleccionar un rubro' : null,
      rubro_otro: (value, values) => 
        values.rol_id === '2' && values.rubro_empresa === 'otro' && !value ? 'Especifica el rubro' : null,
      microempresa_id: (value, values) => 
        values.rol_id === '3' && !value ? 'Debes seleccionar una microempresa' : null,
    },
  });

  // Obtener lista de microempresas cuando se selecciona vendedor
  useEffect(() => {
    const fetchMicroempresas = async () => {
      if (form.values.rol_id === '3') {
        try {
          const response = await api.get('/auth/microempresas');
          setMicroempresas(response.data || []);
        } catch (error) {
          console.error('Error al cargar microempresas:', error);
          notifications.show({
            title: 'Error',
            message: 'No se pudieron cargar las microempresas',
            color: 'yellow',
          });
        }
      }
    };

    fetchMicroempresas();
  }, [form.values.rol_id]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const dataToSend = {
        nombre: values.nombre,
        apellido: values.apellido,
        email: values.email,
        password: values.password,
        rol_id: parseInt(values.rol_id)
      };

      // Si es Administrador, agregar datos de empresa
      if (values.rol_id === '2') {
        dataToSend.empresa = {
          nombre: values.nombre_empresa,
          nit: values.nit_empresa,
          direccion: values.direccion_empresa,
          rubro: values.rubro_empresa === 'otro' ? values.rubro_otro : values.rubro_empresa,
          descripcion: values.descripcion_empresa || null,
          telefono: values.telefono_empresa,
          email: values.email, // Email del administrador
          moneda: values.moneda_empresa || 'USD',
          estado: 'activo',
          plan_id: 'básico' // Por defecto
        };
      }
      // Si es Vendedor, agregar microempresa_id
      else if (values.rol_id === '3') {
        dataToSend.microempresa_id = parseInt(values.microempresa_id);
      }

      await api.post('/auth/register', dataToSend);
      
      notifications.show({
        title: '¡Registro exitoso!',
        message: 'Tu cuenta ha sido creada correctamente',
        color: 'green',
      });

      // Intentar login automático
      await login(values.email, values.password);
      navigate('/dashboard');
      
    } catch (error) {
      const errorMessage = error.response?.data?.sqlError || 
                          error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Error al crear la cuenta';
      console.error('Error completo:', error.response?.data);
      notifications.show({
        title: 'Error en el registro',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center mih="100vh" bg="gray.0" style={{ overflowY: 'auto', padding: '20px 0' }}>
      <Container size={600} py={40}>
        <Box ta="center" mb={30}>
          <Title order={1} c="blue.7" fw={900}>
            Crear Nueva Cuenta
          </Title>
          <Title order={4} c="gray.6" fw={400} mt="xs">
            Sistema de Gestión para Microempresas
          </Title>
        </Box>
        
        <Paper withBorder shadow="lg" p={40} radius="lg" bg="white">
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <Group grow>
                <TextInput 
                  label="Nombre" 
                  placeholder="Ej: Alejandra" 
                  required 
                  {...form.getInputProps('nombre')}
                  radius="md"
                />
                <TextInput 
                  label="Apellido" 
                  placeholder="Ej: Cruz" 
                  required 
                  {...form.getInputProps('apellido')}
                  radius="md"
                />
              </Group>

              <TextInput 
                label="Correo electrónico" 
                placeholder="correo@ejemplo.com" 
                required 
                {...form.getInputProps('email')}
                radius="md"
              />
              
              <PasswordInput 
                label="Contraseña" 
                placeholder="Mínimo 6 caracteres" 
                required 
                {...form.getInputProps('password')}
                radius="md"
              />

              <PasswordInput 
                label="Confirmar Contraseña" 
                placeholder="Repite tu contraseña" 
                required 
                {...form.getInputProps('confirmPassword')}
                radius="md"
              />

              <Select
                label="Rol"
                placeholder="Selecciona tu rol"
                data={[
                  /*{ value: '1', label: 'Super Admin' },*/
                  { value: '2', label: 'Administrador' },
                  { value: '3', label: 'Vendedor' }
                ]}
                required
                {...form.getInputProps('rol_id')}
                radius="md"
              />

              {/* Campos para Administrador - Crear empresa */}
              {form.values.rol_id === '2' && (
                <>
                  <Divider label="Datos de tu Empresa" labelPosition="center" my="md" />
                  <TextInput 
                    label="Nombre de la Empresa" 
                    placeholder="Ej: Mi Empresa S.A." 
                    required
                    {...form.getInputProps('nombre_empresa')}
                    radius="md"
                  />
                  <TextInput 
                    label="NIT" 
                    placeholder="Ej: 12345678-9" 
                    required
                    {...form.getInputProps('nit_empresa')}
                    radius="md"
                  />
                  <TextInput 
                    label="Dirección" 
                    placeholder="Dirección completa de la empresa" 
                    required
                    {...form.getInputProps('direccion_empresa')}
                    radius="md"
                  />
                  <Select
                    label="Rubro"
                    placeholder="Selecciona el rubro de tu empresa"
                    data={[
                      { value: 'comercio', label: 'Comercio' },
                      { value: 'servicios', label: 'Servicios' },
                      { value: 'manufactura', label: 'Manufactura' },
                      { value: 'tecnologia', label: 'Tecnología' },
                      { value: 'alimentacion', label: 'Alimentación' },
                      { value: 'construccion', label: 'Construcción' },
                      { value: 'salud', label: 'Salud' },
                      { value: 'educacion', label: 'Educación' },
                      { value: 'otro', label: 'Otro' }
                    ]}
                    required
                    {...form.getInputProps('rubro_empresa')}
                    radius="md"
                  />
                  {form.values.rubro_empresa === 'otro' && (
                    <TextInput 
                      label="Especificar rubro" 
                      placeholder="Escribe el rubro de tu empresa" 
                      required
                      {...form.getInputProps('rubro_otro')}
                      radius="md"
                    />
                  )}
                  <Textarea 
                    label="Descripción" 
                    placeholder="Describe brevemente tu empresa (opcional)" 
                    rows={3}
                    {...form.getInputProps('descripcion_empresa')}
                    radius="md"
                  />
                  <TextInput 
                    label="Teléfono" 
                    placeholder="Teléfono de contacto" 
                    required
                    {...form.getInputProps('telefono_empresa')}
                    radius="md"
                  />
                  <Select
                    label="Moneda"
                    placeholder="Selecciona la moneda"
                    data={[
                      { value: 'BOB', label: 'BOB - Boliviano' },
                      { value: 'USD', label: 'USD - Dólar' },
                      { value: 'EUR', label: 'EUR - Euro' },
                      { value: 'GBP', label: 'GBP - Libra' },
                      { value: 'MXN', label: 'MXN - Peso Mexicano' },
                      { value: 'GTQ', label: 'GTQ - Quetzal' }
                    ]}
                    {...form.getInputProps('moneda_empresa')}
                    radius="md"
                  />
                  <Box c="blue" size="sm" mt={-10} mb="xs">
                    Plan: <strong>Básico</strong> (por defecto) | Estado: <strong>Activo</strong>
                  </Box>
                </>
              )}

              {/* Campo para Vendedor - Seleccionar empresa */}
              {form.values.rol_id === '3' && (
                <>
                  <Divider label="Microempresa" labelPosition="center" my="md" />
                  <Select
                    label="Microempresa"
                    placeholder="Selecciona la microempresa a la que perteneces"
                    data={microempresas.map(emp => ({
                      value: String(emp.id_microempresa),
                      label: emp.nombre || `Empresa #${emp.id_microempresa}`
                    }))}
                    required
                    {...form.getInputProps('microempresa_id')}
                    radius="md"
                    searchable
                  />
                </>
              )}

              <Button 
                fullWidth 
                size="md" 
                type="submit" 
                mt="xl"
                radius="md"
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
                loading={loading}
              >
                Crear Cuenta
              </Button>

              <Button 
                fullWidth 
                variant="subtle" 
                onClick={() => navigate('/login')}
                radius="md"
              >
                ¿Ya tienes cuenta? Inicia Sesión
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Center>
  );
}