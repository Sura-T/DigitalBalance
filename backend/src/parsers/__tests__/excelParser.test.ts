import { parseExcel } from '../excelParser';
import * as XLSX from 'xlsx';

describe('Excel Parser', () => {
  test('should parse valid Excel file with PT-PT headers', () => {
    // Create mock Excel data
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Data', 'Fatura', 'Cliente', 'Produto', 'Quantidade', 'Preço', 'Taxa IVA', 'Liquido', 'IVA', 'Total', 'Pagamento'],
      ['01/09/2025', 'FT001', 'Cliente A', 'Produto X', '2', '100,00', '14', '200,00', '28,00', '228,00', 'Cartão Multicaixa'],
      ['02/09/2025', 'FT002', 'Cliente B', 'Produto Y', '1', '50,00', '14', '50,00', '7,00', '57,00', 'Numerário'],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    const result = parseExcel(buffer);
    
    expect(result.sales).toHaveLength(2);
    expect(result.month).toBe('2025-09');
    expect(result.sales[0].customer).toBe('Cliente A');
    expect(result.sales[0].grossAmount).toBeCloseTo(228, 1);
  });

  test('should handle Portuguese decimal comma format', () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Data', 'Total'],
      ['01/09/2025', '1.234,56'],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    const result = parseExcel(buffer);
    
    expect(result.sales[0].grossAmount).toBeCloseTo(1234.56, 2);
  });

  test('should normalize various PT header variations', () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['data', 'Nº Fatura', 'cliente', 'produto', 'qtd', 'p.u.', 'taxa', 'base', 'iva', 'total', 'forma pagamento'],
      ['01/09/2025', 'F001', 'Test', 'Item', '1', '100', '14', '100', '14', '114', 'Cartão'],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    const result = parseExcel(buffer);
    
    expect(result.sales).toHaveLength(1);
    expect(result.sales[0].invoiceNumber).toBe('F001');
    expect(result.sales[0].customer).toBe('Test');
  });

  test('should infer month from most common date', () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Data', 'Total'],
      ['01/09/2025', '100'],
      ['15/09/2025', '200'],
      ['30/09/2025', '300'],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    const result = parseExcel(buffer);
    
    expect(result.month).toBe('2025-09');
  });

  test('should skip empty rows', () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Data', 'Total'],
      ['01/09/2025', '100'],
      ['', ''],
      ['', ''],
      ['02/09/2025', '200'],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    const result = parseExcel(buffer);
    
    expect(result.sales).toHaveLength(2);
  });

  test('should calculate missing VAT and gross amounts', () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Data', 'Liquido', 'Taxa IVA'],
      ['01/09/2025', '100', '14'],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    const result = parseExcel(buffer);
    
    expect(result.sales[0].vatAmount).toBeCloseTo(14, 1);
    expect(result.sales[0].grossAmount).toBeCloseTo(114, 1);
  });
});

