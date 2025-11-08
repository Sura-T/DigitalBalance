import express from 'express';
import prisma from '../services/database';

const router = express.Router();

interface Anomaly {
  type: 'inconsistent_total' | 'invalid_date' | 'negative' | 'duplicate';
  severity: 'error' | 'warning';
  message: string;
  record: any;
}

// GET /quality/anomalies?month=YYYY-MM
router.get('/anomalies', async (req, res) => {
  try {
    const { month } = req.query;
    
    if (!month || typeof month !== 'string') {
      return res.status(400).json({ error: 'Month parameter required (YYYY-MM)' });
    }
    
    const sales = await prisma.sale.findMany({
      where: { month },
    });
    
    const anomalies: Anomaly[] = [];
    
    // Check for inconsistent totals
    for (const sale of sales) {
      const expectedVAT = (sale.netAmount * sale.vatRate) / 100;
      const expectedGross = sale.netAmount + sale.vatAmount;
      
      const vatDiff = Math.abs(sale.vatAmount - expectedVAT);
      const grossDiff = Math.abs(sale.grossAmount - expectedGross);
      
      if (vatDiff > 0.02) {
        anomalies.push({
          type: 'inconsistent_total',
          severity: 'warning',
          message: `VAT amount mismatch: expected ${expectedVAT.toFixed(2)}, got ${sale.vatAmount.toFixed(2)}`,
          record: {
            date: sale.date.toISOString().split('T')[0],
            invoice: sale.invoiceNumber,
            product: sale.product,
            netAmount: sale.netAmount,
            vatRate: sale.vatRate,
            vatAmount: sale.vatAmount,
          },
        });
      }
      
      if (grossDiff > 0.02) {
        anomalies.push({
          type: 'inconsistent_total',
          severity: 'warning',
          message: `Gross amount mismatch: expected ${expectedGross.toFixed(2)}, got ${sale.grossAmount.toFixed(2)}`,
          record: {
            date: sale.date.toISOString().split('T')[0],
            invoice: sale.invoiceNumber,
            product: sale.product,
            netAmount: sale.netAmount,
            vatAmount: sale.vatAmount,
            grossAmount: sale.grossAmount,
          },
        });
      }
    }
    
    // Check for invalid dates
    for (const sale of sales) {
      const saleMonth = `${sale.date.getFullYear()}-${String(sale.date.getMonth() + 1).padStart(2, '0')}`;
      
      if (saleMonth !== month) {
        anomalies.push({
          type: 'invalid_date',
          severity: 'error',
          message: `Date ${sale.date.toISOString().split('T')[0]} does not match month ${month}`,
          record: {
            date: sale.date.toISOString().split('T')[0],
            invoice: sale.invoiceNumber,
            product: sale.product,
          },
        });
      }
    }
    
    // Check for negative amounts (credit notes)
    for (const sale of sales) {
      if (sale.grossAmount < 0 || sale.netAmount < 0) {
        anomalies.push({
          type: 'negative',
          severity: 'warning',
          message: 'Negative amount detected (possibly a credit note)',
          record: {
            date: sale.date.toISOString().split('T')[0],
            invoice: sale.invoiceNumber,
            product: sale.product,
            netAmount: sale.netAmount,
            grossAmount: sale.grossAmount,
          },
        });
      }
    }
    
    // Check for duplicates
    const invoiceMap = new Map<string, any[]>();
    
    for (const sale of sales) {
      const key = `${sale.invoiceNumber}-${sale.product}`;
      if (!invoiceMap.has(key)) {
        invoiceMap.set(key, []);
      }
      invoiceMap.get(key)!.push(sale);
    }
    
    for (const [key, records] of invoiceMap.entries()) {
      if (records.length > 1) {
        anomalies.push({
          type: 'duplicate',
          severity: 'warning',
          message: `Potential duplicate: ${records.length} records with same invoice and product`,
          record: {
            invoice: records[0].invoiceNumber,
            product: records[0].product,
            count: records.length,
            dates: records.map(r => r.date.toISOString().split('T')[0]),
          },
        });
      }
    }
    
    res.json({
      month,
      anomalies,
      summary: {
        total: anomalies.length,
        errors: anomalies.filter(a => a.severity === 'error').length,
        warnings: anomalies.filter(a => a.severity === 'warning').length,
      },
    });
  } catch (error: any) {
    console.error('Quality check error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

