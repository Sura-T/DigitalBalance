import request from 'supertest';
import app from '../index';
import prisma from '../services/database';
import * as XLSX from 'xlsx';

// Mock data setup
function createMockExcelBuffer() {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['Data', 'Fatura', 'Cliente', 'Produto', 'Quantidade', 'Preço', 'Taxa IVA', 'Liquido', 'IVA', 'Total', 'Pagamento'],
    ['01/09/2025', 'FT001', 'Cliente A', 'Produto X', '2', '100,00', '14', '200,00', '28,00', '228,00', 'Cartão Multicaixa'],
    ['02/09/2025', 'FT002', 'Cliente B', 'Produto Y', '1', '50,00', '14', '50,00', '7,00', '57,00', 'Numerário'],
    ['03/09/2025', 'FT003', 'Cliente A', 'Produto Z', '3', '75,00', '14', '225,00', '31,50', '256,50', 'Cartão Multicaixa'],
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
  
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// Mock pdf-parse for bank file
jest.mock('pdf-parse', () => {
  return jest.fn().mockImplementation(() => {
    const mockText = `
      EXTRACTO BANCÁRIO - SETEMBRO 2025
      
      Data        Descrição                           Débito    Crédito   Saldo
      02/09/2025  Fecho TPA Multicaixa                          228,00    5.728,00
      03/09/2025  Comissão de Transferência STC      3,42                5.724,58
      03/09/2025  IVA s/Comissão                      0,48                5.724,10
      04/09/2025  Fecho TPA Multicaixa                          256,50    5.980,60
    `;
    
    return Promise.resolve({
      text: mockText,
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: '1.0',
    });
  });
});

describe('Integration Test: Upload → KPIs → Reconciliation', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.sale.deleteMany({});
    await prisma.bankTransaction.deleteMany({});
    await prisma.dailyReconciliation.deleteMany({});
    await prisma.uploadedFile.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Full workflow: upload files, get KPIs, and reconciliation', async () => {
    // Step 1: Upload files
    const salesBuffer = createMockExcelBuffer();
    const bankBuffer = Buffer.from('mock bank pdf');

    const uploadResponse = await request(app)
      .post('/files/upload')
      .attach('sales', salesBuffer, 'sales.xlsx')
      .attach('bank', bankBuffer, 'bank.pdf')
      .expect(200);

    expect(uploadResponse.body.success).toBe(true);
    expect(uploadResponse.body.inferredMonth).toBe('2025-09');
    expect(uploadResponse.body.results).toHaveLength(2);

    const month = uploadResponse.body.inferredMonth;

    // Step 2: Get KPI Summary
    const kpiResponse = await request(app)
      .get(`/kpi/summary?month=${month}`)
      .expect(200);

    expect(kpiResponse.body.revenue).toBeGreaterThan(0);
    expect(kpiResponse.body.invoices).toBe(3);
    expect(kpiResponse.body.paymentSplit).toHaveProperty('Cartão Multicaixa');
    expect(kpiResponse.body.paymentSplit).toHaveProperty('Numerário');

    // Step 3: Get Daily Revenue
    const dailyResponse = await request(app)
      .get(`/kpi/daily?month=${month}`)
      .expect(200);

    expect(dailyResponse.body.series.length).toBeGreaterThan(0);
    expect(dailyResponse.body.series[0]).toHaveProperty('date');
    expect(dailyResponse.body.series[0]).toHaveProperty('revenue');

    // Step 4: Get Top Customers
    const customersResponse = await request(app)
      .get(`/kpi/top-customers?month=${month}&limit=5`)
      .expect(200);

    expect(customersResponse.body.topCustomers.length).toBeGreaterThan(0);
    expect(customersResponse.body.topCustomers[0]).toHaveProperty('customer');
    expect(customersResponse.body.topCustomers[0]).toHaveProperty('revenue');

    // Step 5: Get Top Products
    const productsResponse = await request(app)
      .get(`/kpi/top-products?month=${month}&limit=5`)
      .expect(200);

    expect(productsResponse.body.topProducts.length).toBeGreaterThan(0);
    expect(productsResponse.body.topProducts[0]).toHaveProperty('product');
    expect(productsResponse.body.topProducts[0]).toHaveProperty('revenue');

    // Step 6: Get VAT Report
    const vatResponse = await request(app)
      .get(`/vat/report?month=${month}`)
      .expect(200);

    expect(vatResponse.body.grandTotal).toHaveProperty('taxableBase');
    expect(vatResponse.body.grandTotal).toHaveProperty('vatAmount');
    expect(vatResponse.body.grandTotal).toHaveProperty('grossAmount');

    // Step 7: Get Reconciliation
    const reconResponse = await request(app)
      .get(`/recon/card?month=${month}`)
      .expect(200);

    expect(reconResponse.body.daily.length).toBeGreaterThan(0);
    expect(reconResponse.body.summary).toHaveProperty('totalDays');
    expect(reconResponse.body.summary).toHaveProperty('passedDays');
    expect(reconResponse.body.summary).toHaveProperty('passRate');
    expect(reconResponse.body.summary).toHaveProperty('overallPass');

    // Step 8: Get Quality Anomalies
    const anomaliesResponse = await request(app)
      .get(`/quality/anomalies?month=${month}`)
      .expect(200);

    expect(anomaliesResponse.body).toHaveProperty('anomalies');
    expect(anomaliesResponse.body).toHaveProperty('summary');

    // Step 9: Export VAT CSV
    const exportResponse = await request(app)
      .get(`/export/vat.csv?month=${month}`)
      .expect(200);

    expect(exportResponse.headers['content-type']).toContain('text/csv');
    expect(exportResponse.text).toContain('Date,Invoice,Customer');
  });

  test('Health check endpoint', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
  });

  test('Latest month endpoint', async () => {
    const response = await request(app)
      .get('/latest-month')
      .expect(200);

    expect(response.body).toHaveProperty('month');
  });
});

