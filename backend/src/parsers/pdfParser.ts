import pdfParse from 'pdf-parse';
import { parse, isValid } from 'date-fns';

export interface BankTransactionRaw {
  date: Date;
  description: string;
  debit: number | null;
  credit: number | null;
  balance: number;
  isTPASettlement: boolean;
  isFee: boolean;
  isVATOnFee: boolean;
}

function parsePortugueseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Support both single-digit and double-digit days/months, plus ISO format
  const formats = [
    'yyyy-MM-dd', 'yyyy-M-d',                              // ISO format (bank statements)
    'dd/MM/yyyy', 'd/M/yyyy', 'd/MM/yyyy', 'dd/M/yyyy',  // slash separators
    'dd-MM-yyyy', 'd-M-yyyy', 'd-MM-yyyy', 'dd-M-yyyy',  // dash separators
    'dd/MM/yy', 'd/M/yy', 'd/MM/yy', 'dd/M/yy',          // 2-digit year
  ];
  
  for (const format of formats) {
    try {
      const date = parse(dateStr, format, new Date());
      if (isValid(date)) return date;
    } catch {}
  }
  
  return null;
}

function parsePortugueseNumber(str: string): number {
  if (!str) return 0;
  
  // Remove spaces and normalize
  const normalized = str
    .trim()
    .replace(/\s/g, '')
    .replace(/\./g, '') // Remove thousand separators
    .replace(',', '.'); // Convert decimal comma to dot
  
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

function classifyTransaction(description: string): {
  isTPASettlement: boolean;
  isFee: boolean;
  isVATOnFee: boolean;
} {
  const desc = description.toLowerCase();
  
  // TPA settlements (card payments)
  const isTPASettlement = 
    desc.includes('fecho tpa') ||
    desc.includes('fechotpa') ||
    desc.includes('tpa') && desc.includes('fecho') ||
    desc.includes('multicaixa') && desc.includes('credito');
  
  // Fees
  const isFee = 
    desc.includes('comissão') ||
    desc.includes('comissao') ||
    desc.includes('taxa') ||
    (desc.includes('stc') && desc.includes('transf'));
  
  // VAT on fees
  const isVATOnFee = 
    desc.includes('iva') && (desc.includes('comissão') || desc.includes('comissao'));
  
  return {
    isTPASettlement,
    isFee,
    isVATOnFee,
  };
}

function extractMonthFromTransactions(transactions: BankTransactionRaw[]): string {
  if (transactions.length === 0) return '';
  
  const monthCounts: Record<string, number> = {};
  
  for (const tx of transactions) {
    if (tx.date && isValid(tx.date)) {
      const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    }
  }
  
  let maxCount = 0;
  let mostCommonMonth = '';
  
  for (const [month, count] of Object.entries(monthCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonMonth = month;
    }
  }
  
  return mostCommonMonth;
}

export interface ParseResult {
  transactions: BankTransactionRaw[];
  month: string;
  rowsRead: number;
  rawText: string;
}

export async function parseBankPDF(buffer: Buffer): Promise<ParseResult> {
  const data = await pdfParse(buffer);
  const text = data.text;
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  const transactions: BankTransactionRaw[] = [];
  
  // Pattern to match transaction lines
  // Typical format: DD/MM/YYYY Description Amount1 Amount2 Balance
  // Or variations with spaces
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Try to find date at the start (DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD)
    const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2}|\d{2}[-\/]\d{2}[-\/]\d{4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/);
    
    if (!dateMatch) continue;
    
    const dateStr = dateMatch[1];
    const date = parsePortugueseDate(dateStr);
    
    if (!date) continue;
    
    // Extract the rest of the line
    const rest = line.substring(dateMatch[0].length).trim();
    
    // Try to extract numbers from the end of the line
    // Pattern: look for sequences of numbers with commas/dots
    const numberPattern = /[\d\.\,]+/g;
    const numbers = rest.match(numberPattern) || [];
    
    // Description is everything except the last 2-3 numbers (debit, credit, balance)
    let description = rest;
    let debit: number | null = null;
    let credit: number | null = null;
    let balance = 0;
    
    if (numbers.length >= 1) {
      // Last number is balance
      balance = parsePortugueseNumber(numbers[numbers.length - 1]);
      
      // Remove numbers from description
      for (let j = Math.max(0, numbers.length - 3); j < numbers.length; j++) {
        const lastIndex = description.lastIndexOf(numbers[j]);
        if (lastIndex !== -1) {
          description = description.substring(0, lastIndex).trim();
        }
      }
      
      // If we have 3 numbers: debit, credit, balance
      if (numbers.length >= 3) {
        const debitCandidate = parsePortugueseNumber(numbers[numbers.length - 3]);
        const creditCandidate = parsePortugueseNumber(numbers[numbers.length - 2]);
        
        // Determine which is debit vs credit based on description or magnitude
        if (debitCandidate > 0 && creditCandidate === 0) {
          debit = debitCandidate;
        } else if (creditCandidate > 0 && debitCandidate === 0) {
          credit = creditCandidate;
        } else {
          // Both present or both zero - check description
          const descLower = description.toLowerCase();
          if (descLower.includes('debito') || descLower.includes('pagamento') || descLower.includes('transferencia')) {
            debit = debitCandidate;
            credit = creditCandidate > 0 ? creditCandidate : null;
          } else {
            credit = creditCandidate;
            debit = debitCandidate > 0 ? debitCandidate : null;
          }
        }
      } else if (numbers.length === 2) {
        // Only one value + balance
        const value = parsePortugueseNumber(numbers[numbers.length - 2]);
        
        // Guess based on keywords
        const descLower = description.toLowerCase();
        if (descLower.includes('credito') || descLower.includes('fecho tpa') || descLower.includes('deposito')) {
          credit = value;
        } else {
          debit = value;
        }
      }
    }
    
    const classification = classifyTransaction(description);
    
    transactions.push({
      date,
      description: description || 'N/A',
      debit,
      credit,
      balance,
      ...classification,
    });
  }
  
  const month = extractMonthFromTransactions(transactions);
  
  return {
    transactions,
    month,
    rowsRead: transactions.length,
    rawText: text,
  };
}

