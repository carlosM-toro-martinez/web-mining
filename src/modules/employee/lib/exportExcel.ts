import * as XLSX from "xlsx-js-style";

// Exporta filas planas (objetos con las mismas claves) a un .xlsx de una hoja.
// Los encabezados son las claves del primer objeto.
export function exportRowsToExcel(
  rows: Array<Record<string, string | number>>,
  sheetName: string,
  fileName: string
) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const headers = rows.length > 0 ? Object.keys(rows[0]!) : [];
  worksheet["!cols"] = headers.map((header) => {
    const longest = rows.reduce((max, row) => Math.max(max, String(row[header] ?? "").length), header.length);
    return { wch: Math.min(60, longest + 2) };
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, fileName);
}
