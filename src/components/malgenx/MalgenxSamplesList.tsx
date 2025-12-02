'use client';

import { useState } from 'react';
import { Search, FileText, Link as LinkIcon, AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useMalgenx } from '@/hooks/useMalgenx';

interface Sample {
  sampleId: string;
  status: string;
  submissionType: string;
  priority: string;
  createdAt: string;
  riskScore?: number;
  malwareFamily?: string;
}

export function MalgenxSamplesList() {
  const [sampleId, setSampleId] = useState('');
  const [sample, setSample] = useState<Sample | null>(null);
  const { loading, error, getSampleStatus } = useMalgenx();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleId.trim()) return;

    const result = await getSampleStatus(sampleId.trim());
    if (result) {
      setSample(result as Sample);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'analyzing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/10 border-green-500/50';
      case 'analyzing': return 'text-blue-400 bg-blue-500/10 border-blue-500/50';
      case 'failed': return 'text-red-400 bg-red-500/10 border-red-500/50';
      default: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/50';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h3 className="text-xl font-semibold text-white mb-4">Sample Status Lookup</h3>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={sampleId}
            onChange={(e) => setSampleId(e.target.value)}
            placeholder="Enter Sample ID (UUID)"
            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={loading || !sampleId.trim()}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            Search
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {sample && (
        <div className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(sample.status)}
              <div>
                <h4 className="text-white font-medium">Sample Analysis</h4>
                <p className="text-gray-400 text-sm">ID: {sample.sampleId}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded text-sm font-medium border ${getStatusColor(sample.status)}`}>
              {sample.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 mb-1">Type</p>
              <div className="flex items-center gap-2 text-white">
                {sample.submissionType === 'url' ? (
                  <LinkIcon className="w-4 h-4" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                {sample.submissionType.toUpperCase()}
              </div>
            </div>

            <div>
              <p className="text-gray-400 mb-1">Priority</p>
              <p className="text-white">{sample.priority.toUpperCase()}</p>
            </div>

            <div>
              <p className="text-gray-400 mb-1">Submitted</p>
              <p className="text-white">{new Date(sample.createdAt).toLocaleString()}</p>
            </div>

            {sample.riskScore !== undefined && (
              <div>
                <p className="text-gray-400 mb-1">Risk Score</p>
                <p className="text-white font-medium">{sample.riskScore.toFixed(0)}/100</p>
              </div>
            )}

            {sample.malwareFamily && (
              <div className="col-span-2">
                <p className="text-gray-400 mb-1">Malware Family</p>
                <p className="text-white font-medium">{sample.malwareFamily}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
