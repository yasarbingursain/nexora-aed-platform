'use client';

import { useState } from 'react';
import { Upload, Link as LinkIcon, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useMalgenx } from '@/hooks/useMalgenx';

export function MalgenxSubmissionForm() {
  const [submissionType, setSubmissionType] = useState<'file' | 'url'>('url');
  const [url, setUrl] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');
  const [tags, setTags] = useState('');
  const [submittedSampleId, setSubmittedSampleId] = useState<string | null>(null);

  const { loading, error, submitSample } = useMalgenx();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await submitSample({
      type: submissionType,
      url: submissionType === 'url' ? url : undefined,
      priority,
      tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
      source: 'web_ui',
    });

    if (result) {
      setSubmittedSampleId(result.sampleId);
      setUrl('');
      setTags('');
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h3 className="text-xl font-semibold text-white mb-4">Submit Sample for Analysis</h3>

      {submittedSampleId && (
        <div className="mb-4 p-4 bg-green-900/20 border border-green-500/50 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-400 font-medium">Sample submitted successfully!</p>
            <p className="text-gray-400 text-sm mt-1">Sample ID: {submittedSampleId}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Submission failed</p>
            <p className="text-gray-400 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Submission Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Submission Type
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setSubmissionType('url')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                submissionType === 'url'
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                  : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
              }`}
            >
              <LinkIcon className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm font-medium">URL</span>
            </button>
            <button
              type="button"
              onClick={() => setSubmissionType('file')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                submissionType === 'file'
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                  : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
              }`}
              disabled
            >
              <Upload className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm font-medium">File (Coming Soon)</span>
            </button>
          </div>
        </div>

        {/* URL Input */}
        {submissionType === 'url' && (
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-2">
              Suspicious URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://suspicious-domain.com/malware.exe"
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
            />
          </div>
        )}

        {/* Priority */}
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-2">
            Analysis Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-2">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="phishing, ransomware, apt"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || (submissionType === 'url' && !url)}
          className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Submit for Analysis
            </>
          )}
        </button>
      </form>

      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <p className="text-blue-400 text-sm">
          <strong>Security Note:</strong> All submissions are analyzed in an isolated sandbox environment.
          No malware can escape or affect your system.
        </p>
      </div>
    </div>
  );
}
