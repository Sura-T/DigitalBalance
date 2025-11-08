import express from 'express';
import prisma from '../services/database';

const router = express.Router();

// GET /recon/card?month=YYYY-MM
router.get('/card', async (req, res) => {
  try {
    const { month } = req.query;
    
    if (!month || typeof month !== 'string') {
      return res.status(400).json({ error: 'Month parameter required (YYYY-MM)' });
    }
    
    const reconciliations = await prisma.dailyReconciliation.findMany({
      where: { month },
      orderBy: { date: 'asc' },
    });
    
    const daily = reconciliations.map(r => ({
      date: r.date.toISOString().split('T')[0],
      salesCard: parseFloat(r.salesCard.toFixed(2)),
      bankTPA: parseFloat(r.bankTPA.toFixed(2)),
      fees: parseFloat(r.fees.toFixed(2)),
      delta: parseFloat(r.delta.toFixed(2)),
      deltaPercent: parseFloat(r.deltaPercent.toFixed(2)),
      pass: r.pass,
    }));
    
    // Overall pass rate
    const totalDays = daily.length;
    const passedDays = daily.filter(d => d.pass).length;
    const passRate = totalDays > 0 ? (passedDays / totalDays) * 100 : 0;
    const overallPass = passRate >= 90;
    
    res.json({
      month,
      daily,
      summary: {
        totalDays,
        passedDays,
        passRate: parseFloat(passRate.toFixed(2)),
        overallPass,
      },
    });
  } catch (error: any) {
    console.error('Reconciliation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

