import { useState, useRef } from 'react';
import { useBulkImportDevicesMutation } from '../store/api';

interface PreviewRow {
  imei: string;
  assetTag: string;
  model: string;
  msisdn?: string;
  province?: string;
  zone?: string;
}

function parseCSV(content: string): PreviewRow[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row as unknown as PreviewRow;
  });
}

function downloadTemplate() {
  const headers = 'imei,serialNo,assetTag,model,msisdn,internalSim,batchId,province,district,zone,route,outlet';
  const example = '351756051524009,SN-011-2026,ZMT-011,Tecno Spark 10,0977000011,SIM-C1,batch-001,Copperbelt,Kitwe,Zone A,Route 1,Market';
  const blob = new Blob([`${headers}\n${example}\n`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'zamtel_device_import_template.csv';
  a.click();
}

export default function BulkImport() {
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [allRows, setAllRows] = useState<PreviewRow[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkImport, { isLoading }] = useBulkImportDevicesMutation();

  const handleFile = (file: File) => {
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const rows = parseCSV(content);
      setAllRows(rows);
      setPreview(rows.slice(0, 10));
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') handleFile(file);
  };

  const handleImport = async () => {
    if (allRows.length === 0) return;
    const res = await bulkImport(allRows as Parameters<typeof bulkImport>[0]).unwrap();
    setResult(res);
    setPreview([]);
    setAllRows([]);
    setFileName('');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Import Devices</h1>
        <p className="text-gray-500 text-sm mt-1">Upload a CSV file to import multiple devices</p>
      </div>

      {/* Template download */}
      <div className="card flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-gray-700">CSV Template</p>
          <p className="text-sm text-gray-500">Download the template to ensure correct format</p>
        </div>
        <button onClick={downloadTemplate} className="btn-secondary text-sm whitespace-nowrap">
          ⬇️ Download Template
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
          isDragOver ? 'border-zamtel-green bg-green-50' : 'border-gray-300 hover:border-zamtel-green hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
        />
        <div className="text-4xl mb-3">📁</div>
        <p className="text-gray-600 font-medium">Drop CSV file here or click to browse</p>
        <p className="text-gray-400 text-sm mt-1">Supports .csv files only</p>
        {fileName && <p className="text-zamtel-green text-sm mt-2 font-medium">📄 {fileName}</p>}
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">Preview ({allRows.length} rows, showing first 10)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['IMEI', 'Asset Tag', 'Model', 'MSISDN', 'Province', 'Zone'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-mono">{row.imei || '—'}</td>
                    <td className="px-4 py-2">{row.assetTag || '—'}</td>
                    <td className="px-4 py-2">{row.model || '—'}</td>
                    <td className="px-4 py-2">{row.msisdn || '—'}</td>
                    <td className="px-4 py-2">{row.province || '—'}</td>
                    <td className="px-4 py-2">{row.zone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <button
              onClick={handleImport}
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Importing {allRows.length} devices...
                </span>
              ) : `Import ${allRows.length} Devices`}
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4">Import Results</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{result.created}</div>
              <div className="text-xs text-green-600 mt-1">Created</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-700">{result.skipped}</div>
              <div className="text-xs text-yellow-600 mt-1">Skipped (duplicates)</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-700">{result.errors.length}</div>
              <div className="text-xs text-red-600 mt-1">Errors</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-sm font-medium text-red-700 mb-2">Errors:</p>
              <ul className="text-xs text-red-600 space-y-1">
                {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
