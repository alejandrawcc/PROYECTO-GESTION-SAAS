import { Paper, Text, Group, Stack, Divider, Table, Badge, Button } from '@mantine/core';
import { IconPrinter, IconDownload, IconFileInvoice } from '@tabler/icons-react';
import PdfService from '../services/pdfService';

const ComprobanteVenta = ({ ventaData, showActions = true, onPrint }) => {
    const handleDescargarPDF = async () => {
        try {
            await PdfService.generarComprobanteVenta({
                ...ventaData,
                empresa_nombre: "Mi Microempresa", // Puedes obtener esto de tu contexto
                empresa_nit: "123456789",
                empresa_direccion: "Av. Siempre Viva 123",
                empresa_telefono: "+591 70000000",
                observaciones: "Gracias por su compra. Presente este comprobante para garantías."
            });
        } catch (error) {
            console.error('Error generando PDF:', error);
        }
    };

    const handleImprimir = () => {
        if (onPrint) {
            onPrint();
        } else {
            window.print();
        }
    };

    return (
        <Paper id="comprobante-venta" p="xl" shadow="md" radius="md" withBorder>
            {/* Encabezado */}
            <Stack align="center" gap="xs" mb="lg">
                <Text fw={900} size="xl" c="blue.7">COMPROBANTE DE VENTA</Text>
                <Badge size="lg" color="blue" variant="light">
                    No. {ventaData.pedido_id || '00001'}
                </Badge>
                <Text size="sm" c="dimmed">
                    {new Date(ventaData.fecha || new Date()).toLocaleString()}
                </Text>
            </Stack>

            <Divider my="md" />

            {/* Información de la empresa */}
            <Stack mb="lg">
                <Text fw={700} size="md" c="blue.7">EMPRESA</Text>
                <Text>Mi Microempresa S.R.L.</Text>
                <Text size="sm" c="dimmed">NIT: 123456789</Text>
                <Text size="sm" c="dimmed">Av. Siempre Viva 123, La Paz - Bolivia</Text>
                <Text size="sm" c="dimmed">Tel: +591 70000000</Text>
            </Stack>

            {/* Información del cliente */}
            <Stack mb="lg">
                <Text fw={700} size="md" c="blue.7">CLIENTE</Text>
                <Text>{ventaData.cliente_nombre || 'Cliente no registrado'}</Text>
                {ventaData.cliente_ci && <Text size="sm">CI/NIT: {ventaData.cliente_ci}</Text>}
                {ventaData.cliente_email && <Text size="sm">Email: {ventaData.cliente_email}</Text>}
                {ventaData.cliente_telefono && <Text size="sm">Tel: {ventaData.cliente_telefono}</Text>}
            </Stack>

            {/* Tabla de productos */}
            <Table mb="lg" striped highlightOnHover>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Cant.</Table.Th>
                        <Table.Th>Descripción</Table.Th>
                        <Table.Th>P. Unit.</Table.Th>
                        <Table.Th>Subtotal</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {ventaData.productos?.map((producto, index) => (
                        <Table.Tr key={index}>
                            <Table.Td>{producto.cantidad}</Table.Td>
                            <Table.Td>{producto.nombre}</Table.Td>
                            <Table.Td>Bs {producto.precio_unitario?.toFixed(2)}</Table.Td>
                            <Table.Td>Bs {(producto.cantidad * producto.precio_unitario)?.toFixed(2)}</Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>

            {/* Totales */}
            <Stack align="flex-end" mb="lg">
                <Group>
                    <Text fw={700}>Total:</Text>
                    <Text fw={900} size="xl" c="green">
                        Bs {ventaData.total?.toFixed(2)}
                    </Text>
                </Group>
                <Text size="sm" c="dimmed">
                    Método de pago: {ventaData.metodo_pago || 'Efectivo'}
                </Text>
            </Stack>

            <Divider my="md" />

            {/* Observaciones */}
            <Stack mb="lg">
                <Text fw={700}>Observaciones:</Text>
                <Text size="sm" c="dimmed">
                    Gracias por su compra. Presente este comprobante para garantías.
                    No se aceptan devoluciones después de 7 días.
                </Text>
            </Stack>

            {/* Firmas */}
            <Group grow mt="xl">
                <Stack align="center">
                    <Divider w="80%" />
                    <Text size="sm" c="dimmed">Firma del Cliente</Text>
                </Stack>
                <Stack align="center">
                    <Divider w="80%" />
                    <Text size="sm" c="dimmed">Firma del Vendedor</Text>
                </Stack>
            </Group>

            {/* Botones de acción */}
            {showActions && (
                <Group justify="center" mt="xl">
                    <Button
                        leftSection={<IconDownload size={18} />}
                        onClick={handleDescargarPDF}
                        variant="light"
                        color="blue"
                    >
                        Descargar PDF
                    </Button>
                    <Button
                        leftSection={<IconPrinter size={18} />}
                        onClick={handleImprimir}
                        variant="light"
                        color="green"
                    >
                        Imprimir
                    </Button>
                </Group>
            )}
        </Paper>
    );
};

export default ComprobanteVenta;