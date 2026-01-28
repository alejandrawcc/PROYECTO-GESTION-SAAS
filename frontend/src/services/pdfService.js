import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

class PdfService {
    /**
     * Genera un comprobante de venta en PDF
     */
    static async generarComprobanteVenta(ventaData) {
        return new Promise((resolve, reject) => {
            try {
                // Crear documento PDF
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const margin = 20;
                let yPos = margin;

                // Configuración de estilos
                pdf.setFontSize(12);
                pdf.setFont("helvetica", "normal");

                // ===== ENCABEZADO =====
                pdf.setFontSize(22);
                pdf.setTextColor(0, 102, 204); // Azul
                pdf.text("COMPROBANTE DE VENTA", pageWidth / 2, yPos, { align: 'center' });
                yPos += 10;

                pdf.setFontSize(14);
                pdf.setTextColor(0, 0, 0); // Negro
                pdf.text(`No. ${ventaData.pedido_id || '00001'}`, pageWidth / 2, yPos, { align: 'center' });
                yPos += 15;

                // Fecha
                pdf.setFontSize(10);
                pdf.text(`Fecha: ${new Date(ventaData.fecha || new Date()).toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
                yPos += 5;

                // Línea separadora
                pdf.setDrawColor(200, 200, 200);
                pdf.line(margin, yPos, pageWidth - margin, yPos);
                yPos += 10;

                // ===== INFORMACIÓN DE LA EMPRESA =====
                pdf.setFontSize(12);
                pdf.setFont("helvetica", "bold");
                pdf.text("EMPRESA:", margin, yPos);
                pdf.setFont("helvetica", "normal");
                yPos += 7;

                pdf.text(ventaData.empresa_nombre || "Microempresa", margin + 10, yPos);
                if (ventaData.empresa_nit) {
                    yPos += 6;
                    pdf.text(`NIT: ${ventaData.empresa_nit}`, margin + 10, yPos);
                }
                if (ventaData.empresa_direccion) {
                    yPos += 6;
                    pdf.text(`Dirección: ${ventaData.empresa_direccion}`, margin + 10, yPos);
                }
                if (ventaData.empresa_telefono) {
                    yPos += 6;
                    pdf.text(`Teléfono: ${ventaData.empresa_telefono}`, margin + 10, yPos);
                }
                yPos += 10;

                // ===== INFORMACIÓN DEL CLIENTE =====
                pdf.setFont("helvetica", "bold");
                pdf.text("CLIENTE:", margin, yPos);
                pdf.setFont("helvetica", "normal");
                yPos += 7;

                pdf.text(ventaData.cliente_nombre || "Cliente no registrado", margin + 10, yPos);
                if (ventaData.cliente_ci) {
                    yPos += 6;
                    pdf.text(`CI/NIT: ${ventaData.cliente_ci}`, margin + 10, yPos);
                }
                if (ventaData.cliente_email) {
                    yPos += 6;
                    pdf.text(`Email: ${ventaData.cliente_email}`, margin + 10, yPos);
                }
                if (ventaData.cliente_telefono) {
                    yPos += 6;
                    pdf.text(`Teléfono: ${ventaData.cliente_telefono}`, margin + 10, yPos);
                }
                yPos += 15;

                // ===== TABLA DE PRODUCTOS =====
                // Encabezado de la tabla
                pdf.setFont("helvetica", "bold");
                pdf.setFillColor(240, 240, 240);
                pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
                
                pdf.text("Cant.", margin + 5, yPos + 6);
                pdf.text("Descripción", margin + 25, yPos + 6);
                pdf.text("P. Unit.", margin + 120, yPos + 6);
                pdf.text("Subtotal", pageWidth - margin - 25, yPos + 6, { align: 'right' });
                
                yPos += 10;

                // Productos
                pdf.setFont("helvetica", "normal");
                let totalProductos = 0;
                
                if (ventaData.productos && Array.isArray(ventaData.productos)) {
                    ventaData.productos.forEach((producto, index) => {
                        // Verificar si necesitamos nueva página
                        if (yPos > pageHeight - 40) {
                            pdf.addPage();
                            yPos = margin;
                        }

                        const subtotal = producto.cantidad * producto.precio_unitario;
                        totalProductos += subtotal;

                        pdf.text(`${producto.cantidad}`, margin + 5, yPos);
                        
                        // Descripción (con ajuste de texto largo)
                        let descripcion = producto.nombre || "Producto";
                        if (descripcion.length > 40) {
                            descripcion = descripcion.substring(0, 37) + "...";
                        }
                        pdf.text(descripcion, margin + 25, yPos);
                        
                        pdf.text(`Bs ${producto.precio_unitario.toFixed(2)}`, margin + 120, yPos);
                        pdf.text(`Bs ${subtotal.toFixed(2)}`, pageWidth - margin - 5, yPos, { align: 'right' });
                        
                        yPos += 7;
                    });
                }

                yPos += 10;

                // ===== TOTALES =====
                // Línea separadora
                pdf.setDrawColor(0, 0, 0);
                pdf.line(pageWidth - 100, yPos, pageWidth - margin, yPos);
                yPos += 8;

                // Total
                pdf.setFont("helvetica", "bold");
                pdf.text("TOTAL:", pageWidth - 80, yPos);
                pdf.text(`Bs ${ventaData.total.toFixed(2)}`, pageWidth - margin - 5, yPos, { align: 'right' });
                yPos += 8;

                // Método de pago
                pdf.setFont("helvetica", "normal");
                pdf.text(`Método de pago: ${ventaData.metodo_pago || 'Efectivo'}`, pageWidth - margin - 5, yPos, { align: 'right' });
                yPos += 10;

                // ===== OBSERVACIONES =====
                pdf.setFont("helvetica", "bold");
                pdf.text("Observaciones:", margin, yPos);
                yPos += 7;
                pdf.setFont("helvetica", "normal");
                pdf.text(ventaData.observaciones || "Gracias por su compra. No se aceptan devoluciones.", margin, yPos, { maxWidth: pageWidth - 2 * margin });
                yPos += 15;

                // ===== PIE DE PÁGINA =====
                pdf.setFontSize(9);
                pdf.setTextColor(128, 128, 128);
                pdf.text("________________________________", pageWidth / 2, yPos, { align: 'center' });
                yPos += 5;
                pdf.text("Firma del Cliente", pageWidth / 2, yPos, { align: 'center' });
                yPos += 10;

                pdf.text("________________________________", margin + 40, yPos);
                pdf.text("Firma del Vendedor", margin + 40, yPos + 5);
                yPos += 15;

                pdf.text("Documento generado electrónicamente", pageWidth / 2, pageHeight - 10, { align: 'center' });

                // Guardar PDF
                const fileName = `comprobante_${ventaData.pedido_id || Date.now()}.pdf`;
                pdf.save(fileName);

                resolve(fileName);
            } catch (error) {
                console.error('Error generando PDF:', error);
                reject(error);
            }
        });
    }

    // Agregar este método a la clase PdfService
    static async generarReporteCompra(compraData) {
        return new Promise((resolve, reject) => {
            try {
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const margin = 15;
                let yPos = margin;

                // Validar datos básicos
                if (!compraData) {
                    throw new Error('No se recibieron datos de la compra');
                }

                // Título
                pdf.setFontSize(18);
                pdf.setFont("helvetica", "bold");
                pdf.text("REPORTE DE COMPRA", pageWidth / 2, yPos, { align: 'center' });
                yPos += 8;

                pdf.setFontSize(12);
                pdf.text(`N° ${compraData.id_compra || 'N/A'}`, pageWidth / 2, yPos, { align: 'center' });
                yPos += 15;

                // Información de la empresa
                pdf.setFontSize(12);
                pdf.setFont("helvetica", "bold");
                pdf.text("EMPRESA:", margin, yPos);
                pdf.setFont("helvetica", "normal");
                yPos += 7;

                pdf.text(compraData.empresa_nombre || "Microempresa", margin + 10, yPos);
                if (compraData.empresa_nit) {
                    yPos += 6;
                    pdf.text(`NIT: ${compraData.empresa_nit}`, margin + 10, yPos);
                }
                if (compraData.empresa_direccion) {
                    yPos += 6;
                    pdf.text(`Dirección: ${compraData.empresa_direccion}`, margin + 10, yPos);
                }
                if (compraData.empresa_telefono) {
                    yPos += 6;
                    pdf.text(`Teléfono: ${compraData.empresa_telefono}`, margin + 10, yPos);
                }
                yPos += 10;

                // Fecha y estado
                const fecha = compraData.fecha ? new Date(compraData.fecha).toLocaleDateString() : 'N/A';
                pdf.text(`Fecha: ${fecha}`, margin, yPos);
                yPos += 6;
                pdf.text(`Estado: ${compraData.estado || 'N/A'}`, margin, yPos);
                yPos += 15;

                // Tabla de productos
                pdf.setFont("helvetica", "bold");
                pdf.setFillColor(240, 240, 240);
                pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
                
                pdf.text("Cant.", margin + 5, yPos + 6);
                pdf.text("Producto", margin + 25, yPos + 6);
                pdf.text("Proveedor", margin + 90, yPos + 6);
                pdf.text("P. Unit.", margin + 135, yPos + 6);
                pdf.text("Subtotal", pageWidth - margin - 5, yPos + 6, { align: 'right' });
                
                yPos += 12;

                // Productos
                pdf.setFont("helvetica", "normal");
                let totalCalculado = 0;
                
                if (compraData.productos && Array.isArray(compraData.productos) && compraData.productos.length > 0) {
                    compraData.productos.forEach(producto => {
                        if (yPos > pageHeight - 40) {
                            pdf.addPage();
                            yPos = margin;
                        }

                        // Validar y obtener valores seguros
                        const cantidad = producto.cantidad || 0;
                        const precioUnitario = parseFloat(producto.precio_unitario) || 0;
                        const subtotal = parseFloat(producto.subtotal) || (cantidad * precioUnitario);
                        
                        totalCalculado += subtotal;

                        pdf.text(`${cantidad}`, margin + 5, yPos);
                        
                        // Truncar texto largo
                        const nombreProducto = (producto.nombre || 'Producto').substring(0, 30);
                        const nombreProveedor = (producto.proveedor || 'N/A').substring(0, 20);
                        
                        pdf.text(nombreProducto, margin + 25, yPos);
                        pdf.text(nombreProveedor, margin + 90, yPos);
                        pdf.text(`Bs ${precioUnitario.toFixed(2)}`, margin + 135, yPos);
                        pdf.text(`Bs ${subtotal.toFixed(2)}`, pageWidth - margin - 5, yPos, { align: 'right' });
                        
                        yPos += 7;
                    });
                } else {
                    pdf.text("No hay productos en esta compra", margin + 25, yPos);
                    yPos += 7;
                }

                yPos += 10;

                // Total
                pdf.setDrawColor(0, 0, 0);
                pdf.line(pageWidth - 100, yPos, pageWidth - margin, yPos);
                yPos += 8;

                // Usar el total de la base de datos o el calculado
                const totalFinal = parseFloat(compraData.total) || totalCalculado;

                pdf.setFont("helvetica", "bold");
                pdf.text("TOTAL:", pageWidth - 80, yPos);
                pdf.text(`Bs ${totalFinal.toFixed(2)}`, pageWidth - margin - 5, yPos, { align: 'right' });
                yPos += 15;

                // Pie de página
                pdf.setFontSize(9);
                pdf.setTextColor(128, 128, 128);
                pdf.text("Documento generado electrónicamente", pageWidth / 2, pageHeight - 10, { align: 'center' });

                // Guardar PDF
                const fileName = `compra_${compraData.id_compra || Date.now()}.pdf`;
                pdf.save(fileName);

                resolve(fileName);
            } catch (error) {
                console.error('Error generando PDF de compra:', error);
                reject(error);
            }
        });
    }
    /**
     * Genera PDF desde un elemento HTML (para plantillas más complejas)
     */
    static async generarPDFDesdeHTML(elementId, fileName = 'comprobante.pdf') {
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error(`Elemento con ID ${elementId} no encontrado`);
        }

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // Calcular dimensiones para que la imagen se ajuste a la página
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = imgWidth / imgHeight;
            const pdfWidth = pageWidth - 20;
            const pdfHeight = pdfWidth / ratio;

            // Agregar imagen al PDF
            pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth, pdfHeight);
            pdf.save(fileName);

            return fileName;
        } catch (error) {
            console.error('Error generando PDF desde HTML:', error);
            throw error;
        }
    }

    /**
     * Genera una factura más formal
     */
    static async generarFactura(ventaData) {
        // Similar a generarComprobanteVenta pero con más detalles fiscales
        return this.generarComprobanteVenta({
            ...ventaData,
            tipo: 'FACTURA',
            leyenda: `FACTURA LEGAL N° ${ventaData.pedido_id}`
        });
    }
}

export default PdfService;