import express from 'express';
import multer from 'multer';
import { processSalesFile, processBankFile, computeReconciliation } from '../services/fileService';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

router.post('/upload', upload.fields([
  { name: 'sales', maxCount: 1 },
  { name: 'bank', maxCount: 1 }
]), async (req, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || (!files.sales && !files.bank)) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const results: any[] = [];
    let inferredMonth = '';
    
    // Process sales file
    if (files.sales && files.sales[0]) {
      const salesFile = files.sales[0];
      const metrics = await processSalesFile(salesFile.buffer, salesFile.originalname);
      results.push({
        ...metrics,
        filename: salesFile.originalname,
      });
      inferredMonth = metrics.month;
    }
    
    // Process bank file
    if (files.bank && files.bank[0]) {
      const bankFile = files.bank[0];
      const metrics = await processBankFile(bankFile.buffer, bankFile.originalname);
      results.push({
        ...metrics,
        filename: bankFile.originalname,
      });
      if (!inferredMonth) {
        inferredMonth = metrics.month;
      }
    }
    
    // Compute reconciliation if we have a month
    if (inferredMonth) {
      await computeReconciliation(inferredMonth);
    }
    
    res.json({
      success: true,
      inferredMonth,
      results,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process files',
      details: error.message 
    });
  }
});

export default router;

