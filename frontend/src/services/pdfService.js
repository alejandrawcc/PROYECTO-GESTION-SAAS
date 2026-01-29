// src/services/pdfService.js
import { jsPDF } from 'jspdf';

class PdfService {
    // ========== COMPROBANTE DE VENTA ==========
    static generarComprobanteVenta(ventaData) {
        try {
            console.log('📊 Datos de venta recibidos:', ventaData);
            
            // Asegurarse de que productos existe
            const productos = ventaData.productos || [];
            if (productos.length === 0) {
                console.warn('⚠️ No hay productos en la venta');
                productos.push({
                    nombre: 'Producto no especificado',
                    cantidad: 1,
                    precio_unitario: ventaData.total || 0
                });
            }
            console.log("📄 Generando PDF de venta...");
            
            const doc = new jsPDF();
            
            // ========== CABECERA ==========
            doc.setFontSize(20);
            doc.setTextColor(0, 51, 102); // Azul oscuro
            doc.text('FACTURA DE VENTA', 105, 20, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Nº: ${ventaData.pedido_id || '0001'}`, 20, 35);
            doc.text(`Fecha: ${new Date(ventaData.fecha).toLocaleDateString()}`, 160, 35);
            doc.text(`Hora: ${new Date(ventaData.fecha).toLocaleTimeString()}`, 160, 40);
            
            // ========== INFORMACIÓN EMPRESA ==========
            doc.setFontSize(12);
            doc.setTextColor(0, 51, 102);
            doc.text('EMPRESA:', 20, 55);
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(ventaData.empresa_nombre || 'Mi Microempresa', 20, 60);
            doc.text(`NIT: ${ventaData.empresa_nit || '123456789'}`, 20, 65);
            doc.text(`Dirección: ${ventaData.empresa_direccion || 'Av. Principal #123'}`, 20, 70);
            doc.text(`Teléfono: ${ventaData.empresa_telefono || '+591 70000000'}`, 20, 75);
            
            // ========== INFORMACIÓN CLIENTE ==========
            doc.setFontSize(12);
            doc.setTextColor(0, 51, 102);
            doc.text('CLIENTE:', 120, 55);
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(ventaData.cliente_nombre || 'Cliente General', 120, 60);
            
            let clienteY = 65;
            if (ventaData.cliente_ci) {
                doc.text(`CI/NIT: ${ventaData.cliente_ci}`, 120, clienteY);
                clienteY += 5;
            }
            if (ventaData.cliente_telefono) {
                doc.text(`Tel: ${ventaData.cliente_telefono}`, 120, clienteY);
                clienteY += 5;
            }
            if (ventaData.cliente_email) {
                doc.text(`Email: ${ventaData.cliente_email}`, 120, clienteY);
            }
            
            // Línea separadora
            doc.setDrawColor(200, 200, 200);
            doc.line(20, 85, 190, 85);
            
            // ========== TABLA DE PRODUCTOS ==========
            let y = 95;
            
            // Encabezado de la tabla
            doc.setFontSize(11);
            doc.setTextColor(255, 255, 255);
            doc.setFillColor(0, 51, 102);
            doc.rect(20, y - 5, 170, 7, 'F');
            
            doc.text('Descripción', 25, y);
            doc.text('Cant.', 120, y);
            doc.text('Precio', 140, y);
            doc.text('Total', 170, y);
            
            y += 10;
            doc.setTextColor(0, 0, 0);
            
            // Productos
            let totalGeneral = 0;
            (productos || []).forEach((producto, index) => {
                // Fondo alternado para mejor lectura
                if (index % 2 === 0) {
                    doc.setFillColor(240, 240, 240);
                    doc.rect(20, y - 2, 170, 7, 'F');
                }
                
                doc.setFontSize(10);
                
                // Nombre del producto
                const nombre = producto.nombre || 'Producto';
                const nombreCorto = nombre.length > 40 ? nombre.substring(0, 37) + '...' : nombre;
                doc.text(`${index + 1}. ${nombreCorto}`, 25, y);
                
                // Cantidad
                doc.text(producto.cantidad.toString(), 120, y);
                
                // Precio unitario
                const precioUnitario = producto.precio_unitario || producto.precio || 0;
                doc.text(`Bs ${precioUnitario.toFixed(2)}`, 140, y);
                
                // Subtotal
                const subtotal = producto.subtotal || (producto.cantidad * precioUnitario);
                doc.text(`Bs ${subtotal.toFixed(2)}`, 170, y);
                
                totalGeneral += subtotal;
                y += 7;
                
                // Si hay muchos productos, crear nueva página
                if (y > 250 && index < ventaData.productos.length - 1) {
                    doc.addPage();
                    y = 20;
                }
            });
            
            // Línea de total
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.line(140, y + 5, 190, y + 5);
            
            // ========== TOTALES ==========
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('TOTAL:', 140, y + 15);
            doc.text(`Bs ${totalGeneral.toFixed(2)}`, 170, y + 15);
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`Método de pago: ${ventaData.metodo_pago || 'Efectivo'}`, 20, y + 25);
            
            if (ventaData.vendedor) {
                doc.text(`Vendedor: ${ventaData.vendedor}`, 20, y + 30);
            }
            
            // ========== PIE DE PÁGINA ==========
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('Gracias por su compra', 105, y + 45, { align: 'center' });
            doc.text('Comprobante válido por 7 días', 105, y + 50, { align: 'center' });
            
            // Firmas
            const firmaY = y + 70;
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.line(30, firmaY, 80, firmaY);
            doc.line(120, firmaY, 170, firmaY);
            
            doc.setFontSize(8);
            doc.text('Firma del Cliente', 55, firmaY + 5, { align: 'center' });
            doc.text('Firma del Vendedor', 145, firmaY + 5, { align: 'center' });
            
            // ========== GUARDAR PDF ==========
            const fileName = `venta-${ventaData.pedido_id || Date.now()}.pdf`;
            doc.save(fileName);
            
            console.log("✅ PDF de venta generado:", fileName);
            return fileName;
            
        } catch (error) {
            console.error("❌ Error generando PDF de venta:", error);
            return null;
        }
    }

    // ========== COMPROBANTE DE COMPRA ==========
    static generarComprobanteCompra(compraData) {
        try {
            console.log('Generando comprobante de compra con datos:', compraData);
            
            // Validación de datos
            if (!compraData) {
                throw new Error('No hay datos de compra');
            }
            
            const doc = new jsPDF();
            
            // ========== CABECERA ==========
            doc.setFontSize(20);
            doc.setTextColor(0, 102, 51); // Verde oscuro para compras
            doc.text('COMPROBANTE DE COMPRA', 105, 20, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Nº Compra: ${compraData.id_compra || '0001'}`, 20, 35);
            doc.text(`Factura: ${compraData.numero_factura || 'Sin número'}`, 110, 35);
            doc.text(`Fecha: ${new Date(compraData.fecha).toLocaleDateString()}`, 160, 35);
            doc.text(`Hora: ${new Date(compraData.fecha).toLocaleTimeString()}`, 160, 40);
            doc.text(`Estado: ${compraData.estado || 'Completada'}`, 20, 40);
            
            // ========== INFORMACIÓN EMPRESA COMPRADORA ==========
            doc.setFontSize(12);
            doc.setTextColor(0, 102, 51);
            doc.text('EMPRESA COMPRADORA:', 20, 55);
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(compraData.empresa_nombre || 'Mi Microempresa', 20, 60);
            doc.text(`NIT: ${compraData.empresa_nit || '123456789'}`, 20, 65);
            doc.text(`Dirección: ${compraData.empresa_direccion || 'Av. Principal #123'}`, 20, 70);
            doc.text(`Teléfono: ${compraData.empresa_telefono || '+591 70000000'}`, 20, 75);
            doc.text(`Email: ${compraData.empresa_email || 'info@empresa.com'}`, 20, 80);
            
            // ========== INFORMACIÓN COMPLETA DEL PROVEEDOR ==========
            doc.setFontSize(12);
            doc.setTextColor(0, 102, 51);
            doc.text('PROVEEDOR:', 120, 55);
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            
            let proveedorY = 60;
            
            // Nombre del proveedor
            doc.text(compraData.proveedor_nombre || 'Proveedor General', 120, proveedorY);
            proveedorY += 5;
            
            // NIT/CI del proveedor
            if (compraData.proveedor_nit) {
                doc.text(`NIT/CI: ${compraData.proveedor_nit}`, 120, proveedorY);
                proveedorY += 5;
            }
            
            // Contacto del proveedor
            if (compraData.proveedor_contacto) {
                doc.text(`Contacto: ${compraData.proveedor_contacto}`, 120, proveedorY);
                proveedorY += 5;
            }
            
            // Dirección del proveedor
            if (compraData.proveedor_direccion) {
                doc.text(`Dirección: ${compraData.proveedor_direccion}`, 120, proveedorY);
                proveedorY += 5;
            }
            
            // Teléfono del proveedor
            if (compraData.proveedor_telefono) {
                doc.text(`Teléfono: ${compraData.proveedor_telefono}`, 120, proveedorY);
                proveedorY += 5;
            }
            
            // Email del proveedor
            if (compraData.proveedor_email) {
                doc.text(`Email: ${compraData.proveedor_email}`, 120, proveedorY);
                proveedorY += 5;
            }
            // Línea separadora
            doc.setDrawColor(200, 200, 200);
            doc.line(20, 90, 190, 90);
            
            // ========== INFORMACIÓN ADICIONAL ==========
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            
            let infoY = 95;
            
            // Método de pago
            doc.text(`Método de pago: ${compraData.tipo_pago || 'No especificado'}`, 20, infoY);
            
            // Usuario que registró
            if (compraData.usuario_nombre) {
                doc.text(`Registrado por: ${compraData.usuario_nombre}`, 120, infoY);
            }
            
            infoY += 10;
            
            // Observaciones
            if (compraData.observaciones) {
                doc.setFont(undefined, 'bold');
                doc.text('Observaciones:', 20, infoY);
                doc.setFont(undefined, 'normal');
                
                // Dividir observaciones largas en múltiples líneas
                const observaciones = compraData.observaciones;
                const maxLength = 80;
                let observacionesY = infoY + 5;
                
                for (let i = 0; i < observaciones.length; i += maxLength) {
                    const chunk = observaciones.substring(i, i + maxLength);
                    doc.text(chunk, 25, observacionesY);
                    observacionesY += 5;
                }
                
                infoY = observacionesY + 5;
            } else {
                infoY += 5;
            }
            
            // ========== TABLA DE PRODUCTOS ==========
            let y = infoY + 10;
            
            // Encabezado de la tabla
            doc.setFontSize(11);
            doc.setTextColor(255, 255, 255);
            doc.setFillColor(0, 102, 51);
            doc.rect(20, y - 5, 170, 7, 'F');
            
            doc.text('No.', 25, y);
            doc.text('Producto', 35, y);
            doc.text('Descripción', 80, y);
            doc.text('Cant.', 130, y);
            doc.text('P. Unit.', 145, y);
            doc.text('Subtotal', 170, y);
            
            y += 10;
            doc.setTextColor(0, 0, 0);
            
            // Productos
            const productos = compraData.productos || [];
            let totalGeneral = 0;
            
            productos.forEach((producto, index) => {
                // Fondo alternado para mejor lectura
                if (index % 2 === 0) {
                    doc.setFillColor(240, 248, 240);
                    doc.rect(20, y - 2, 170, 7, 'F');
                }
                
                doc.setFontSize(9);
                
                // Número
                doc.text(`${index + 1}.`, 25, y);
                
                // Nombre del producto
                const nombre = producto.nombre || 'Producto';
                const nombreCorto = nombre.length > 30 ? nombre.substring(0, 27) + '...' : nombre;
                doc.text(nombreCorto, 35, y);
                
                // Descripción (abreviada)
                const descripcion = producto.descripcion || '';
                const descCorto = descripcion.length > 25 ? descripcion.substring(0, 22) + '...' : descripcion;
                doc.text(descCorto, 80, y);
                
                // Cantidad
                doc.text(producto.cantidad.toString(), 130, y);
                
                // Precio unitario
                const precioUnitario = producto.precio_unitario || producto.precio || 0;
                doc.text(`Bs ${precioUnitario.toFixed(2)}`, 145, y);
                
                // Subtotal
                const subtotal = producto.subtotal || (producto.cantidad * precioUnitario);
                doc.text(`Bs ${subtotal.toFixed(2)}`, 170, y);
                
                totalGeneral += subtotal;
                y += 7;
                
                // Si hay muchos productos, crear nueva página
                if (y > 250 && index < productos.length - 1) {
                    doc.addPage();
                    y = 20;
                    
                    // Repetir encabezado en nueva página
                    doc.setFontSize(11);
                    doc.setTextColor(255, 255, 255);
                    doc.setFillColor(0, 102, 51);
                    doc.rect(20, y - 5, 170, 7, 'F');
                    
                    doc.text('No.', 25, y);
                    doc.text('Producto', 35, y);
                    doc.text('Descripción', 80, y);
                    doc.text('Cant.', 130, y);
                    doc.text('P. Unit.', 145, y);
                    doc.text('Subtotal', 170, y);
                    
                    y += 10;
                    doc.setTextColor(0, 0, 0);
                    doc.setFontSize(9);
                }
            });
            
            // ========== TOTALES Y RESUMEN ==========
            y += 10;
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.line(140, y, 190, y);
            
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text('RESUMEN:', 20, y + 10);
            doc.setFont(undefined, 'normal');
            
            doc.text(`Total productos: ${productos.length}`, 25, y + 20);
            doc.text(`Total unidades: ${productos.reduce((sum, p) => sum + (p.cantidad || 0), 0)}`, 25, y + 25);
            
            doc.setFont(undefined, 'bold');
            doc.text('TOTAL COMPRA:', 140, y + 20);
            doc.text(`Bs ${(compraData.total || totalGeneral).toFixed(2)}`, 170, y + 20);
            
            // ========== PIE DE PÁGINA ==========
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            
            const pieY = y + 40;
            doc.text('Comprobante de ingreso de inventario', 105, pieY, { align: 'center' });
            doc.text('Documento interno de la empresa', 105, pieY + 5, { align: 'center' });
            doc.text(`Generado el: ${new Date().toLocaleString()}`, 105, pieY + 10, { align: 'center' });
            
            // Firmas
            const firmaY = pieY + 25;
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.line(30, firmaY, 80, firmaY); // Firma responsable de compras
            doc.line(120, firmaY, 170, firmaY); // Firma proveedor
            
            doc.setFontSize(8);
            doc.text('Responsable de Compras', 55, firmaY + 5, { align: 'center' });
            doc.text('Proveedor / Representante', 145, firmaY + 5, { align: 'center' });
            
            // ========== GUARDAR PDF ==========
            const fileName = `compra-${compraData.id_compra || Date.now()}-${compraData.proveedor_nombre || 'proveedor'}.pdf`;
            doc.save(fileName);
            
            console.log("✅ PDF de compra generado:", fileName);
            return fileName;
            
        } catch (error) {
            console.error("❌ Error generando PDF de compra:", error);
            return null;
        }
    }

    // ========== REPORTE DE VENTAS (Multiple ventas) ==========
    static generarReporteVentas(reporteData) {
        try {
            console.log('📈 Generando reporte de ventas:', reporteData);
            
            // Validar datos
            if (!reporteData.ventas || !Array.isArray(reporteData.ventas)) {
                console.error('❌ Datos de ventas inválidos');
                throw new Error('Datos de ventas inválidos');
            }
            
            const doc = new jsPDF();
            
            // ========== CABECERA DEL REPORTE ==========
            doc.setFontSize(20);
            doc.setTextColor(0, 51, 153); // Azul corporativo
            doc.text('REPORTE DE VENTAS', 105, 20, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Período: ${reporteData.periodo || 'No especificado'}`, 20, 35);
            doc.text(`Vendedor: ${reporteData.vendedor || 'Todos'}`, 110, 35);
            doc.text(`Fecha: ${new Date(reporteData.fecha_generacion || Date.now()).toLocaleDateString()}`, 160, 35);
            doc.text(`Hora: ${new Date(reporteData.fecha_generacion || Date.now()).toLocaleTimeString()}`, 160, 40);
            
            // ========== RESUMEN ESTADÍSTICO ==========
            doc.setFontSize(12);
            doc.setTextColor(0, 51, 153);
            doc.text('RESUMEN DEL PERÍODO', 20, 55);
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Total de ventas: ${reporteData.ventas.length || 0}`, 20, 65);
            doc.text(`Total ingresos: Bs ${reporteData.totales?.total?.toFixed(2) || '0.00'}`, 20, 70);
            doc.text(`Promedio por venta: Bs ${reporteData.totales?.promedio?.toFixed(2) || '0.00'}`, 20, 75);
            doc.text(`Ventas por vendedor: ${reporteData.ventas_por_vendedor || 'No disponible'}`, 20, 80);
            
            // Línea separadora
            doc.setDrawColor(200, 200, 200);
            doc.line(20, 85, 190, 85);
            
            // ========== TABLA DE VENTAS ==========
            let y = 95;
            
            // Encabezado de la tabla
            doc.setFontSize(11);
            doc.setTextColor(255, 255, 255);
            doc.setFillColor(0, 51, 153);
            doc.rect(20, y - 5, 170, 7, 'F');
            
            doc.text('ID', 25, y);
            doc.text('Fecha', 45, y);
            doc.text('Cliente', 75, y);
            doc.text('Vendedor', 120, y);
            doc.text('Total', 160, y);
            doc.text('Estado', 180, y);
            
            y += 10;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(9);
            
            // Ventas individuales
            reporteData.ventas.forEach((venta, index) => {
                // Fondo alternado para mejor lectura
                if (index % 2 === 0) {
                    doc.setFillColor(240, 240, 240);
                    doc.rect(20, y - 2, 170, 6, 'F');
                }
                
                // ID
                doc.text(`#${venta.id_pedido || index + 1}`, 25, y);
                
                // Fecha (formato corto)
                const fecha = venta.fecha ? new Date(venta.fecha).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit'
                }) : '--/--';
                doc.text(fecha, 45, y);
                
                // Cliente (nombre abreviado)
                const cliente = venta.cliente_nombre || 'Cliente';
                const clienteCorto = cliente.length > 15 ? cliente.substring(0, 12) + '...' : cliente;
                doc.text(clienteCorto, 75, y);
                
                // Vendedor
                const vendedor = venta.vendedor_nombre || venta.usuario_nombre || '--';
                const vendedorCorto = vendedor.length > 12 ? vendedor.substring(0, 9) + '...' : vendedor;
                doc.text(vendedorCorto, 120, y);
                
                // Total
                doc.text(`Bs ${(venta.total || 0).toFixed(2)}`, 160, y);
                
                // Estado con color
                const estado = venta.estado || 'completado';
                let estadoColor;
                if (estado === 'completado') estadoColor = [0, 150, 0]; // Verde
                else if (estado === 'pendiente') estadoColor = [255, 165, 0]; // Naranja
                else estadoColor = [255, 0, 0]; // Rojo
                
                doc.setTextColor(...estadoColor);
                doc.text(estado.charAt(0).toUpperCase(), 180, y);
                doc.setTextColor(0, 0, 0);
                
                y += 6;
                
                // Si hay muchas ventas, crear nueva página
                if (y > 250 && index < reporteData.ventas.length - 1) {
                    doc.addPage();
                    y = 20;
                    
                    // Encabezado de la tabla en nueva página
                    doc.setFontSize(11);
                    doc.setTextColor(255, 255, 255);
                    doc.setFillColor(0, 51, 153);
                    doc.rect(20, y - 5, 170, 7, 'F');
                    
                    doc.text('ID', 25, y);
                    doc.text('Fecha', 45, y);
                    doc.text('Cliente', 75, y);
                    doc.text('Vendedor', 120, y);
                    doc.text('Total', 160, y);
                    doc.text('Estado', 180, y);
                    
                    y += 10;
                    doc.setTextColor(0, 0, 0);
                    doc.setFontSize(9);
                }
            });
            
            // ========== GRÁFICO DE BARRAS SIMULADO (opcional) ==========
            y += 10;
            doc.setFontSize(12);
            doc.setTextColor(0, 51, 153);
            doc.text('DISTRIBUCIÓN POR MÉTODO DE PAGO', 105, y, { align: 'center' });
            
            y += 10;
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            
            // Agrupar por método de pago
            const metodosPago = {};
            reporteData.ventas.forEach(venta => {
                const metodo = venta.metodo_pago || 'efectivo';
                metodosPago[metodo] = (metodosPago[metodo] || 0) + 1;
            });
            
            Object.entries(metodosPago).forEach(([metodo, cantidad], index) => {
                const x = 30 + (index * 40);
                const altura = Math.min(cantidad * 3, 30);
                
                // Barra
                doc.setFillColor(70, 130, 180);
                doc.rect(x, y + 20 - altura, 20, altura, 'F');
                
                // Etiqueta
                doc.text(metodo.charAt(0).toUpperCase(), x + 8, y + 25);
                doc.text(cantidad.toString(), x + 8, y + 35);
                
                doc.text(metodo, x, y + 45);
            });
            
            y += 60;
            
            // ========== OBSERVACIONES ==========
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text('Observaciones:', 20, y);
            doc.text('• Reporte generado automáticamente por el sistema', 20, y + 6);
            doc.text('• Los montos están expresados en Bolivianos (Bs)', 20, y + 12);
            doc.text('• Consultas: administracion@empresa.com', 20, y + 18);
            
            // ========== GUARDAR PDF ==========
            const fileName = `reporte-ventas-${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(fileName);
            
            console.log("✅ Reporte de ventas generado:", fileName);
            return fileName;
            
        } catch (error) {
            console.error("❌ Error generando reporte de ventas:", error);
            return null;
        }
    }
}

export default PdfService;