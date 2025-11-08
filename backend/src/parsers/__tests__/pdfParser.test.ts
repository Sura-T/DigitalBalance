import { parseBankPDF } from '../pdfParser';

// Mock pdf-parse
jest.mock('pdf-parse', () => {
  return jest.fn().mockImplementation((buffer) => {
    const mockText = `
      EXTRACTO BANCÁRIO - SETEMBRO 2025
      
      Data        Descrição                           Débito    Crédito   Saldo
      01/09/2025  Fecho TPA Multicaixa                          1.500,00  5.500,00
      02/09/2025  Comissão de Transferência STC      15,00               5.485,00
      02/09/2025  IVA s/Comissão                      2,10               5.482,90
      05/09/2025  Fecho TPA Multicaixa                          2.000,00  7.482,90
      10/09/2025  Transf interna para conta poupança 1.000,00            6.482,90
    `;
    
    return Promise.resolve({
      text: mockText,
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: '1.0',
    });
  });
});

describe('PDF Parser', () => {
  test('should parse bank statement PDF', async () => {
    const mockBuffer = Buffer.from('mock pdf content');
    
    const result = await parseBankPDF(mockBuffer);
    
    expect(result.transactions.length).toBeGreaterThan(0);
    expect(result.month).toBe('2025-09');
  });

  test('should classify TPA settlements correctly', async () => {
    const mockBuffer = Buffer.from('mock pdf content');
    
    const result = await parseBankPDF(mockBuffer);
    
    const tpaTransactions = result.transactions.filter(t => t.isTPASettlement);
    expect(tpaTransactions.length).toBeGreaterThan(0);
    expect(tpaTransactions[0].description.toLowerCase()).toContain('tpa');
  });

  test('should classify fees correctly', async () => {
    const mockBuffer = Buffer.from('mock pdf content');
    
    const result = await parseBankPDF(mockBuffer);
    
    const feeTransactions = result.transactions.filter(t => t.isFee);
    expect(feeTransactions.length).toBeGreaterThan(0);
  });

  test('should classify VAT on fees correctly', async () => {
    const mockBuffer = Buffer.from('mock pdf content');
    
    const result = await parseBankPDF(mockBuffer);
    
    const vatOnFees = result.transactions.filter(t => t.isVATOnFee);
    expect(vatOnFees.length).toBeGreaterThan(0);
  });

  test('should extract credit and debit amounts', async () => {
    const mockBuffer = Buffer.from('mock pdf content');
    
    const result = await parseBankPDF(mockBuffer);
    
    const creditTransactions = result.transactions.filter(t => t.credit && t.credit > 0);
    const debitTransactions = result.transactions.filter(t => t.debit && t.debit > 0);
    
    expect(creditTransactions.length).toBeGreaterThan(0);
    expect(debitTransactions.length).toBeGreaterThan(0);
  });

  test('should parse Portuguese date format', async () => {
    const mockBuffer = Buffer.from('mock pdf content');
    
    const result = await parseBankPDF(mockBuffer);
    
    expect(result.transactions[0].date).toBeInstanceOf(Date);
    expect(result.transactions[0].date.getMonth()).toBe(8); // September (0-indexed)
  });
});

