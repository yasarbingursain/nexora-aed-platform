'use client';

import React, { useState, useEffect } from 'react';
import { UserCog, Clock, AlertCircle, XCircle, Play } from 'lucide-react';

interface ImpersonationSession {
  id: string;
  ticketId: string;
  reason: string;
  startedAt: string;
  expiresAt: string;
  endedAt: string | null;
  supportUser: {
    id: string;
    email: string;
    fullName: string;
  };
  targetUser: {
    id: string;
    email: string;
    fullName: string;
  };
  organization: {
    id: string;
    name: string;
  };
}

export default function ImpersonationManagementPage() {
  const [sessions, setSessions] = useState<ImpersonationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);
  const [formData, setFormData] = useState({
    targetUserId: '',
    ticketId: '',
    reason: '',
    durationMinutes: 30,
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/platform/admin/impersonations?active=true', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setSessions(data.sessions);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartImpersonation = async () => {
    try {
      const response = await fetch('/api/platform/admin/impersonations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowStartModal(false);
        setFormData({ targetUserId: '', ticketId: '', reason: '', durationMinutes: 30 });
        fetchSessions();
        alert('Impersonation session started successfully');
      }
    } catch (error) {
      console.error('Failed to start impersonation:', error);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to end this impersonation session?')) return;

    try {
      await fetch(`/api/platform/admin/impersonations/${sessionId}/end`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      fetchSessions();
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    return minutes > 0 ? `${minutes} min remaining` : 'Expired';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Impersonation Sessions</h1>
            <p className="text-gray-600 mt-1">Manage support impersonation sessions (max 30 minutes)</p>
          </div>
          <button
            onClick={() => setShowStartModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Play className="w-4 h-4" />
            Start Impersonation
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-900">Important Security Notice</h3>
              <p className="text-sm text-yellow-800 mt-1">
                All impersonation sessions are fully audited. Requires valid support ticket ID and reason.
                Maximum session duration is 30 minutes.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <UserCog className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Sessions</h3>
            <p className="text-gray-600">There are no active impersonation sessions at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map(session => (
              <div
                key={session.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <UserCog className="w-6 h-6 text-blue-600 mt-1" />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {session.supportUser.fullName}
                        </h3>
                        <span className="text-gray-500">→</span>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {session.targetUser.fullName}
                        </h3>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>Support: {session.supportUser.email}</div>
                        <div>Target: {session.targetUser.email}</div>
                        <div>Organization: {session.organization.name}</div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEndSession(session.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    End Session
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Ticket ID</div>
                    <div className="text-sm font-medium text-gray-900">{session.ticketId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Started</div>
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(session.startedAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Time Remaining</div>
                    <div className="flex items-center gap-1 text-sm font-medium text-orange-600">
                      <Clock className="w-4 h-4" />
                      {getTimeRemaining(session.expiresAt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Status</div>
                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Active
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Reason</div>
                  <div className="text-sm text-gray-900">{session.reason}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showStartModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Start Impersonation Session</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target User ID
                  </label>
                  <input
                    type="text"
                    value={formData.targetUserId}
                    onChange={(e) => setFormData({ ...formData, targetUserId: e.target.value })}
                    placeholder="User ID to impersonate"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Support Ticket ID *
                  </label>
                  <input
                    type="text"
                    value={formData.ticketId}
                    onChange={(e) => setFormData({ ...formData, ticketId: e.target.value })}
                    placeholder="e.g., TICKET-12345"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason *
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Explain why impersonation is needed"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes, max 30)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="30"
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowStartModal(false);
                      setFormData({ targetUserId: '', ticketId: '', reason: '', durationMinutes: 30 });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStartImpersonation}
                    disabled={!formData.targetUserId || !formData.ticketId || !formData.reason}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
