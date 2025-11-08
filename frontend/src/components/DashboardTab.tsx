'use client';

import { useState, useEffect } from 'react';
import { 
  getKPISummary, 
  getDailyRevenue, 
  getTopCustomers, 
  getTopProducts,
  getVATReport,
  getAnomalies,
  KPISummary,
  DailyRevenue,
  TopCustomer,
  TopProduct,
  VATReport,
  Anomaly 
} from '@/lib/api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardTabProps {
  month: string;
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

export default function DashboardTab({ month }: DashboardTabProps) {
  const [summary, setSummary] = useState<KPISummary | null>(null);
  const [dailyData, setDailyData] = useState<DailyRevenue[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [vat, setVat] = useState<VATReport | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [month]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, dailyData, customersData, productsData, vatData, anomaliesData] = await Promise.all([
        getKPISummary(month),
        getDailyRevenue(month),
        getTopCustomers(month, 5),
        getTopProducts(month, 5),
        getVATReport(month),
        getAnomalies(month),
      ]);
      
      setSummary(summaryData);
      setDailyData(dailyData.series);
      setTopCustomers(customersData.topCustomers);
      setTopProducts(productsData.topProducts);
      setVat(vatData);
      setAnomalies(anomaliesData.anomalies);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const paymentSplitData = summary ? Object.entries(summary.paymentSplit).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(2))
  })) : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Financial Dashboard</h2>
        <p className="text-gray-600">
          Overview of financial performance for {new Date(month + '-01').toLocaleDateString('pt-PT', { year: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white transform hover:scale-105 transition-transform duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm font-medium flex items-center space-x-2">
                  <span className="w-2 h-2 bg-primary-200 rounded-full animate-pulse"></span>
                  <span>Total Revenue</span>
                </p>
                <p className="text-4xl font-bold mt-2 tracking-tight">€{summary.revenue.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="transform hover:rotate-12 transition-transform duration-300">
                <svg className="w-14 h-14 text-primary-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white transform hover:scale-105 transition-transform duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium flex items-center space-x-2">
                  <span className="w-2 h-2 bg-purple-200 rounded-full animate-pulse"></span>
                  <span>Total Invoices</span>
                </p>
                <p className="text-4xl font-bold mt-2 tracking-tight">{summary.invoices}</p>
              </div>
              <div className="transform hover:rotate-12 transition-transform duration-300">
                <svg className="w-14 h-14 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-pink-500 via-pink-600 to-pink-700 text-white transform hover:scale-105 transition-transform duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-sm font-medium flex items-center space-x-2">
                  <span className="w-2 h-2 bg-pink-200 rounded-full animate-pulse"></span>
                  <span>Average Ticket</span>
                </p>
                <p className="text-4xl font-bold mt-2 tracking-tight">€{summary.avgTicket.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="transform hover:rotate-12 transition-transform duration-300">
                <svg className="w-14 h-14 text-pink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VAT Summary */}
      {vat && (
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            VAT Summary (14%)
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">Taxable Base</p>
              <p className="text-2xl font-bold text-blue-900">€{vat.grandTotal.taxableBase.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-700 font-medium">VAT Amount</p>
              <p className="text-2xl font-bold text-orange-900">€{vat.grandTotal.vatAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 font-medium">Gross Total</p>
              <p className="text-2xl font-bold text-green-900">€{vat.grandTotal.grossAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily Revenue Chart */}
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Daily Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => `€${value.toFixed(2)}`} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods */}
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentSplitData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentSplitData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `€${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Customers & Products */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Top 5 Customers</h3>
          <div className="space-y-3">
            {topCustomers.map((customer, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-600' : 'bg-gray-300'}`}>
                    {idx + 1}
                  </div>
                  <span className="font-medium text-gray-900">{customer.customer}</span>
                </div>
                <span className="font-bold text-primary-600">€{customer.revenue.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Top 5 Products</h3>
          <div className="space-y-3">
            {topProducts.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-600' : 'bg-gray-300'}`}>
                    {idx + 1}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900 block">{product.product}</span>
                    <span className="text-xs text-gray-500">Qty: {product.quantity}</span>
                  </div>
                </div>
                <span className="font-bold text-primary-600">€{product.revenue.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="card border-l-4 border-yellow-500">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Data Quality Issues ({anomalies.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {anomalies.slice(0, 10).map((anomaly, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${anomaly.severity === 'error' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <div className="flex items-start space-x-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${anomaly.severity === 'error' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>
                    {anomaly.type.toUpperCase()}
                  </span>
                  <p className="text-sm text-gray-800 flex-1">{anomaly.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

