import OpenAI from 'openai';
import prisma from './database';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

export async function getContextForMonth(month: string): Promise<string> {
  // Gather compact summaries of data
  const sales = await prisma.sale.findMany({
    where: { month },
  });
  
  if (sales.length === 0) {
    return `No data available for month ${month}.`;
  }
  
  // Summary stats
  const totalRevenue = sales.reduce((sum, s) => sum + s.grossAmount, 0);
  const totalInvoices = new Set(sales.map(s => s.invoiceNumber)).size;
  const avgTicket = totalRevenue / totalInvoices;
  
  // Payment method breakdown
  const paymentMethods: Record<string, number> = {};
  for (const sale of sales) {
    paymentMethods[sale.paymentMethod] = (paymentMethods[sale.paymentMethod] || 0) + sale.grossAmount;
  }
  
  // Top products
  const productRevenue: Record<string, number> = {};
  for (const sale of sales) {
    productRevenue[sale.product] = (productRevenue[sale.product] || 0) + sale.grossAmount;
  }
  const topProducts = Object.entries(productRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([product, revenue]) => `${product}: €${revenue.toFixed(2)}`);
  
  // Top customers
  const customerRevenue: Record<string, number> = {};
  for (const sale of sales) {
    customerRevenue[sale.customer] = (customerRevenue[sale.customer] || 0) + sale.grossAmount;
  }
  const topCustomers = Object.entries(customerRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([customer, revenue]) => `${customer}: €${revenue.toFixed(2)}`);
  
  // VAT breakdown
  const vatByRate: Record<string, { base: number; vat: number }> = {};
  for (const sale of sales) {
    const key = `${sale.vatRate}%`;
    if (!vatByRate[key]) {
      vatByRate[key] = { base: 0, vat: 0 };
    }
    vatByRate[key].base += sale.netAmount;
    vatByRate[key].vat += sale.vatAmount;
  }
  
  // Daily revenue (top days)
  const dailyRevenue: Record<string, number> = {};
  for (const sale of sales) {
    const date = sale.date.toISOString().split('T')[0];
    dailyRevenue[date] = (dailyRevenue[date] || 0) + sale.grossAmount;
  }
  const topDays = Object.entries(dailyRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([date, revenue]) => `${date}: €${revenue.toFixed(2)}`);
  
  // Reconciliation status
  const recons = await prisma.dailyReconciliation.findMany({
    where: { month },
  });
  const totalDays = recons.length;
  const passedDays = recons.filter(r => r.pass).length;
  const failedDays = recons.filter(r => !r.pass);
  
  let context = `
FINANCIAL DATA FOR ${month}

OVERVIEW:
- Total Revenue: €${totalRevenue.toFixed(2)}
- Total Invoices: ${totalInvoices}
- Average Ticket: €${avgTicket.toFixed(2)}

PAYMENT METHODS:
${Object.entries(paymentMethods).map(([method, amount]) => `- ${method}: €${amount.toFixed(2)} (${((amount/totalRevenue)*100).toFixed(1)}%)`).join('\n')}

TOP 5 PRODUCTS:
${topProducts.map(p => `- ${p}`).join('\n')}

TOP 5 CUSTOMERS:
${topCustomers.map(c => `- ${c}`).join('\n')}

VAT BREAKDOWN:
${Object.entries(vatByRate).map(([rate, amounts]) => `- ${rate}: Base €${amounts.base.toFixed(2)}, VAT €${amounts.vat.toFixed(2)}`).join('\n')}

TOP 3 REVENUE DAYS:
${topDays.map(d => `- ${d}`).join('\n')}

RECONCILIATION STATUS:
- Total Days: ${totalDays}
- Passed: ${passedDays} (${totalDays > 0 ? ((passedDays/totalDays)*100).toFixed(1) : 0}%)
- Failed: ${totalDays - passedDays}
`;
  
  if (failedDays.length > 0) {
    context += '\nFAILED RECONCILIATION DAYS:\n';
    for (const day of failedDays) {
      context += `- ${day.date.toISOString().split('T')[0]}: Sales Card €${day.salesCard.toFixed(2)}, Bank TPA €${day.bankTPA.toFixed(2)}, Fees €${day.fees.toFixed(2)}, Delta €${day.delta.toFixed(2)} (${day.deltaPercent.toFixed(2)}%)\n`;
    }
  }
  
  return context;
}

export async function generateMonthlyReport(month: string): Promise<string> {
  const context = await getContextForMonth(month);
  
  const prompt = `You are a financial analyst. Based on the following data for ${month}, generate a comprehensive Monthly Finance Report (8-12 sentences). Include:
1. Overall revenue and invoice count
2. Payment method distribution
3. Top performing products
4. Notable customer activity
5. VAT summary (especially 14% rate)
6. Best revenue days
7. Reconciliation status and any issues

Use specific numbers from the data. Be concise but informative.

DATA:
${context}

Generate the Monthly Finance Report:`;
  
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst who writes clear, concise reports based strictly on provided data. Use specific numbers and avoid speculation.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });
    
    return response.choices[0]?.message?.content || 'Unable to generate report.';
  } catch (error: any) {
    console.error('LLM error:', error);
    return `Unable to generate report due to LLM error: ${error.message}`;
  }
}

export async function answerQuestion(
  sessionId: string,
  question: string,
  month?: string
): Promise<string> {
  // Get context for the latest month or specified month
  const targetMonth = month || await getLatestMonth();
  
  if (!targetMonth) {
    return 'No financial data has been uploaded yet.';
  }
  
  const context = await getContextForMonth(targetMonth);
  
  // Get conversation history
  const history = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { timestamp: 'asc' },
    take: 10, // Last 10 messages
  });
  
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are a financial assistant with access to company financial data for ${targetMonth}. Answer questions based strictly on the provided data. If the data doesn't contain the answer, say so. Be concise and cite specific numbers.`,
    },
  ];
  
  // Add history
  for (const msg of history) {
    messages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    });
  }
  
  // Add context and current question
  messages.push({
    role: 'user',
    content: `DATA FOR ${targetMonth}:\n${context}\n\nQUESTION: ${question}`,
  });
  
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 500,
    });
    
    return response.choices[0]?.message?.content || 'Unable to answer.';
  } catch (error: any) {
    console.error('LLM error:', error);
    return `Unable to answer due to LLM error: ${error.message}`;
  }
}

async function getLatestMonth(): Promise<string> {
  const latest = await prisma.uploadedFile.findFirst({
    orderBy: { uploadedAt: 'desc' },
    select: { month: true },
  });
  return latest?.month || '';
}

