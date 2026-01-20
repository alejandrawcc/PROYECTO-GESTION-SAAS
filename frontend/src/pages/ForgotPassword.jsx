import { 
    Container, 
    Paper, 
    Title, 
    Text, 
    TextInput, 
    Button, 
    Stack, 
    Group, 
    Alert, 
    Center,
    Box,
    Loader
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconMail, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { passwordService } from '../services/passwordService';

export function ForgotPassword() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const form = useForm({
        initialValues: {
        email: '',
        },
        validate: {
        email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
        },
    });

    const handleSubmit = async (values) => {
        setLoading(true);
        
        console.log('📤 Enviando solicitud de reset para:', values.email);
        console.log('🌐 URL:', 'http://localhost:3000/api/password/forgot-password');
        
        try {
            const response = await passwordService.forgotPassword(values.email);
            
            console.log('✅ Respuesta del backend:', response.data);
            
            notifications.show({
            title: 'Email enviado',
            message: response.data.message,
            color: 'green',
            icon: <IconCheck size={16} />,
            });
            
            setEmailSent(true);
            
            // Si hay token en desarrollo, mostrarlo
            if (response.data.token) {
            console.log('🔗 Token para desarrollo:', response.data.token);
            console.log('🌐 URL completa: http://localhost:5174/reset-password/' + response.data.token);
            
            // Opcional: Mostrar en pantalla para desarrollo
            notifications.show({
                title: 'Modo Desarrollo',
                message: `Token: ${response.data.token.substring(0, 20)}...`,
                color: 'blue',
            });
            }
            
        } catch (error) {
            console.error('❌ ERROR COMPLETO:', error);
            console.error('❌ Error response:', error.response);
            console.error('❌ Error data:', error.response?.data);
            console.error('❌ Error status:', error.response?.status);
            
            notifications.show({
            title: 'Error',
            message: error.response?.data?.error || error.response?.data?.message || error.message || 'Error al procesar la solicitud',
            color: 'red',
            icon: <IconAlertCircle size={16} />,
            });
        } finally {
            setLoading(false);
        }
    };
    
    if (loading) {
        return (
        <Center mih="100vh">
            <Loader size="lg" />
        </Center>
        );
    }

    return (
        <Center mih="100vh" bg="gray.0">
        <Container size={440} py={40}>
            <Box ta="center" mb={30}>
            <Title order={1} c="blue.7" fw={900}>
                Recuperar Contraseña
            </Title>
            <Text c="gray.6" size="lg" mt="xs">
                Te enviaremos un enlace a tu email
            </Text>
            </Box>

            <Paper withBorder shadow="lg" p={40} radius="lg" bg="white">
            {emailSent ? (
                <Stack gap="md">
                <Alert 
                    color="green" 
                    title="Email Enviado"
                    icon={<IconCheck size={20} />}
                >
                    <Text size="sm">
                    Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
                    Revisa tu bandeja de entrada y carpeta de spam.
                    </Text>
                </Alert>

                <Group justify="center" mt="md">
                    <Button 
                    variant="light" 
                    onClick={() => setEmailSent(false)}
                    >
                    Intentar con otro email
                    </Button>
                    <Button 
                    onClick={() => navigate('/login')}
                    >
                    Volver al Login
                    </Button>
                </Group>
                </Stack>
            ) : (
                <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    <Alert 
                    color="blue" 
                    title="Instrucciones"
                    icon={<IconAlertCircle size={20} />}
                    >
                    <Text size="sm">
                        Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                        El enlace expirará en 1 hora.
                    </Text>
                    </Alert>

                    <TextInput
                    label="Email"
                    placeholder="tu@email.com"
                    required
                    leftSection={<IconMail size={16} />}
                    {...form.getInputProps('email')}
                    radius="md"
                    />

                    <Group justify="space-between" mt="md">
                    <Button 
                        variant="subtle" 
                        onClick={() => navigate('/login')}
                        size="sm"
                    >
                        Volver al Login
                    </Button>
                    <Button 
                        type="submit"
                        loading={loading}
                        variant="gradient"
                        gradient={{ from: 'blue', to: 'cyan' }}
                    >
                        Enviar Enlace
                    </Button>
                    </Group>
                </Stack>
                </form>
            )}
            </Paper>

            <Text c="dimmed" size="sm" ta="center" mt="xl">
            ¿No tienes una cuenta?{' '}
            <Text 
                component="span" 
                c="blue.6" 
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/registrar')}
            >
                Regístrate
            </Text>
            </Text>
        </Container>
        </Center>
    );
}