import express from 'express';
import prisma from '../services/database';
import { startOfDay } from 'date-fns';

const router = express.Router();

// GET /vat/report?month=YYYY-MM
router.get('/report', async (req, res) => {
  try {
    const { month } = req.query;
    
    if (!month || typeof month !== 'string') {
      return res.status(400).json({ error: 'Month parameter required (YYYY-MM)' });
    }
    
    const sales = await prisma.sale.findMany({
      where: { month },
      orderBy: { date: 'asc' },
    });
    
    // Group by day and VAT rate
    const dailyVAT: Record<string, Record<string, { base: number; vat: number; gross: number }>> = {};
    
    for (const sale of sales) {
      const dateKey = sale.date.toISOString().split('T')[0];
      const rateKey = `${sale.vatRate}%`;
      
      if (!dailyVAT[dateKey]) {
        dailyVAT[dateKey] = {};
      }
      
      if (!dailyVAT[dateKey][rateKey]) {
        dailyVAT[dateKey][rateKey] = { base: 0, vat: 0, gross: 0 };
      }
      
      dailyVAT[dateKey][rateKey].base += sale.netAmount;
      dailyVAT[dateKey][rateKey].vat += sale.vatAmount;
      dailyVAT[dateKey][rateKey].gross += sale.grossAmount;
    }
    
    // Format daily report
    const daily = Object.entries(dailyVAT)
      .map(([date, rates]) => ({
        date,
        byRate: Object.entries(rates).map(([rate, amounts]) => ({
          rate,
          taxableBase: parseFloat(amounts.base.toFixed(2)),
          vatAmount: parseFloat(amounts.vat.toFixed(2)),
          grossAmount: parseFloat(amounts.gross.toFixed(2)),
        })),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Compute totals
    const totals: Record<string, { base: number; vat: number; gross: number }> = {};
    
    for (const sale of sales) {
      const rateKey = `${sale.vatRate}%`;
      
      if (!totals[rateKey]) {
        totals[rateKey] = { base: 0, vat: 0, gross: 0 };
      }
      
      totals[rateKey].base += sale.netAmount;
      totals[rateKey].vat += sale.vatAmount;
      totals[rateKey].gross += sale.grossAmount;
    }
    
    const totalsByRate = Object.entries(totals).map(([rate, amounts]) => ({
      rate,
      taxableBase: parseFloat(amounts.base.toFixed(2)),
      vatAmount: parseFloat(amounts.vat.toFixed(2)),
      grossAmount: parseFloat(amounts.gross.toFixed(2)),
    }));
    
    const grandTotal = {
      taxableBase: parseFloat(sales.reduce((sum, s) => sum + s.netAmount, 0).toFixed(2)),
      vatAmount: parseFloat(sales.reduce((sum, s) => sum + s.vatAmount, 0).toFixed(2)),
      grossAmount: parseFloat(sales.reduce((sum, s) => sum + s.grossAmount, 0).toFixed(2)),
    };
    
    res.json({
      month,
      daily,
      totalsByRate,
      grandTotal,
    });
  } catch (error: any) {
    console.error('VAT report error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

