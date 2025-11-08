import express from 'express';
import prisma from '../services/database';
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

const router = express.Router();

// GET /kpi/summary?month=YYYY-MM
router.get('/summary', async (req, res) => {
  try {
    const { month } = req.query;
    
    if (!month || typeof month !== 'string') {
      return res.status(400).json({ error: 'Month parameter required (YYYY-MM)' });
    }
    
    const sales = await prisma.sale.findMany({
      where: { month },
    });
    
    if (sales.length === 0) {
      return res.json({
        month,
        revenue: 0,
        invoices: 0,
        avgTicket: 0,
        paymentSplit: {},
      });
    }
    
    const revenue = sales.reduce((sum, s) => sum + s.grossAmount, 0);
    const invoices = new Set(sales.map(s => s.invoiceNumber)).size;
    const avgTicket = revenue / invoices;
    
    // Payment method split
    const paymentSplit: Record<string, number> = {};
    for (const sale of sales) {
      const method = sale.paymentMethod;
      paymentSplit[method] = (paymentSplit[method] || 0) + sale.grossAmount;
    }
    
    res.json({
      month,
      revenue: parseFloat(revenue.toFixed(2)),
      invoices,
      avgTicket: parseFloat(avgTicket.toFixed(2)),
      paymentSplit,
    });
  } catch (error: any) {
    console.error('KPI summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /kpi/daily?month=YYYY-MM
router.get('/daily', async (req, res) => {
  try {
    const { month } = req.query;
    
    if (!month || typeof month !== 'string') {
      return res.status(400).json({ error: 'Month parameter required (YYYY-MM)' });
    }
    
    const sales = await prisma.sale.findMany({
      where: { month },
      orderBy: { date: 'asc' },
    });
    
    // Group by day
    const dailyRevenue: Record<string, number> = {};
    
    for (const sale of sales) {
      const dateKey = sale.date.toISOString().split('T')[0];
      dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + sale.grossAmount;
    }
    
    const series = Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({
        date,
        revenue: parseFloat(revenue.toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    res.json({
      month,
      series,
    });
  } catch (error: any) {
    console.error('KPI daily error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /kpi/top-customers?month=YYYY-MM&limit=10
router.get('/top-customers', async (req, res) => {
  try {
    const { month, limit = '10' } = req.query;
    
    if (!month || typeof month !== 'string') {
      return res.status(400).json({ error: 'Month parameter required (YYYY-MM)' });
    }
    
    const limitNum = parseInt(limit as string);
    
    const sales = await prisma.sale.findMany({
      where: { month },
    });
    
    // Group by customer
    const customerRevenue: Record<string, number> = {};
    
    for (const sale of sales) {
      customerRevenue[sale.customer] = (customerRevenue[sale.customer] || 0) + sale.grossAmount;
    }
    
    const topCustomers = Object.entries(customerRevenue)
      .map(([customer, revenue]) => ({
        customer,
        revenue: parseFloat(revenue.toFixed(2)),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limitNum);
    
    res.json({
      month,
      topCustomers,
    });
  } catch (error: any) {
    console.error('Top customers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /kpi/top-products?month=YYYY-MM&limit=10
router.get('/top-products', async (req, res) => {
  try {
    const { month, limit = '10' } = req.query;
    
    if (!month || typeof month !== 'string') {
      return res.status(400).json({ error: 'Month parameter required (YYYY-MM)' });
    }
    
    const limitNum = parseInt(limit as string);
    
    const sales = await prisma.sale.findMany({
      where: { month },
    });
    
    // Group by product
    const productStats: Record<string, { revenue: number; quantity: number }> = {};
    
    for (const sale of sales) {
      if (!productStats[sale.product]) {
        productStats[sale.product] = { revenue: 0, quantity: 0 };
      }
      productStats[sale.product].revenue += sale.grossAmount;
      productStats[sale.product].quantity += sale.quantity;
    }
    
    const topProducts = Object.entries(productStats)
      .map(([product, stats]) => ({
        product,
        revenue: parseFloat(stats.revenue.toFixed(2)),
        quantity: parseFloat(stats.quantity.toFixed(2)),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limitNum);
    
    res.json({
      month,
      topProducts,
    });
  } catch (error: any) {
    console.error('Top products error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

