import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from '../../app/router/index.js';
import { TopBar } from '../../components/navigation/TopBar.js';
import { Button } from '../../components/ui/Button.js';
import { humanTasksApiClient } from '../../features/tasks/humanTasks.api.js';
import { HumanTaskRecord } from '../../../server/services/humanTask/humanTaskTypes.js';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  FileText,
  ShieldAlert,
  Send,
  XCircle,
} from 'lucide-react';

export const TasksScreen: React.FC = () => {
  const { navigate } = useRouter();
  const [tasks, setTasks] = useState<HumanTaskRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [selectedTask, setSelectedTask] = useState<HumanTaskRecord | null>(null);

  // Form input state for active modal/drawer
  const [responseInput, setResponseInput] = useState<string>('');
  const [candidateNotes, setCandidateNotes] = useState<string>('');
  const [externalReferenceId, setExternalReferenceId] = useState<string>('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const data = await humanTasksApiClient.listTasks({ limit: 50 });
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const openTasks = useMemo(() => {
    return tasks.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'WAITING_FOR_USER');
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks.filter((t) => t.status === 'COMPLETED');
  }, [tasks]);

  const handleOpenTask = async (task: HumanTaskRecord) => {
    setSelectedTask(task);
    setResponseInput('');
    setCandidateNotes('');
    setExternalReferenceId('');
    setIsConfirmed(false);
    setErrorMessage(null);

    if (task.status === 'OPEN') {
      try {
        await humanTasksApiClient.startTask(task.id);
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'IN_PROGRESS' } : t))
        );
      } catch {
        // Non-blocking
      }
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedTask) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    let val: unknown = responseInput;
    if (selectedTask.schema.inputType === 'CONFIRMATION') {
      val = isConfirmed || true;
    } else if (selectedTask.schema.inputType === 'YES_NO') {
      val = responseInput === 'yes';
    } else if (selectedTask.schema.inputType === 'NUMBER') {
      val = parseFloat(responseInput);
    }

    try {
      await humanTasksApiClient.completeTask(selectedTask.id, {
        responseValue: val,
        candidateNotes: candidateNotes || undefined,
        candidateConfirmed: isConfirmed,
        externalReferenceId: externalReferenceId || undefined,
      });

      setSelectedTask(null);
      await loadTasks();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelTask = async () => {
    if (!selectedTask) return;
    setIsSubmitting(true);
    try {
      await humanTasksApiClient.cancelTask(selectedTask.id, 'Candidate cancelled from tasks screen');
      setSelectedTask(null);
      await loadTasks();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 lg:pb-12">
      <TopBar title="Action Items" showBack onBack={() => navigate('/app/home')} />

      <main className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-4 md:pt-6 space-y-5">
        {/* Header Greeting */}
        <div className="rounded-[22px] bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/50 border border-indigo-100 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Human Task Engine
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
              {openTasks.length} pending
            </span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Actions required from you
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            Career Agent automates everything permitted. When a question requires your verified input or an external portal requires your action, it is safely queued here.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex p-1 bg-slate-200/60 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2 rounded-lg transition-all text-center ${
              activeTab === 'pending'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Actions ({openTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-2 rounded-lg transition-all text-center ${
              activeTab === 'completed'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Resolved ({completedTasks.length})
          </button>
        </div>

        {/* Task List */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading action items...</div>
        ) : activeTab === 'pending' ? (
          openTasks.length === 0 ? (
            <div className="rounded-[22px] bg-white border border-slate-200/80 p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="text-sm font-bold text-slate-900">All caught up!</div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No human actions are currently blocking your applications or job matches.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {openTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleOpenTask(task)}
                  className="rounded-[20px] bg-white border border-slate-200/80 p-4 shadow-xs hover:border-blue-300 transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        task.priority === 'URGENT' || task.priority === 'HIGH'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      }`}
                    >
                      {task.priority} Priority
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(task.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{task.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                    <span className="text-[11px] font-medium text-slate-400">
                      Type: <strong className="text-slate-700">{task.taskType}</strong>
                    </span>
                    <span className="font-semibold text-blue-600 flex items-center gap-1">
                      <span>Action</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : completedTasks.length === 0 ? (
          <div className="rounded-[22px] bg-white border border-slate-200/80 p-8 text-center text-xs text-slate-500">
            No completed tasks recorded yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-[18px] bg-white/80 border border-slate-200/70 p-4 space-y-1.5 opacity-90"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{task.title}</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                    Completed
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{task.description}</p>
                {task.externalReferenceId && (
                  <div className="text-[10px] font-mono text-slate-600">
                    Ref ID: {task.externalReferenceId} ({task.externalReferenceProvenance})
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Task Interaction Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-100">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 uppercase">
                {selectedTask.taskType}
              </span>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {selectedTask.title}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedTask.description}
              </p>
            </div>

            {selectedTask.instructions && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium">
                {selectedTask.instructions}
              </div>
            )}

            {/* Target URL external action if provided */}
            {selectedTask.context.targetUrl && (
              <a
                href={selectedTask.context.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all"
              >
                <span>Open Application on Employer Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Dynamic Input Schemas */}
            {selectedTask.schema.inputType === 'YES_NO' ? (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setResponseInput('yes')}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    responseInput === 'yes'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setResponseInput('no')}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    responseInput === 'no'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  No
                </button>
              </div>
            ) : selectedTask.schema.inputType === 'SINGLE_SELECT' ? (
              <select
                value={responseInput}
                onChange={(e) => setResponseInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
              >
                <option value="">Select an option...</option>
                {selectedTask.schema.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : selectedTask.schema.inputType === 'NUMBER' ? (
              <input
                type="number"
                placeholder={selectedTask.schema.placeholder || 'Enter numeric amount...'}
                value={responseInput}
                onChange={(e) => setResponseInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            ) : selectedTask.schema.inputType === 'TEXT' || selectedTask.schema.inputType === 'LONG_TEXT' ? (
              <textarea
                placeholder={selectedTask.schema.placeholder || 'Enter your response here...'}
                rows={3}
                value={responseInput}
                onChange={(e) => setResponseInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 resize-none"
              />
            ) : null}

            {/* Optional External Application Reference ID */}
            {(selectedTask.taskType === 'MANUAL_APPLICATION' || selectedTask.taskType === 'CONFIRM_SUBMISSION') && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  External Confirmation Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. APP-948210"
                  value={externalReferenceId}
                  onChange={(e) => setExternalReferenceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900"
                />
              </div>
            )}

            {/* Explicit Candidate Confirmation Checkbox */}
            <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
              />
              <span className="leading-snug">
                I confirm this information is accurate and verified by me.
              </span>
            </label>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700 font-medium">
                {errorMessage}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={handleCancelTask}
                isLoading={isSubmitting}
              >
                Dismiss
              </Button>
              <Button
                variant="primary"
                size="sm"
                fullWidth
                isLoading={isSubmitting}
                onClick={handleCompleteTask}
              >
                Complete Task
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
