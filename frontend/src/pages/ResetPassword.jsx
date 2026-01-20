import { 
  Container, 
  Paper, 
  Title, 
  Text, 
  PasswordInput, 
  Button, 
  Stack, 
  Alert, 
  Center,
  Box,
  Loader
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IconLock, IconCheck, IconAlertCircle, IconKey } from '@tabler/icons-react';
import { passwordService } from '../services/passwordService';

export function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const form = useForm({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validate: {
      password: (value) => {
        if (value.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
        return null;
      },
      confirmPassword: (value, values) => 
        value !== values.password ? 'Las contraseñas no coinciden' : null,
    },
  });

  // Verificar token al cargar la página
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenValid(false);
        setLoading(false);
        setVerifying(false);
        notifications.show({
          title: 'Error',
          message: 'Token no proporcionado',
          color: 'red',
        });
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        console.log('Verificando token:', token);
        const response = await passwordService.verifyResetToken(token);
        
        if (response.data.valid) {
          setTokenValid(true);
          setUserEmail(response.data.email || 'Usuario');
        } else {
          setTokenValid(false);
          notifications.show({
            title: 'Token inválido',
            message: response.data.message || 'El enlace ha expirado',
            color: 'red',
          });
        }
      } catch (error) {
        console.error('Error verificando token:', error);
        setTokenValid(false);
        notifications.show({
          title: 'Error',
          message: 'No se pudo verificar el token',
          color: 'red',
        });
      } finally {
        setVerifying(false);
        setLoading(false);
      }
    };

    verifyToken();
  }, [token, navigate]);

  const handleSubmit = async (values) => {
    setLoading(true);
    
    try {
      console.log('Cambiando contraseña para token:', token);
      const response = await passwordService.resetPassword(token, values.password);
      
      console.log('Respuesta:', response.data);
      
      setResetSuccess(true);
      
      notifications.show({
        title: '¡Éxito!',
        message: 'Tu contraseña ha sido cambiada correctamente',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => navigate('/login'), 3000);
      
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Error al cambiar la contraseña',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || verifying) {
    return (
      <Center mih="100vh">
        <Loader size="lg" />
        <Text ml="md">Verificando enlace...</Text>
      </Center>
    );
  }

  if (!tokenValid) {
    return (
      <Center mih="100vh" bg="gray.0">
        <Container size={440} py={40}>
          <Paper withBorder shadow="lg" p={40} radius="lg" bg="white">
            <Alert 
              color="red" 
              title="Enlace inválido o expirado"
              icon={<IconAlertCircle size={20} />}
            >
              <Text size="sm" mt="sm">
                Este enlace para restablecer la contraseña ha expirado o es inválido.
              </Text>
              <Button 
                fullWidth 
                mt="md"
                onClick={() => navigate('/forgot-password')}
              >
                Solicitar nuevo enlace
              </Button>
              <Button 
                fullWidth 
                mt="sm"
                variant="subtle"
                onClick={() => navigate('/login')}
              >
                Volver al Login
              </Button>
            </Alert>
          </Paper>
        </Container>
      </Center>
    );
  }

  if (resetSuccess) {
    return (
      <Center mih="100vh" bg="gray.0">
        <Container size={440} py={40}>
          <Paper withBorder shadow="lg" p={40} radius="lg" bg="white">
            <Alert 
              color="green" 
              title="¡Contraseña Restablecida!"
              icon={<IconCheck size={20} />}
            >
              <Text size="sm" mt="sm">
                Tu contraseña ha sido cambiada exitosamente. Serás redirigido al login en 3 segundos...
              </Text>
              <Button 
                fullWidth 
                mt="md"
                onClick={() => navigate('/login')}
              >
                Ir al Login Ahora
              </Button>
            </Alert>
          </Paper>
        </Container>
      </Center>
    );
  }

  return (
    <Center mih="100vh" bg="gray.0">
      <Container size={440} py={40}>
        <Box ta="center" mb={30}>
          <Title order={1} c="blue.7" fw={900}>
            Nueva Contraseña
          </Title>
          <Text c="gray.6" size="sm" mt="xs">
            Crea una nueva contraseña para tu cuenta
          </Text>
        </Box>

        <Paper withBorder shadow="lg" p={40} radius="lg" bg="white">
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <Alert 
                color="blue" 
                title="Crear nueva contraseña"
                icon={<IconKey size={20} />}
              >
                <Text size="sm">
                  Ingresa una nueva contraseña segura para tu cuenta.
                </Text>
              </Alert>

              <PasswordInput
                label="Nueva Contraseña"
                placeholder="Mínimo 6 caracteres"
                required
                leftSection={<IconLock size={16} />}
                {...form.getInputProps('password')}
                radius="md"
              />

              <PasswordInput
                label="Confirmar Contraseña"
                placeholder="Repite tu contraseña"
                required
                leftSection={<IconLock size={16} />}
                {...form.getInputProps('confirmPassword')}
                radius="md"
              />

              <Button 
                type="submit"
                loading={loading}
                fullWidth
                mt="md"
                size="md"
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
              >
                Cambiar Contraseña
              </Button>

              <Button 
                variant="subtle" 
                onClick={() => navigate('/login')}
                fullWidth
              >
                Volver al Login
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Center>
  );
}