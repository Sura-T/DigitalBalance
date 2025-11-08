import * as XLSX from 'xlsx';
import { parse, isValid } from 'date-fns';

export interface RawSalesRow {
  [key: string]: any;
}

export interface CanonicalSale {
  date: Date;
  invoiceNumber: string;
  customer: string;
  product: string;
  quantity: number;
  unitPriceNet: number;
  vatRate: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  paymentMethod: string;
}

// PT-PT header mappings to canonical fields
const HEADER_MAPPINGS: Record<string, string> = {
  // Date fields
  'data': 'date',
  'Data': 'date',
  'DATA': 'date',
  
  // Invoice
  'fatura': 'invoiceNumber',
  'Fatura': 'invoiceNumber',
  'factura': 'invoiceNumber',
  'Factura': 'invoiceNumber',
  'n° fatura': 'invoiceNumber',
  'N° Fatura': 'invoiceNumber',
  'nº fatura': 'invoiceNumber',
  'Nº Fatura': 'invoiceNumber',
  'numero': 'invoiceNumber',
  'Numero': 'invoiceNumber',
  
  // Customer
  'cliente': 'customer',
  'Cliente': 'customer',
  'CLIENTE': 'customer',
  'nome': 'customer',
  'Nome': 'customer',
  
  // Product
  'produto': 'product',
  'Produto': 'product',
  'PRODUTO': 'product',
  'artigo': 'product',
  'Artigo': 'product',
  'descrição': 'product',
  'Descrição': 'product',
  'descricao': 'product',
  
  // Quantity
  'quantidade': 'quantity',
  'Quantidade': 'quantity',
  'QUANTIDADE': 'quantity',
  'qtd': 'quantity',
  'Qtd': 'quantity',
  'QTD': 'quantity',
  
  // Unit price
  'preço unitário': 'unitPriceNet',
  'Preço Unitário': 'unitPriceNet',
  'preco unitario': 'unitPriceNet',
  'Preco Unitario': 'unitPriceNet',
  'P.U.': 'unitPriceNet',
  'p.u.': 'unitPriceNet',
  'preço': 'unitPriceNet',
  'Preço': 'unitPriceNet',
  'preco': 'unitPriceNet',
  
  // VAT rate
  'taxa iva': 'vatRate',
  'Taxa IVA': 'vatRate',
  'taxa': 'vatRate',
  'Taxa': 'vatRate',
  'IVA %': 'vatRate',
  'iva %': 'vatRate',
  '%IVA': 'vatRate',
  
  // Net amount
  'valor liquido': 'netAmount',
  'Valor Liquido': 'netAmount',
  'valor líquido': 'netAmount',
  'Valor Líquido': 'netAmount',
  'liquido': 'netAmount',
  'Liquido': 'netAmount',
  'Líquido': 'netAmount',
  'base': 'netAmount',
  'Base': 'netAmount',
  
  // VAT amount
  'valor iva': 'vatAmount',
  'Valor IVA': 'vatAmount',
  'IVA': 'vatAmount',
  'iva': 'vatAmount',
  
  // Gross amount
  'valor total': 'grossAmount',
  'Valor Total': 'grossAmount',
  'total': 'grossAmount',
  'Total': 'grossAmount',
  'bruto': 'grossAmount',
  'Bruto': 'grossAmount',
  
  // Payment method
  'pagamento': 'paymentMethod',
  'Pagamento': 'paymentMethod',
  'forma pagamento': 'paymentMethod',
  'Forma Pagamento': 'paymentMethod',
  'metodo': 'paymentMethod',
  'Metodo': 'paymentMethod',
  'método': 'paymentMethod',
  'Método': 'paymentMethod',
};

function normalizeHeaderName(header: string): string {
  if (!header) return '';
  
  // Clean up the header
  const cleaned = header.trim();
  
  // Direct match
  if (HEADER_MAPPINGS[cleaned]) {
    return HEADER_MAPPINGS[cleaned];
  }
  
  // Try case-insensitive match
  const lowerHeader = cleaned.toLowerCase();
  for (const [key, value] of Object.entries(HEADER_MAPPINGS)) {
    if (key.toLowerCase() === lowerHeader) {
      return value;
    }
  }
  
  return cleaned;
}

function parsePortugueseDate(value: any): Date | null {
  if (!value) return null;
  
  // If already a date
  if (value instanceof Date) return value;
  
  // If Excel serial date
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return isValid(date) ? date : null;
  }
  
  // If string, try common PT formats
  if (typeof value === 'string') {
    // Support both single-digit and double-digit days/months
    const formats = [
      'dd/MM/yyyy', 'd/M/yyyy', 'd/MM/yyyy', 'dd/M/yyyy',  // slash separators
      'dd-MM-yyyy', 'd-M-yyyy', 'd-MM-yyyy', 'dd-M-yyyy',  // dash separators
      'dd/MM/yy', 'd/M/yy', 'd/MM/yy', 'dd/M/yy',          // 2-digit year
      'yyyy-MM-dd', 'yyyy-M-d'                              // ISO format
    ];
    for (const format of formats) {
      try {
        const date = parse(value, format, new Date());
        if (isValid(date)) return date;
      } catch {}
    }
  }
  
  return null;
}

function parsePortugueseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Handle PT decimal comma
  const str = String(value).trim();
  const normalized = str
    .replace(/\s/g, '')
    .replace(/\./g, '') // Remove thousand separators
    .replace(',', '.'); // Convert decimal comma to dot
  
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

function extractMonthFromData(sales: CanonicalSale[]): string {
  if (sales.length === 0) return '';
  
  // Get the most common month from dates
  const monthCounts: Record<string, number> = {};
  
  for (const sale of sales) {
    if (sale.date && isValid(sale.date)) {
      const monthKey = `${sale.date.getFullYear()}-${String(sale.date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    }
  }
  
  // Return the month with most occurrences
  let maxCount = 0;
  let detectedMonth = '';
  
  for (const [month, count] of Object.entries(monthCounts)) {
    if (count > maxCount) {
      maxCount = count;
      detectedMonth = month;
    }
  }
  
  return detectedMonth;
}

export interface ExcelParseResult {
  raw: RawSalesRow[];
  normalized: CanonicalSale[];
  month: string;
  fileType: 'sales';
  rowsProcessed: number;
}

export async function parseExcelFile(buffer: Buffer): Promise<ExcelParseResult> {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with raw values
  const rawData: RawSalesRow[] = XLSX.utils.sheet_to_json(sheet, { 
    raw: false,
    defval: null 
  });
  
  // Normalize headers
  const normalized: CanonicalSale[] = [];
  
  for (const row of rawData) {
    // Skip empty rows
    const hasData = Object.values(row).some(v => v !== null && v !== undefined && v !== '');
    if (!hasData) continue;
    
    // Map headers
    const mappedRow: any = {};
    for (const [key, value] of Object.entries(row)) {
      const canonicalKey = normalizeHeaderName(key);
      mappedRow[canonicalKey] = value;
    }
    
    // Parse and validate required fields
    const date = parsePortugueseDate(mappedRow.date);
    if (!date) continue; // Skip rows without valid dates
    
    const quantity = parsePortugueseNumber(mappedRow.quantity);
    const unitPriceNet = parsePortugueseNumber(mappedRow.unitPriceNet);
    const vatRate = parsePortugueseNumber(mappedRow.vatRate);
    let netAmount = parsePortugueseNumber(mappedRow.netAmount);
    let vatAmount = parsePortugueseNumber(mappedRow.vatAmount);
    let grossAmount = parsePortugueseNumber(mappedRow.grossAmount);
    
    // Calculate missing values
    if (netAmount === 0 && quantity > 0 && unitPriceNet > 0) {
      netAmount = quantity * unitPriceNet;
    }
    
    if (vatAmount === 0 && netAmount > 0 && vatRate > 0) {
      vatAmount = netAmount * (vatRate / 100);
    }
    
    if (grossAmount === 0 && netAmount > 0) {
      grossAmount = netAmount + vatAmount;
    }
    
    const sale: CanonicalSale = {
      date,
      invoiceNumber: String(mappedRow.invoiceNumber || '').trim(),
      customer: String(mappedRow.customer || '').trim(),
      product: String(mappedRow.product || '').trim(),
      quantity,
      unitPriceNet,
      vatRate,
      netAmount,
      vatAmount,
      grossAmount,
      paymentMethod: String(mappedRow.paymentMethod || '').trim(),
    };
    
    normalized.push(sale);
  }
  
  const month = extractMonthFromData(normalized);
  
  return {
    raw: rawData,
    normalized,
    month,
    fileType: 'sales',
    rowsProcessed: normalized.length,
  };
}

