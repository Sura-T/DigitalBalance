import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface KPISummary {
  month: string;
  revenue: number;
  invoices: number;
  avgTicket: number;
  paymentSplit: Record<string, number>;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
}

export interface TopCustomer {
  customer: string;
  revenue: number;
}

export interface TopProduct {
  product: string;
  revenue: number;
  quantity: number;
}

export interface VATReport {
  month: string;
  daily: any[];
  totalsByRate: any[];
  grandTotal: {
    taxableBase: number;
    vatAmount: number;
    grossAmount: number;
  };
}

export interface ReconciliationReport {
  month: string;
  daily: Array<{
    date: string;
    salesCard: number;
    bankTPA: number;
    fees: number;
    delta: number;
    deltaPercent: number;
    pass: boolean;
  }>;
  summary: {
    totalDays: number;
    passedDays: number;
    passRate: number;
    overallPass: boolean;
  };
}

export interface Anomaly {
  type: string;
  severity: string;
  message: string;
  record: any;
}

export async function uploadFiles(salesFile: File | null, bankFile: File | null) {
  const formData = new FormData();
  if (salesFile) formData.append('sales', salesFile);
  if (bankFile) formData.append('bank', bankFile);
  
  const response = await api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function getKPISummary(month: string): Promise<KPISummary> {
  const response = await api.get(`/kpi/summary?month=${month}`);
  return response.data;
}

export async function getDailyRevenue(month: string): Promise<{ month: string; series: DailyRevenue[] }> {
  const response = await api.get(`/kpi/daily?month=${month}`);
  return response.data;
}

export async function getTopCustomers(month: string, limit = 10): Promise<{ topCustomers: TopCustomer[] }> {
  const response = await api.get(`/kpi/top-customers?month=${month}&limit=${limit}`);
  return response.data;
}

export async function getTopProducts(month: string, limit = 10): Promise<{ topProducts: TopProduct[] }> {
  const response = await api.get(`/kpi/top-products?month=${month}&limit=${limit}`);
  return response.data;
}

export async function getVATReport(month: string): Promise<VATReport> {
  const response = await api.get(`/vat/report?month=${month}`);
  return response.data;
}

export async function getReconciliation(month: string): Promise<ReconciliationReport> {
  const response = await api.get(`/recon/card?month=${month}`);
  return response.data;
}

export async function getAnomalies(month: string): Promise<{ anomalies: Anomaly[]; summary: any }> {
  const response = await api.get(`/quality/anomalies?month=${month}`);
  return response.data;
}

export async function askChat(sessionId: string | null, prompt: string, month?: string) {
  const response = await api.post('/chat/ask', {
    session_id: sessionId,
    prompt,
    month,
  });
  return response.data;
}

export async function generateReport(month: string) {
  const response = await api.post('/chat/report', { month });
  return response.data;
}

export async function getLatestMonth(): Promise<string> {
  const response = await api.get('/latest-month');
  return response.data.month;
}

export async function getChatHistory(sessionId: string) {
  const response = await api.get(`/chat/history/${sessionId}`);
  return response.data;
}

