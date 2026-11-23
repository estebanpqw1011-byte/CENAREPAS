import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

/**
 * Helper to safely extract a value from an object using a key or dot-notation path.
 */
function getValueByPath(obj, path) {
  if (!path || !obj) return '';
  const keys = path.split('.');
  let current = obj;
  for (const k of keys) {
    if (current === undefined || current === null) return '';
    current = current[k];
  }
  return current ?? '';
}

/**
 * Formats a value for display in PDF tables.
 */
function formatCellValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Activo' : 'Inactivo';
  if (typeof value === 'number') return String(value);
  return String(value);
}

/**
 * Exports data to a formatted PDF document with CENAREPAS branding.
 * 
 * @param {Object} options
 * @param {Array<Object>} options.data - The array of items to export (already filtered)
 * @param {Array<{ header: string, key?: string, accessor?: (item: any) => any }>} options.columns - Column definitions
 * @param {string} options.title - Report title (e.g. "Reporte de Usuarios")
 * @param {string} [options.subtitle] - Optional subtitle
 * @param {string} [options.filename] - Custom filename (defaults to {title}_{date}.pdf)
 * @param {'portrait'|'landscape'} [options.orientation] - Page orientation
 */
export function exportToPdf({
  data = [],
  columns = [],
  title = 'Reporte',
  subtitle = '',
  filename,
  orientation,
}) {
  try {
    if (!data || data.length === 0) {
      toast.warning('No hay datos disponibles para exportar con los filtros actuales');
    }

    // Auto-detect orientation if not explicitly specified
    const autoOrientation = orientation || (columns.length > 6 ? 'landscape' : 'portrait');
    const doc = new jsPDF({
      orientation: autoOrientation,
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const formattedTime = now.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // 1. Brand Top Bar
    doc.setFillColor(193, 80, 45); // Terracota #C1502D
    doc.rect(0, 0, pageWidth, 5, 'F');

    // 2. Header Section
    // Brand Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(193, 80, 45);
    doc.text('CENAREPAS', 14, 15);

    // Company Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Sistema de Gestión y Control de Producción', 14, 20);

    // Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(title.toUpperCase(), 14, 28);

    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(subtitle, 14, 33);
    }

    // Right Metadata Box
    const metaX = pageWidth - 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha: ${formattedDate} ${formattedTime}`, metaX, 15, { align: 'right' });
    doc.text(`Total registros: ${data.length}`, metaX, 20, { align: 'right' });

    // Divider line
    const startY = subtitle ? 36 : 32;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(14, startY, pageWidth - 14, startY);

    // 3. Prepare Table Data
    const headers = [columns.map((c) => c.header || c.key || 'Columna')];
    const rows = data.map((item) =>
      columns.map((col) => {
        try {
          if (typeof col.accessor === 'function') {
            return formatCellValue(col.accessor(item));
          }
          if (col.key) {
            return formatCellValue(getValueByPath(item, col.key));
          }
        } catch {
          return '';
        }
        return '';
      })
    );

    // 4. Generate AutoTable
    autoTable(doc, {
      head: headers,
      body: rows.length > 0 ? rows : [['Sin registros encontrados con los filtros actuales']],
      startY: startY + 4,
      margin: { left: 14, right: 14, bottom: 18 },
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: [33, 37, 41],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [193, 80, 45],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didDrawPage: (hookData) => {
        // Footer on every page
        const pageNumber = hookData.pageNumber;
        const totalPages = doc.internal.getNumberOfPages();

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);

        // Left Footer
        doc.text('CENAREPAS © - Documento generado automáticamente', 14, pageHeight - 8);

        // Right Footer
        doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 14, pageHeight - 8, {
          align: 'right',
        });
      },
    });

    // 5. Save Document
    const dateSlug = now.toISOString().split('T')[0];
    const defaultName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${dateSlug}.pdf`;
    const finalFilename = filename || defaultName;

    doc.save(finalFilename);
    toast.success(`PDF exportado: ${finalFilename}`);
  } catch (error) {
    console.error('Error al exportar a PDF:', error);
    toast.error('Ocurrió un error al generar el archivo PDF');
  }
}
