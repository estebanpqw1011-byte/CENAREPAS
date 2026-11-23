import ExcelJS from 'exceljs';
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
 * Formats a value for display in Excel cells.
 */
function formatCellValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Activo' : 'Inactivo';
  return value;
}

/**
 * Exports data to a beautifully formatted Excel (.xlsx) workbook with CENAREPAS branding and palette.
 *
 * @param {Object} options
 * @param {Array<Object>} options.data - The array of items to export (already filtered)
 * @param {Array<{ header: string, key?: string, accessor?: (item: any) => any, align?: 'left'|'center'|'right' }>} options.columns - Column definitions
 * @param {string} [options.title] - Report title (e.g. "Reporte de Usuarios")
 * @param {string} [options.subtitle] - Optional subtitle
 * @param {string} [options.sheetName] - Name of the Excel worksheet (max 31 chars)
 * @param {string} [options.filename] - Custom filename (defaults to {sheetName}_{date}.xlsx)
 */
export async function exportToExcel({
  data = [],
  columns = [],
  title = 'Reporte',
  subtitle = '',
  sheetName = 'Datos',
  filename,
}) {
  try {
    if (!data || data.length === 0) {
      toast.warning('No hay datos disponibles para exportar con los filtros actuales');
    }

    const numCols = Math.max(columns.length, 1);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CENAREPAS';
    workbook.lastModifiedBy = 'CENAREPAS';
    workbook.created = new Date();
    workbook.modified = new Date();

    const cleanSheetName = (sheetName || title || 'Datos').substring(0, 31).replace(/[:\\/?*\[\]]/g, '_');
    const worksheet = workbook.addWorksheet(cleanSheetName, {
      views: [{ showGridLines: true }],
    });

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

    // 1. Top Decorative Brand Bar (Row 1)
    const topBarRow = worksheet.addRow([]);
    topBarRow.height = 6;
    for (let c = 1; c <= numCols; c++) {
      const cell = topBarRow.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC1502D' }, // Terracota CENAREPAS
      };
    }

    // 2. Brand Name & System Subtitle (Row 2 & 3)
    worksheet.mergeCells(2, 1, 2, numCols);
    const brandCell = worksheet.getCell(2, 1);
    brandCell.value = 'CENAREPAS';
    brandCell.font = {
      name: 'Segoe UI',
      size: 16,
      bold: true,
      color: { argb: 'FFC1502D' },
    };
    brandCell.alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(2).height = 24;

    worksheet.mergeCells(3, 1, 3, numCols);
    const subBrandCell = worksheet.getCell(3, 1);
    subBrandCell.value = 'Sistema de Gestión y Control de Producción';
    subBrandCell.font = {
      name: 'Segoe UI',
      size: 9.5,
      italic: true,
      color: { argb: 'FF64748B' },
    };
    subBrandCell.alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(3).height = 16;

    // 3. Document Title (Row 4)
    worksheet.mergeCells(4, 1, 4, numCols);
    const titleCell = worksheet.getCell(4, 1);
    titleCell.value = (title || 'Reporte').toUpperCase();
    titleCell.font = {
      name: 'Segoe UI',
      size: 13,
      bold: true,
      color: { argb: 'FF1E293B' },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(4).height = 20;

    let currentRowIdx = 5;
    if (subtitle) {
      worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, numCols);
      const subtitleCell = worksheet.getCell(currentRowIdx, 1);
      subtitleCell.value = subtitle;
      subtitleCell.font = {
        name: 'Segoe UI',
        size: 9,
        color: { argb: 'FF64748B' },
      };
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' };
      worksheet.getRow(currentRowIdx).height = 16;
      currentRowIdx++;
    }

    // 4. Metadata Box (Date & Total Records) (Row currentRowIdx)
    worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, numCols);
    const metaCell = worksheet.getCell(currentRowIdx, 1);
    metaCell.value = `Generado: ${formattedDate} ${formattedTime}   |   Total de registros: ${data.length}`;
    metaCell.font = {
      name: 'Segoe UI',
      size: 9,
      bold: true,
      color: { argb: 'FF475569' },
    };
    metaCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    metaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    metaCell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
    worksheet.getRow(currentRowIdx).height = 20;
    currentRowIdx++;

    // Spacing row
    worksheet.addRow([]);
    worksheet.getRow(currentRowIdx).height = 8;
    currentRowIdx++;

    // 5. Table Headers (Row currentRowIdx)
    const headerValues = columns.map((c) => c.header || c.key || 'Columna');
    const headerRow = worksheet.addRow(headerValues);
    headerRow.height = 26;

    headerRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC1502D' }, // Terracota CENAREPAS
      };
      cell.font = {
        name: 'Segoe UI',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      const colDef = columns[colNumber - 1];
      cell.alignment = {
        vertical: 'middle',
        horizontal: colDef?.align || 'left',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF8C361D' } },
        bottom: { style: 'medium', color: { argb: 'FF8C361D' } },
        left: { style: 'thin', color: { argb: 'FFD4785C' } },
        right: { style: 'thin', color: { argb: 'FFD4785C' } },
      };
    });
    currentRowIdx++;

    // 6. Table Data Rows with Alternating Colors
    data.forEach((item, rowIdx) => {
      const rowValues = columns.map((col) => {
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
      });

      const dataRow = worksheet.addRow(rowValues);
      dataRow.height = 20;

      const isEven = rowIdx % 2 === 0;
      const rowBgColor = isEven ? 'FFFFFFFF' : 'FFFDFBF7'; // Soft cream alternating

      dataRow.eachCell((cell, colNumber) => {
        cell.font = {
          name: 'Segoe UI',
          size: 9.5,
          color: { argb: 'FF1E293B' },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowBgColor },
        };

        const colDef = columns[colNumber - 1];
        let horizontalAlign = colDef?.align || 'left';

        // Auto-align numbers or currencies
        const rawVal = cell.value;
        if (typeof rawVal === 'number' || (typeof rawVal === 'string' && rawVal.startsWith('$'))) {
          horizontalAlign = colDef?.align || 'right';
        } else if (typeof rawVal === 'string' && rawVal.toLowerCase() === 'activo') {
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF16A34A' } };
        } else if (typeof rawVal === 'string' && rawVal.toLowerCase() === 'inactivo') {
          cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF94A3B8' } };
        }

        cell.alignment = {
          vertical: 'middle',
          horizontal: horizontalAlign,
        };

        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
      currentRowIdx++;
    });

    if (data.length === 0) {
      worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, numCols);
      const emptyCell = worksheet.getCell(currentRowIdx, 1);
      emptyCell.value = 'No se encontraron registros con los filtros seleccionados.';
      emptyCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF94A3B8' } };
      emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(currentRowIdx).height = 24;
      currentRowIdx++;
    }

    // 7. Auto-fit Column Widths
    columns.forEach((col, idx) => {
      const headerLength = String(col.header || col.key || '').length;
      let maxLength = headerLength;

      data.forEach((item) => {
        let val = '';
        try {
          if (typeof col.accessor === 'function') {
            val = String(col.accessor(item) ?? '');
          } else if (col.key) {
            val = String(getValueByPath(item, col.key) ?? '');
          }
        } catch {
          val = '';
        }
        if (val.length > maxLength) {
          maxLength = Math.min(val.length, 45);
        }
      });

      const colLetter = worksheet.getColumn(idx + 1);
      colLetter.width = Math.max(maxLength + 4, 14);
    });

    // 8. Generate Buffer & Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const dateSlug = now.toISOString().split('T')[0];
    const defaultName = `${cleanSheetName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${dateSlug}.xlsx`;
    const finalFilename = filename || defaultName;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    toast.success(`Excel exportado exitosamente: ${finalFilename}`);
  } catch (error) {
    console.error('Error al exportar a Excel:', error);
    toast.error('Ocurrió un error al generar el archivo Excel');
  }
}

export default exportToExcel;
