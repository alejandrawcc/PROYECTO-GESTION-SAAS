import { 
  TextInput, 
  PasswordInput, 
  Button, 
  Paper, 
  Title, 
  Text, 
  Container, 
  Group, 
  Anchor,
  Center,
  Box,
  Flex
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth';
import { IconBuilding } from '@tabler/icons-react';

export function Login() {
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
      password: (value) => (value.length < 4 ? 'La contraseña es muy corta' : null),
    },
  });

  const handleSubmit = async (values) => {
    try {
      await login(values.email, values.password);
      
      notifications.show({
        title: '¡Bienvenido!',
        message: 'Has iniciado sesión correctamente',
        color: 'green',
      });

      navigate('/dashboard');
    } catch (error) {
      notifications.show({
        title: 'Error de acceso',
        message: error.response?.data?.message || 'Credenciales incorrectas',
        color: 'red',
      });
    }
  };

  return (
    <Center mih="100vh" bg="gray.0">
      <Container size={440} py={40}>
        <Flex direction="column" align="center" gap="md" mb={30}>

          <Box ta="center">
            <Title order={1} c="blue.7" fw={900}>
              Gestión Microempresas
            </Title>
            <Text c="gray.6" size="lg" mt="xs">
              Inicia sesión en tu cuenta
            </Text>
          </Box>
        </Flex>

        <Paper withBorder shadow="lg" p={40} radius="lg" bg="white">
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <TextInput 
              label="Correo electrónico" 
              placeholder="tu@email.com" 
              required 
              radius="md"
              {...form.getInputProps('email')} 
              mb="md"
            />
            
            <PasswordInput 
              label="Contraseña" 
              placeholder="Tu contraseña" 
              required 
              radius="md"
              {...form.getInputProps('password')} 
              mb="xl"
            />
            
            <Group justify="space-between" mb="xl">
              <Anchor component="button" size="sm" c="blue.6" onClick={() => navigate('/forgot-password')}>
                ¿Olvidaste tu contraseña?
              </Anchor>
              <Anchor 
                component="button" 
                size="sm" 
                c="blue.6"
                onClick={() => navigate('/registrar')}
              >
                Crear nueva cuenta
              </Anchor>
            </Group>

            <Button 
              fullWidth 
              size="md" 
              type="submit"
              radius="md"
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan' }}
            >
              Iniciar Sesión
            </Button>
          </form>
        </Paper>
      </Container>
    </Center>
  );
}