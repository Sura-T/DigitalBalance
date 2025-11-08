'use client';

import { useState } from 'react';
import { uploadFiles } from '@/lib/api';

interface UploadTabProps {
  onUploadSuccess: (month: string) => void;
}

export default function UploadTab({ onUploadSuccess }: UploadTabProps) {
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleUpload = async () => {
    if (!salesFile && !bankFile) {
      setError('Please select at least one file to upload');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);

    try {
      const data = await uploadFiles(salesFile, bankFile);
      setResult(data);
      if (data.inferredMonth) {
        onUploadSuccess(data.inferredMonth);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Financial Files</h2>
        <p className="text-gray-600">
          Upload your sales Excel file and bank statement PDF to begin analysis. The system will automatically detect the month.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Sales File Upload */}
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Sales File (Excel)</h3>
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setSalesFile(e.target.files?.[0] || null)}
            className="input"
          />
          {salesFile && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium">✓ {salesFile.name}</p>
              <p className="text-xs text-green-600">{(salesFile.size / 1024).toFixed(2)} KB</p>
            </div>
          )}
        </div>

        {/* Bank File Upload */}
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Bank Statement (PDF)</h3>
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setBankFile(e.target.files?.[0] || null)}
            className="input"
          />
          {bankFile && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium">✓ {bankFile.name}</p>
              <p className="text-xs text-red-600">{(bankFile.size / 1024).toFixed(2)} KB</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Button */}
      <div className="flex justify-center">
        <button
          onClick={handleUpload}
          disabled={uploading || (!salesFile && !bankFile)}
          className="btn-primary px-8 py-3 text-lg"
        >
          {uploading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Processing...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Upload & Process</span>
            </div>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-green-500 mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-900 mb-3">✓ Upload Successful!</h3>
              <div className="space-y-2">
                <p className="text-green-800">
                  <span className="font-semibold">Detected Month:</span> {result.inferredMonth}
                </p>
                {result.results.map((r: any, idx: number) => (
                  <div key={idx} className="bg-white p-3 rounded border border-green-200">
                    <p className="text-sm font-semibold text-gray-900">{r.fileType === 'sales' ? '📊 Sales File' : '🏦 Bank File'}</p>
                    <p className="text-sm text-gray-700">Rows processed: <span className="font-semibold">{r.rowsRead}</span></p>
                    <p className="text-sm text-gray-700">Duration: <span className="font-semibold">{r.durationMs}ms</span></p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

