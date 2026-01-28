// src/services/pdfService.js
import { jsPDF } from 'jspdf';

class PdfService {
    // ========== COMPROBANTE DE VENTA ==========
    static generarComprobanteVenta(ventaData) {
        try {
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
            ventaData.productos.forEach((producto, index) => {
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
            console.log("📄 Generando PDF de compra...", compraData);
            
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
            
            // ========== INFORMACIÓN EMPRESA ==========
            doc.setFontSize(12);
            doc.setTextColor(0, 102, 51);
            doc.text('EMPRESA COMPRADORA:', 20, 55);
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(compraData.empresa_nombre || 'Mi Microempresa', 20, 60);
            doc.text(`NIT: ${compraData.empresa_nit || '123456789'}`, 20, 65);
            doc.text(`Dirección: ${compraData.empresa_direccion || 'Av. Principal #123'}`, 20, 70);
            doc.text(`Teléfono: ${compraData.empresa_telefono || '+591 70000000'}`, 20, 75);
            
            // ========== INFORMACIÓN PROVEEDOR ==========
            doc.setFontSize(12);
            doc.setTextColor(0, 102, 51);
            doc.text('PROVEEDOR:', 120, 55);
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(compraData.proveedor_nombre || 'Proveedor General', 120, 60);
            
            let proveedorY = 65;
            if (compraData.proveedor_nit) {
                doc.text(`NIT: ${compraData.proveedor_nit}`, 120, proveedorY);
                proveedorY += 5;
            }
            if (compraData.proveedor_telefono) {
                doc.text(`Tel: ${compraData.proveedor_telefono}`, 120, proveedorY);
                proveedorY += 5;
            }
            if (compraData.proveedor_email) {
                doc.text(`Email: ${compraData.proveedor_email}`, 120, proveedorY);
                proveedorY += 5;
            }
            if (compraData.proveedor_direccion) {
                doc.text(`Dirección: ${compraData.proveedor_direccion}`, 120, proveedorY);
            }
            
            // Línea separadora
            doc.setDrawColor(200, 200, 200);
            doc.line(20, 90, 190, 90);
            
            // ========== TABLA DE PRODUCTOS ==========
            let y = 100;
            
            // Encabezado de la tabla
            doc.setFontSize(11);
            doc.setTextColor(255, 255, 255);
            doc.setFillColor(0, 102, 51);
            doc.rect(20, y - 5, 170, 7, 'F');
            
            doc.text('Producto', 25, y);
            doc.text('Proveedor', 80, y);
            doc.text('Cant.', 140, y);
            doc.text('Precio', 150, y);
            doc.text('Subtotal', 170, y);
            
            y += 10;
            doc.setTextColor(0, 0, 0);
            
            // Productos
            let totalGeneral = 0;
            compraData.productos.forEach((producto, index) => {
                // Fondo alternado para mejor lectura
                if (index % 2 === 0) {
                    doc.setFillColor(240, 248, 240);
                    doc.rect(20, y - 2, 170, 7, 'F');
                }
                
                doc.setFontSize(10);
                
                // Nombre del producto
                const nombre = producto.nombre || 'Producto';
                const nombreCorto = nombre.length > 25 ? nombre.substring(0, 22) + '...' : nombre;
                doc.text(`${index + 1}. ${nombreCorto}`, 25, y);
                
                // Proveedor
                const proveedor = producto.proveedor || compraData.proveedor_nombre || 'Proveedor';
                const proveedorCorto = proveedor.length > 20 ? proveedor.substring(0, 17) + '...' : proveedor;
                doc.text(proveedorCorto, 80, y);
                
                // Cantidad
                doc.text(producto.cantidad.toString(), 140, y);
                
                // Precio unitario
                const precioUnitario = producto.precio_unitario || producto.precio || 0;
                doc.text(`Bs ${precioUnitario.toFixed(2)}`, 150, y);
                
                // Subtotal
                const subtotal = producto.subtotal || (producto.cantidad * precioUnitario);
                doc.text(`Bs ${subtotal.toFixed(2)}`, 170, y);
                
                totalGeneral += subtotal;
                y += 7;
                
                // Si hay muchos productos, crear nueva página
                if (y > 250 && index < compraData.productos.length - 1) {
                    doc.addPage();
                    y = 20;
                }
            });
            
            // Línea de total
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.line(140, y + 5, 190, y + 5);
            
            // ========== INFORMACIÓN ADICIONAL ==========
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            
            // Método de pago
            doc.text(`Método de pago: ${compraData.tipo_pago || 'No especificado'}`, 20, y + 15);
            
            // Observaciones
            if (compraData.observaciones) {
                doc.text(`Observaciones: ${compraData.observaciones}`, 20, y + 20);
                y += 10;
            }
            
            // Estado
            doc.text(`Estado: ${compraData.estado || 'Completada'}`, 20, y + 25);
            
            // ========== TOTALES ==========
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('TOTAL COMPRA:', 140, y + 35);
            doc.text(`Bs ${(compraData.total || totalGeneral).toFixed(2)}`, 170, y + 35);
            
            // ========== PIE DE PÁGINA ==========
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('Comprobante de ingreso de inventario', 105, y + 50, { align: 'center' });
            doc.text('Documento interno de la empresa', 105, y + 55, { align: 'center' });
            
            // Firmas
            const firmaY = y + 70;
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.line(30, firmaY, 80, firmaY);
            doc.line(120, firmaY, 170, firmaY);
            
            doc.setFontSize(8);
            doc.text('Responsable de Compras', 55, firmaY + 5, { align: 'center' });
            doc.text('Recibido por', 145, firmaY + 5, { align: 'center' });
            
            // Usuario que registró
            if (compraData.usuario_nombre) {
                doc.text(`Registrado por: ${compraData.usuario_nombre}`, 20, firmaY + 15);
            }
            
            // ========== GUARDAR PDF ==========
            const fileName = `compra-${compraData.id_compra || Date.now()}.pdf`;
            doc.save(fileName);
            
            console.log("✅ PDF de compra generado:", fileName);
            return fileName;
            
        } catch (error) {
            console.error("❌ Error generando PDF de compra:", error);
            return null;
        }
    }
}

export default PdfService;