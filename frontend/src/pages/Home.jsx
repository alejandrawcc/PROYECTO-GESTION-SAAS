import { 
    Container, 
    Title, 
    Text, 
    Button, 
    Group, 
    Card, 
    SimpleGrid, 
    Center,
    Box,
    Stack
    } from '@mantine/core';
    import { 
    IconBuilding, 
    IconChartBar, 
    IconUsers, 
    IconShieldCheck
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';

export function Home() {
    const navigate = useNavigate();
    const user = getCurrentUser();

    return (
        <Box style={{ height: '100vh', backgroundColor: 'var(--mantine-color-blue-0)' }}>
        <Center h="100%">
            <Container size="lg" w="100%">
            <Stack align="center" gap="xl">
                <Title order={1} size={48} c="blue.7" fw={900} ta="center">
                Gestión SaaS para 
                <Text span c="cyan.6" inherit> Microempresas</Text>
                </Title>
                
                <Text size="xl" c="gray.7" ta="center" maw={800}>
                La plataforma que simplifica la administración de tu negocio.
                </Text>

                <Group mt={30}>
                {user ? (
                    <Button 
                    size="lg" 
                    radius="md"
                    variant="gradient"
                    gradient={{ from: 'blue', to: 'cyan' }}
                    onClick={() => navigate('/dashboard')}
                    >
                    Ir al Dashboard
                    </Button>
                ) : (
                    <>
                    <Button 
                        size="lg" 
                        radius="md"
                        variant="gradient"
                        gradient={{ from: 'blue', to: 'cyan' }}
                        onClick={() => navigate('/registrar')}
                    >
                        Comenzar Gratis
                    </Button>
                    <Button 
                        size="lg" 
                        variant="light" 
                        radius="md"
                        onClick={() => navigate('/login')}
                    >
                        Iniciar Sesión
                    </Button>
                    </>
                )}
                </Group>
            </Stack>
            </Container>
        </Center>
        </Box>
    );
}