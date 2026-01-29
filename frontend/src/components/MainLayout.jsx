import { AppShell, Burger, Group, NavLink, Button, Text, Avatar, Menu, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconHome2, 
  IconUsers, 
  IconLogout,
  IconUserCircle,
  IconSettings,
  IconPackage,      
  IconShoppingCart, 
  IconCreditCard,
  IconAddressBook,
  IconBuildingStore,
  IconShoppingBag,
  IconTruck
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../services/auth';

export function MainLayout({ children }) {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavItems = () => {
    // 1. Rutas Básicas (Para todos)
    const items = [
      { label: 'Dashboard', icon: IconHome2, path: '/dashboard' },
    ];

    if (['vendedor', 'administrador'].includes(user?.rol)) {
        items.push({ label: 'Ventas', icon: IconShoppingCart, path: '/ventas' });
        items.push({ label: 'Clientes', icon: IconAddressBook, path: '/clientes' });
    }

    // 3. Rutas de Administración (Solo Admin y SuperAdmin)
    if (['administrador', 'super_admin'].includes(user?.rol)) {
      items.push({ label: 'Usuarios', icon: IconUsers, path: '/usuarios' });
      items.push({ label: 'Mi Plan / Pagos', icon: IconCreditCard, path: '/suscripcion' });
    }

    if (['administrador', 'super_admin'].includes(user?.rol)) {
      items.push({ label: 'Productos', icon: IconPackage, path: '/gestion-productos' });
    }

    if (['administrador'].includes(user?.rol)) {
      items.push({ label: 'Proveedores', icon: IconTruck, path: '/gestion-proveedores' });
      items.push({ label: 'Compras', icon: IconShoppingBag, path: '/gestion-compras' });
      items.push({ label: 'Ventas', icon: IconShoppingCart, path: '/gestion-ventas' });
    }

    return items;
  };

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header px="md">
        <Group h="100%" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={900} size="xl" c="blue.7">GESTIÓN PRO</Text>
          </Group>

          <Group>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Button variant="subtle" p="xs">
                  <Group gap="sm">
                    <Avatar size="sm" color="blue" radius="xl">{user?.nombre?.charAt(0)}</Avatar>
                    <div style={{ textAlign: 'left' }}>
                      <Text size="sm" fw={500}>{user?.nombre} {user?.apellido}</Text>
                      <Text size="xs" c="dimmed">{user?.rol?.replace('_', ' ')}</Text>
                    </div>
                  </Group>
                </Button>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Cuenta</Menu.Label>
                <Menu.Item 
                  leftSection={<IconUserCircle size={14} />} 
                  onClick={() => navigate('/perfil')}
                >
                  Mi Perfil
                </Menu.Item>
                <Menu.Item 
                  leftSection={<IconSettings size={14} />}
                  onClick={() => navigate('/configuracion')}
                >
                  Configuración
                </Menu.Item>
                
                <Menu.Divider />
                <Menu.Label>Empresa</Menu.Label>
                <Text size="sm" fw={600} px="xs" py="xs" c="blue">
                  {user?.empresa_nombre || 'Sin Empresa'}
                </Text>
                
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={handleLogout}>
                  Cerrar Sesión
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow component={ScrollArea}>
          <Text size="xs" fw={700} c="dimmed" mb="md" tt="uppercase">Navegación</Text>
          {getNavItems().map((item, index) => (
            <NavLink
              key={index}
              label={item.label}
              leftSection={<item.icon size={20} stroke={1.5} />}
              onClick={() => navigate(item.path)}
              active={window.location.pathname === item.path}
              variant="filled"
              mb="xs"
              radius="md"
            />
          ))}
        </AppShell.Section>
        
        <AppShell.Section>
          <Text size="xs" c="dimmed" mb="xs">Estado del Sistema</Text>
          <Group gap="xs">
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#40C057' }} />
            <Text size="sm">En línea</Text>
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main bg="gray.0">{children}</AppShell.Main>
    </AppShell>
  );
}