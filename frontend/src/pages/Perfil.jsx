import { 
    Container, Card, Avatar, Text, Button, Group, 
    Stack, TextInput, Title, Divider, ActionIcon, FileButton, Badge, Loader, Center
} from '@mantine/core';
import { 
    IconEdit, IconCheck, IconX, IconCamera, IconUser, 
    IconMail, IconPhone 
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { getCurrentUser } from '../services/auth';
import { notifications } from '@mantine/notifications';
import axios from 'axios'; // Asegúrate de tener axios instalado

const Perfil = () => {
    const [user, setUser] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState(null); // Estado para el archivo de imagen
    const [previewUrl, setPreviewUrl] = useState(null); // Estado para la vista previa visual

    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        foto_url: null
    });

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
            setFormData({
                nombre: currentUser.nombre || '',
                apellido: currentUser.apellido || '',
                email: currentUser.email || '',
                telefono: currentUser.telefono || '',
                foto_url: currentUser.foto_url || null
            });
        }
    }, []);

    // Manejar selección de foto
    const handleFileChange = (file) => {
        setFile(file);
        if (file) {
            setPreviewUrl(URL.createObjectURL(file)); // Crea una URL temporal para ver la foto antes de subirla
        }
    };

    const handleSave = async () => {
        setLoading(true);
        
        // Creamos el FormData para enviar archivos físicos
        const data = new FormData();
        data.append('nombre', formData.nombre);
        data.append('apellido', formData.apellido);
        data.append('telefono', formData.telefono);
        if (file) {
            data.append('foto', file); // 'foto' debe coincidir con upload.single('foto') en el backend
        }

        try {
            // AJUSTA ESTA URL A TU BACKEND REAL
            const response = await axios.put('http://localhost:3000/api/usuarios/perfil', data, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // Si usas JWT
                }
            });

            notifications.show({
                title: 'Perfil Actualizado',
                message: 'Tus datos y foto se han guardado correctamente.',
                color: 'green',
            });
            
            setEditMode(false);
            setFile(null);
            
            // Actualizamos el objeto local del usuario si el backend devuelve la nueva URL
            if (response.data.foto_url) {
                setFormData(prev => ({ ...prev, foto_url: response.data.foto_url }));
            }
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || 'No se pudo actualizar el perfil',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <Center h="50vh">
                <Loader color="blue" />
            </Center>
        );
    }

    return (
        <Container size="md" py="xl">
            <Card shadow="md" radius="lg" p="xl" withBorder>
                {/* CABECERA */}
                <Group justify="space-between" align="flex-start" mb="xl">
                    <Stack align="center" gap={0} style={{ flex: 1 }}>
                        <div style={{ position: 'relative' }}>
                            <Avatar 
                                // Muestra la previsualización si existe, si no la foto actual, si no nada
                                src={previewUrl || (formData.foto_url ? `http://localhost:3000/uploads/${formData.foto_url}` : null)} 
                                size={120} 
                                radius={120} 
                                color="blue"
                                variant="light"
                            >
                                {!formData.foto_url && !previewUrl && <IconUser size={60} />}
                            </Avatar>
                            
                            {editMode && (
                                <FileButton onChange={handleFileChange} accept="image/png,image/jpeg">
                                    {(props) => (
                                        <ActionIcon 
                                            {...props}
                                            variant="filled" 
                                            color="blue" 
                                            radius="xl" 
                                            size="lg"
                                            style={{ position: 'absolute', bottom: 5, right: 5 }}
                                        >
                                            <IconCamera size={18} />
                                        </ActionIcon>
                                    )}
                                </FileButton>
                            )}
                        </div>
                        <Title order={2} mt="md">{`${formData.nombre} ${formData.apellido}`}</Title>
                        <Badge color="blue" variant="light" size="lg" mt="xs">
                            {user.rol || 'Usuario'}
                        </Badge>
                    </Stack>

                    {!editMode ? (
                        <Button 
                            leftSection={<IconEdit size={16} />} 
                            variant="light" 
                            onClick={() => setEditMode(true)}
                        >
                            Editar Perfil
                        </Button>
                    ) : (
                        <Group gap="xs">
                            <ActionIcon variant="light" color="red" size="lg" onClick={() => {
                                setEditMode(false);
                                setPreviewUrl(null);
                                setFile(null);
                            }}>
                                <IconX size={18} />
                            </ActionIcon>
                            <Button 
                                leftSection={<IconCheck size={16} />} 
                                color="green" 
                                loading={loading}
                                onClick={handleSave}
                            >
                                Guardar
                            </Button>
                        </Group>
                    )}
                </Group>

                <Divider my="lg" label="Información Personal" labelPosition="center" />

                {/* FORMULARIO */}
                <Stack gap="md">
                    <Group grow>
                        <TextInput
                            label="Nombre"
                            value={formData.nombre}
                            readOnly={!editMode}
                            variant={editMode ? 'default' : 'filled'}
                            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                        />
                        <TextInput
                            label="Apellido"
                            value={formData.apellido}
                            readOnly={!editMode}
                            variant={editMode ? 'default' : 'filled'}
                            onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                        />
                    </Group>

                    <TextInput
                        label="Correo Electrónico"
                        leftSection={<IconMail size={16} />}
                        value={formData.email}
                        readOnly
                        variant="filled"
                        description="El correo no se puede cambiar por seguridad"
                    />

                    <TextInput
                        label="Teléfono"
                        placeholder="+591 ..."
                        leftSection={<IconPhone size={16} />}
                        value={formData.telefono}
                        readOnly={!editMode}
                        variant={editMode ? 'default' : 'filled'}
                        onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    />
                </Stack>

                <Divider my="xl" />
                
                <Text size="xs" c="dimmed" ta="center">
                    ID de Empresa: {user.microempresa_id} | Cuenta: {user.rol}
                </Text>
            </Card>
        </Container>
    );
};

export default Perfil;