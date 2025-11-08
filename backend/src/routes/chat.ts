import express from 'express';
import prisma from '../services/database';
import { answerQuestion, generateMonthlyReport } from '../services/llmService';

const router = express.Router();

// POST /chat/ask
router.post('/ask', async (req, res) => {
  try {
    const { session_id, prompt, month } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Create or get session
    let sessionId = session_id;
    if (!sessionId) {
      const session = await prisma.chatSession.create({
        data: {},
      });
      sessionId = session.id;
    }
    
    // Save user message
    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: prompt,
      },
    });
    
    // Generate response
    const response = await answerQuestion(sessionId, prompt, month);
    
    // Save assistant message
    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: response,
      },
    });
    
    res.json({
      session_id: sessionId,
      response,
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /chat/report
router.post('/report', async (req, res) => {
  try {
    const { month } = req.body;
    
    if (!month || typeof month !== 'string') {
      return res.status(400).json({ error: 'Month parameter required (YYYY-MM)' });
    }
    
    const report = await generateMonthlyReport(month);
    
    res.json({
      month,
      report,
    });
  } catch (error: any) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /chat/history/:sessionId
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
    });
    
    res.json({
      session_id: sessionId,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Chat history error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

