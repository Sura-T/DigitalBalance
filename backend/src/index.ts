import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import filesRouter from './routes/files';
import kpiRouter from './routes/kpi';
import vatRouter from './routes/vat';
import reconRouter from './routes/recon';
import qualityRouter from './routes/quality';
import chatRouter from './routes/chat';
import { getLatestMonth } from './services/fileService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/files', filesRouter);
app.use('/kpi', kpiRouter);
app.use('/vat', vatRouter);
app.use('/recon', reconRouter);
app.use('/quality', qualityRouter);
app.use('/chat', chatRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get latest month
app.get('/latest-month', async (req, res) => {
  try {
    const month = await getLatestMonth();
    res.json({ month });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export VAT CSV
app.get('/export/vat.csv', async (req, res) => {
  try {
    const { month } = req.query;
    
    if (!month || typeof month !== 'string') {
      return res.status(400).json({ error: 'Month parameter required (YYYY-MM)' });
    }
    
    const prisma = (await import('./services/database')).default;
    const sales = await prisma.sale.findMany({
      where: { month },
      orderBy: { date: 'asc' },
    });
    
    // Generate CSV
    let csv = 'Date,Invoice,Customer,Product,Quantity,Unit Price,VAT Rate,Net Amount,VAT Amount,Gross Amount,Payment Method\n';
    
    for (const sale of sales) {
      const row = [
        sale.date.toISOString().split('T')[0],
        `"${sale.invoiceNumber}"`,
        `"${sale.customer}"`,
        `"${sale.product}"`,
        sale.quantity,
        sale.unitPriceNet.toFixed(2),
        sale.vatRate,
        sale.netAmount.toFixed(2),
        sale.vatAmount.toFixed(2),
        sale.grossAmount.toFixed(2),
        `"${sale.paymentMethod}"`,
      ].join(',');
      csv += row + '\n';
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="vat-${month}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Finance Assistant API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;

