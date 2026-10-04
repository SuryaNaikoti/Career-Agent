import React, { useState, useEffect } from 'react';
import { useRouter } from '../../app/router/index.js';
import {
  ArrowLeft,
  Bot,
  Play,
  Pause,
  Square,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  FileText,
  Send,
  Sliders,
  ChevronRight,
  Calendar,
  Globe,
  Check,
} from 'lucide-react';
import {
  agentSearchApi,
  AgentConfiguration,
  AgentSession,
  AgentSessionEvent,
} from '../../features/agent/agentSearch.api.js';
import {
  schedulerApi,
  BackgroundSchedule,
  BackgroundExecutionRecord,
  SchedulerStatus,
} from '../../features/agent/scheduler.api.js';

export const AgentScreen: React.FC = () => {
  const { goBack, navigate } = useRouter();

  // Agent State
  const [config, setConfig] = useState<AgentConfiguration | null>(null);
  const [latestSession, setLatestSession] = useState<AgentSession | null>(null);
  const [events, setEvents] = useState<AgentSessionEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  // Module 14 Scheduling State
  const [schedules, setSchedules] = useState<BackgroundSchedule[]>([]);
  const [executionHistory, setExecutionHistory] = useState<BackgroundExecutionRecord[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState<boolean>(false);

  // Load Status and Sessions
  const loadStatus = async () => {
    try {
      setError(null);
      const res = await agentSearchApi.getStatus();
      setConfig(res.config);
      setLatestSession(res.latestSession);

      if (res.latestSession) {
        const detail = await agentSearchApi.getSession(res.latestSession.id);
        setEvents(detail.events || []);
      }

      // Load background scheduling preferences & history
      try {
        const [schedRes, histRes, statRes] = await Promise.all([
          schedulerApi.getPreferences(),
          schedulerApi.getHistory(5),
          schedulerApi.getStatus(),
        ]);
        setSchedules(schedRes.schedules || []);
        setExecutionHistory(histRes.history || []);
        setSchedulerStatus(statRes.status || null);
      } catch (schedErr: any) {
        // Non-blocking if scheduler backend is reporting database not configured
        console.warn('Background scheduler status load:', schedErr.message);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to Career Agent engine');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Action handlers
  const handleStartAgent = async () => {
    setIsActionLoading(true);
    setError(null);
    try {
      const res = await agentSearchApi.startSearch('AGENT');
      setLatestSession(res.session);
      await loadStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to start Career Agent');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePauseAgent = async () => {
    if (!latestSession) return;
    setIsActionLoading(true);
    setError(null);
    try {
      const res = await agentSearchApi.pauseSession(latestSession.id);
      setLatestSession(res.session);
      await loadStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to pause session');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResumeAgent = async () => {
    if (!latestSession) return;
    setIsActionLoading(true);
    setError(null);
    try {
      const res = await agentSearchApi.resumeSession(latestSession.id);
      setLatestSession(res.session);
      await loadStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to resume session');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStopAgent = async () => {
    if (!latestSession) return;
    setIsActionLoading(true);
    setError(null);
    try {
      const res = await agentSearchApi.stopSession(latestSession.id);
      setLatestSession(res.session);
      await loadStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to stop session');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            RUNNING
          </span>
        );
      case 'WAITING_FOR_HUMAN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            WAITING FOR YOU
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
            <Clock className="w-3.5 h-3.5" />
            PAUSED
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            COMPLETED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            CANCELLED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            READY
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between pb-24 lg:pb-12">
      {/* Sticky Header - Mobile only */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="w-full px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={goBack}
              aria-label="Back"
              className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 -ml-2 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 leading-tight">Career Agent</h1>
                <p className="text-[11px] text-slate-500">Autonomous Job Search</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={loadStatus}
              title="Refresh status"
              aria-label="Refresh status"
              className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowConfigModal(true)}
              title="Agent Settings"
              aria-label="Agent settings"
              className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-4 md:pt-6 flex-1 space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Workflow Notice</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Hero Card: Status & Primary Controls */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
              Current Session
            </span>
            {getStatusBadge(latestSession ? latestSession.status : 'READY')}
          </div>

          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {latestSession?.status === 'RUNNING'
              ? 'Career Agent is working...'
              : latestSession?.status === 'WAITING_FOR_HUMAN'
              ? 'Action Required'
              : 'Autonomous Job Search Engine'}
          </h2>

          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            {latestSession?.status === 'RUNNING'
              ? 'Evaluating verified job posts, calculating candidate match evidence, and preparing tailored drafts.'
              : latestSession?.status === 'WAITING_FOR_HUMAN'
              ? 'Applications prepared, but candidate answers or confirmation are required before submission.'
              : 'Grounded in your Candidate Truth. Finds jobs, validates match thresholds, and drafts tailored applications.'}
          </p>

          {/* Real Session Metric Counters */}
          {latestSession && (
            <div className="grid grid-cols-4 gap-2 mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase">Found</p>
                <p className="text-base font-bold text-slate-800">{latestSession.summary.jobsFound}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase">Matched</p>
                <p className="text-base font-bold text-blue-600">{latestSession.summary.jobsMatched}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase">Drafted</p>
                <p className="text-base font-bold text-indigo-600">{latestSession.summary.applicationsPrepared}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase">Submitted</p>
                <p className="text-base font-bold text-emerald-600">{latestSession.summary.applicationsSubmitted}</p>
              </div>
            </div>
          )}

          {/* Action Button Bar */}
          <div className="flex items-center gap-2">
            {(!latestSession || ['COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED'].includes(latestSession.status)) && (
              <button
                onClick={latestSession?.status === 'PAUSED' ? handleResumeAgent : handleStartAgent}
                disabled={isActionLoading}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                {latestSession?.status === 'PAUSED' ? 'Resume Agent' : 'Start Agent'}
              </button>
            )}

            {latestSession?.status === 'RUNNING' && (
              <>
                <button
                  onClick={handlePauseAgent}
                  disabled={isActionLoading}
                  className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
                <button
                  onClick={handleStopAgent}
                  disabled={isActionLoading}
                  className="h-12 px-4 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              </>
            )}

            {latestSession?.status === 'WAITING_FOR_HUMAN' && (
              <>
                <button
                  onClick={() => navigate('/tasks')}
                  className="flex-1 h-12 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Review Tasks ({latestSession.summary.humanTasksCreated})
                </button>
                <button
                  onClick={handleStopAgent}
                  disabled={isActionLoading}
                  className="h-12 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm flex items-center justify-center transition-colors"
                >
                  Stop
                </button>
              </>
            )}
          </div>
        </div>

        {/* Real Step Progression */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Workflow Execution
          </h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
              <div className="flex items-center gap-2.5">
                <Search className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-slate-800">Job Discovery</span>
              </div>
              <span className="font-semibold text-slate-600">
                {latestSession ? `${latestSession.summary.jobsFound} found` : 'Idle'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
              <div className="flex items-center gap-2.5">
                <Filter className="w-4 h-4 text-slate-600" />
                <span className="font-medium text-slate-800">Deterministic Filters</span>
              </div>
              <span className="font-semibold text-slate-600">
                {latestSession ? `${latestSession.summary.jobsFiltered} rejected` : 'Idle'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-slate-800">Module 06 Match & Rank</span>
              </div>
              <span className="font-semibold text-slate-600">
                {latestSession ? `${latestSession.summary.jobsMatched} suitable` : 'Idle'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span className="font-medium text-slate-800">Module 08 App Preparation</span>
              </div>
              <span className="font-semibold text-slate-600">
                {latestSession ? `${latestSession.summary.applicationsPrepared} drafted` : 'Idle'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
              <div className="flex items-center gap-2.5">
                <Send className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-slate-800">Module 09 Submission Gate</span>
              </div>
              <span className="font-semibold text-slate-600">
                {latestSession ? `${latestSession.summary.applicationsSubmitted} submitted` : 'Idle'}
              </span>
            </div>
          </div>
        </div>

        {/* Audit Log / Event Feed */}
        {events.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Session Activity Log
            </h3>
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {events.map((evt) => (
                <div key={evt.id} className="text-xs border-l-2 border-blue-400 pl-3 py-1">
                  <p className="font-medium text-slate-800">{evt.message}</p>
                  <p className="text-[10px] text-slate-600">
                    {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Module 14: Background Automation & Scheduling Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Background Automation</h3>
                <p className="text-[11px] text-slate-500">Autonomous daily search & career reports</p>
              </div>
            </div>
            {schedulerStatus?.isRunning && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active Runner
              </span>
            )}
          </div>

          <div className="space-y-3 pt-1">
            {/* Job Search Schedule Row */}
            {(() => {
              const searchSched = schedules.find((s) => s.scheduleType === 'JOB_SEARCH');
              const isEnabled = searchSched ? searchSched.isEnabled : false;
              const preferredTime = searchSched?.preferredTime || '09:00';
              const timezone = searchSched?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
              const nextRun = searchSched?.nextRunAt ? new Date(searchSched.nextRunAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Not scheduled';

              return (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-semibold text-slate-800">Daily Autonomous Search</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        disabled={isUpdatingSchedule}
                        onChange={async (e) => {
                          setIsUpdatingSchedule(true);
                          try {
                            await schedulerApi.updatePreference('JOB_SEARCH', {
                              isEnabled: e.target.checked,
                              preferredTime,
                              timezone,
                            });
                            await loadStatus();
                          } catch (err: any) {
                            alert(err.message || 'Failed to update schedule');
                          } finally {
                            setIsUpdatingSchedule(false);
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-600" />
                      <input
                        type="time"
                        value={preferredTime}
                        disabled={isUpdatingSchedule}
                        onChange={async (e) => {
                          const val = e.target.value;
                          if (!val) return;
                          setIsUpdatingSchedule(true);
                          try {
                            await schedulerApi.updatePreference('JOB_SEARCH', {
                              preferredTime: val,
                              timezone,
                            });
                            await loadStatus();
                          } catch (err: any) {
                            alert(err.message || 'Failed to update preferred time');
                          } finally {
                            setIsUpdatingSchedule(false);
                          }
                        }}
                        className="border border-slate-200 bg-white rounded-md px-1.5 py-0.5 text-xs text-slate-800 font-medium"
                      />
                      <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
                        <Globe className="w-3 h-3" />
                        {timezone}
                      </span>
                    </div>
                  </div>

                  {isEnabled && (
                    <div className="text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                      <span className="text-slate-600">Next Scheduled Run:</span>
                      <span className="font-semibold text-slate-700">{nextRun}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Daily Report Schedule Row */}
            {(() => {
              const reportSched = schedules.find((s) => s.scheduleType === 'DAILY_REPORT');
              const isEnabled = reportSched ? reportSched.isEnabled : false;
              const preferredTime = reportSched?.preferredTime || '18:00';
              const timezone = reportSched?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
              const nextRun = reportSched?.nextRunAt ? new Date(reportSched.nextRunAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Not scheduled';

              return (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-semibold text-slate-800">Daily Career Report</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        disabled={isUpdatingSchedule}
                        onChange={async (e) => {
                          setIsUpdatingSchedule(true);
                          try {
                            await schedulerApi.updatePreference('DAILY_REPORT', {
                              isEnabled: e.target.checked,
                              preferredTime,
                              timezone,
                            });
                            await loadStatus();
                          } catch (err: any) {
                            alert(err.message || 'Failed to update report schedule');
                          } finally {
                            setIsUpdatingSchedule(false);
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600" />
                    </label>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-600" />
                      <input
                        type="time"
                        value={preferredTime}
                        disabled={isUpdatingSchedule}
                        onChange={async (e) => {
                          const val = e.target.value;
                          if (!val) return;
                          setIsUpdatingSchedule(true);
                          try {
                            await schedulerApi.updatePreference('DAILY_REPORT', {
                              preferredTime: val,
                              timezone,
                            });
                            await loadStatus();
                          } catch (err: any) {
                            alert(err.message || 'Failed to update preferred time');
                          } finally {
                            setIsUpdatingSchedule(false);
                          }
                        }}
                        className="border border-slate-200 bg-white rounded-md px-1.5 py-0.5 text-xs text-slate-800 font-medium"
                      />
                      <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
                        <Globe className="w-3 h-3" />
                        {timezone}
                      </span>
                    </div>
                  </div>

                  {isEnabled && (
                    <div className="text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                      <span className="text-slate-600">Next Scheduled Run:</span>
                      <span className="font-semibold text-slate-700">{nextRun}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Execution History Snippet */}
            {executionHistory.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-700 mb-1.5">Recent Background Executions</p>
                <div className="space-y-1.5">
                  {executionHistory.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-[10px] p-2 bg-slate-50/80 rounded-lg">
                      <span className="font-medium text-slate-700">
                        {item.scheduleType === 'JOB_SEARCH' ? 'Job Search' : 'Daily Report'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">
                          {new Date(item.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-sm font-semibold uppercase text-[9px] ${
                            item.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'FAILED'
                              ? 'bg-red-100 text-red-800'
                              : item.status === 'RUNNING'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Configuration Modal */}
      {showConfigModal && config && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Safety & Search Limits</h3>
            <p className="text-xs text-slate-500">
              Candidate-controlled limits enforced on the backend.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Minimum Match Score ({config.minMatchScore}%)
                </label>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={config.minMatchScore}
                  onChange={(e) => setConfig({ ...config, minMatchScore: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Max Applications Per Day: {config.maxApplicationsPerDay}
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={config.maxApplicationsPerDay}
                  onChange={(e) => setConfig({ ...config, maxApplicationsPerDay: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="font-semibold text-slate-800">Auto-submit Allowed</p>
                  <p className="text-[10px] text-slate-500">Only authorized ATS adapters</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.allowAutoSubmitOnAllowedSources}
                  onChange={(e) => setConfig({ ...config, allowAutoSubmitOnAllowedSources: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await agentSearchApi.updateConfig(config);
                    setShowConfigModal(false);
                  } catch (e: any) {
                    alert(e.message);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Save Limits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
