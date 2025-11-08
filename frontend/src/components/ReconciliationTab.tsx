'use client';

import { useState, useEffect } from 'react';
import { getReconciliation, ReconciliationReport } from '@/lib/api';

interface ReconciliationTabProps {
  month: string;
}

export default function ReconciliationTab({ month }: ReconciliationTabProps) {
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [month]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getReconciliation(month);
      setReport(data);
    } catch (error) {
      console.error('Failed to load reconciliation data:', error);
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

  if (!report) {
    return (
      <div className="text-center py-12 text-gray-600">
        No reconciliation data available for this month.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Card Payment Reconciliation</h2>
        <p className="text-gray-600">
          Daily reconciliation of card sales vs bank TPA settlements (with T+1 support)
        </p>
      </div>

      {/* Summary Card */}
      <div className={`card border-l-4 ${report.summary.overallPass ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Reconciliation Status</h3>
            <div className="space-y-1">
              <p className="text-gray-700">
                <span className="font-semibold">Total Days:</span> {report.summary.totalDays}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Passed:</span> {report.summary.passedDays} days
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Failed:</span> {report.summary.totalDays - report.summary.passedDays} days
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Pass Rate:</span> {report.summary.passRate.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className={`text-6xl ${report.summary.overallPass ? 'text-green-600' : 'text-red-600'}`}>
            {report.summary.overallPass ? (
              <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full ${report.summary.overallPass ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${report.summary.passRate}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Pass threshold: ≥90% of days with delta ≤5% (Currently: {report.summary.passRate.toFixed(1)}%)
          </p>
        </div>
      </div>

      {/* Daily Reconciliation Table */}
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Daily Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sales (Card)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bank TPA</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Fees</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Delta</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Delta %</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {report.daily.map((day, idx) => (
                <tr key={idx} className={day.pass ? '' : 'bg-red-50'}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {new Date(day.date).toLocaleDateString('pt-PT')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                    €{day.salesCard.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                    €{day.bankTPA.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                    €{day.fees.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold ${Math.abs(day.delta) < 1 ? 'text-green-600' : day.pass ? 'text-yellow-600' : 'text-red-600'}`}>
                    €{day.delta.toLocaleString('pt-PT', { minimumFractionDigits: 2, signDisplay: 'always' })}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold ${Math.abs(day.deltaPercent) <= 2 ? 'text-green-600' : day.pass ? 'text-yellow-600' : 'text-red-600'}`}>
                    {day.deltaPercent.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {day.pass ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        ✗ Fail
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="card bg-blue-50 border border-blue-200">
        <h3 className="text-lg font-bold text-blue-900 mb-3">📘 Understanding the Reconciliation</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p><span className="font-semibold">Sales (Card):</span> Total card payments from sales Excel file</p>
          <p><span className="font-semibold">Bank TPA:</span> TPA settlement credits from bank statement (may be T+1)</p>
          <p><span className="font-semibold">Fees:</span> Bank commissions + VAT on commissions</p>
          <p><span className="font-semibold">Delta:</span> Sales Card - Bank TPA - Fees</p>
          <p><span className="font-semibold">Pass Criteria:</span> |Delta %| ≤ 5% (green if ≤2%, yellow if 2-5%, red if {'>'}5%)</p>
          <p className="pt-2 border-t border-blue-300 font-semibold">
            Overall Pass: ≥90% of days must pass (Currently: {report.summary.passedDays}/{report.summary.totalDays})
          </p>
        </div>
      </div>
    </div>
  );
}

