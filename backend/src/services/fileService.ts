import prisma from './database';
import { parseExcelFile, CanonicalSale } from '../parsers/excelParser';
import { parseBankPDF, BankTransactionRaw } from '../parsers/pdfParser';
import { addDays, startOfDay } from 'date-fns';

export interface UploadMetrics {
  rowsRead: number;
  durationMs: number;
  month: string;
  fileType: 'sales' | 'bank';
}

export async function processSalesFile(
  buffer: Buffer,
  filename: string
): Promise<UploadMetrics> {
  const startTime = Date.now();
  
  const result = await parseExcelFile(buffer);
  
  // Store raw data
  await prisma.uploadedFile.create({
    data: {
      filename,
      fileType: 'sales',
      month: result.month,
      rowsRead: result.rowsProcessed,
      durationMs: Date.now() - startTime,
      rawContent: JSON.stringify(result.raw),
    },
  });
  
  // Store canonical sales
  for (const sale of result.normalized) {
    await prisma.sale.create({
      data: {
        month: result.month,
        date: sale.date,
        invoiceNumber: sale.invoiceNumber,
        customer: sale.customer,
        product: sale.product,
        quantity: sale.quantity,
        unitPriceNet: sale.unitPriceNet,
        vatRate: sale.vatRate,
        netAmount: sale.netAmount,
        vatAmount: sale.vatAmount,
        grossAmount: sale.grossAmount,
        paymentMethod: sale.paymentMethod,
      },
    });
  }
  
  const durationMs = Date.now() - startTime;
  
  return {
    rowsRead: result.rowsProcessed,
    durationMs,
    month: result.month,
    fileType: 'sales',
  };
}

export async function processBankFile(
  buffer: Buffer,
  filename: string
): Promise<UploadMetrics> {
  const startTime = Date.now();
  
  const result = await parseBankPDF(buffer);
  
  // Store raw data
  await prisma.uploadedFile.create({
    data: {
      filename,
      fileType: 'bank',
      month: result.month,
      rowsRead: result.rowsRead,
      durationMs: Date.now() - startTime,
      rawContent: result.rawText,
    },
  });
  
  // Store transactions
  for (const tx of result.transactions) {
    await prisma.bankTransaction.create({
      data: {
        month: result.month,
        date: tx.date,
        description: tx.description,
        debit: tx.debit,
        credit: tx.credit,
        balance: tx.balance,
        isTPASettlement: tx.isTPASettlement,
        isFee: tx.isFee,
        isVATOnFee: tx.isVATOnFee,
      },
    });
  }
  
  const durationMs = Date.now() - startTime;
  
  return {
    rowsRead: result.rowsRead,
    durationMs,
    month: result.month,
    fileType: 'bank',
  };
}

export async function computeReconciliation(month: string): Promise<void> {
  // Get all unique dates from sales for this month
  const salesDates = await prisma.sale.findMany({
    where: { month },
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'asc' },
  });
  
  for (const { date } of salesDates) {
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Card sales for this day
    const cardSales = await prisma.sale.findMany({
      where: {
        month,
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
        paymentMethod: {
          contains: 'Cartão',
          mode: 'insensitive',
        },
      },
    });
    
    const salesCard = cardSales.reduce((sum, s) => sum + s.grossAmount, 0);
    
    // TPA credits for this day (or T+1)
    const nextDay = addDays(dayStart, 1);
    const nextDayEnd = new Date(nextDay);
    nextDayEnd.setHours(23, 59, 59, 999);
    
    const tpaCredits = await prisma.bankTransaction.findMany({
      where: {
        month,
        date: {
          gte: dayStart,
          lte: nextDayEnd,
        },
        isTPASettlement: true,
      },
    });
    
    const bankTPA = tpaCredits.reduce((sum, tx) => sum + (tx.credit || 0), 0);
    
    // Fees for this day (or T+1)
    const fees = await prisma.bankTransaction.findMany({
      where: {
        month,
        date: {
          gte: dayStart,
          lte: nextDayEnd,
        },
        OR: [
          { isFee: true },
          { isVATOnFee: true },
        ],
      },
    });
    
    const totalFees = fees.reduce((sum, tx) => sum + (tx.debit || 0), 0);
    
    // Compute delta
    const delta = salesCard - bankTPA - totalFees;
    const deltaPercent = salesCard > 0 ? (delta / salesCard) * 100 : 0;
    const pass = Math.abs(deltaPercent) <= 5;
    
    // Upsert reconciliation record
    await prisma.dailyReconciliation.upsert({
      where: {
        month_date: {
          month,
          date: dayStart,
        },
      },
      create: {
        month,
        date: dayStart,
        salesCard,
        bankTPA,
        fees: totalFees,
        delta,
        deltaPercent,
        pass,
      },
      update: {
        salesCard,
        bankTPA,
        fees: totalFees,
        delta,
        deltaPercent,
        pass,
      },
    });
  }
}

export async function getLatestMonth(): Promise<string> {
  const latest = await prisma.uploadedFile.findFirst({
    orderBy: { uploadedAt: 'desc' },
    select: { month: true },
  });
  
  return latest?.month || '';
}

