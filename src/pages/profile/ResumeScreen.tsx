import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../../app/router/index.js';
import { TopBar } from '../../components/navigation/TopBar.js';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Upload,
  AlertCircle,
  Clock,
  Sparkles,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Edit2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { resumeApiClient } from '../../features/resume/resume.api.js';
import {
  ResumeDocumentRecord,
  StructuredResumeData,
  ExtractedSkillItem,
  ExtractedExperienceItem,
  ExtractedEducationItem,
} from '../../../server/services/resume/resumeTypes.js';

export const ResumeScreen: React.FC = () => {
  const { navigate } = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resumes, setResumes] = useState<ResumeDocumentRecord[]>([]);
  const [activeResume, setActiveResume] = useState<ResumeDocumentRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Review states: selected item IDs for confirmation
  const [confirmedSkills, setConfirmedSkills] = useState<Set<string>>(new Set());
  const [confirmedExp, setConfirmedExp] = useState<Set<string>>(new Set());
  const [confirmedEdu, setConfirmedEdu] = useState<Set<string>>(new Set());

  // Editing state
  const [editingItem, setEditingItem] = useState<{
    category: 'skills' | 'experience' | 'education';
    id: string;
    field: string;
    value: string;
  } | null>(null);

  const loadResumes = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await resumeApiClient.listResumes();
      setResumes(list);
      if (list.length > 0) {
        const top = list[0];
        setActiveResume(top);
        initConfirmedSets(top.parsedData);
      }
    } catch (err: any) {
      // In development or when DB is not configured, show clean error banner
      setError(err?.message || 'Could not load resumes');
    } finally {
      setLoading(false);
    }
  };

  const initConfirmedSets = (data?: StructuredResumeData | null) => {
    if (!data) return;
    setConfirmedSkills(new Set(data.skills.map((s) => s.id)));
    setConfirmedExp(new Set(data.experience.map((e) => e.id)));
    setConfirmedEdu(new Set(data.education.map((e) => e.id)));
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      setSuccessMessage(null);
      setUploadStage('Uploading document to secure storage...');

      const created = await resumeApiClient.uploadResume(file);
      setUploadStage('Structuring career intelligence with AI...');

      setSuccessMessage(`Resume '${file.name}' processed successfully.`);
      setActiveResume(created);
      initConfirmedSets(created.parsedData);
      await loadResumes();
    } catch (err: any) {
      setError(err.message || 'Failed to upload resume.');
    } finally {
      setUploading(false);
      setUploadStage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleToggleSkill = (id: string) => {
    setConfirmedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleExp = (id: string) => {
    setConfirmedExp((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleEdu = (id: string) => {
    setConfirmedEdu((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmAll = async () => {
    if (!activeResume || !activeResume.parsedData) return;

    try {
      setLoading(true);
      setError(null);

      const parsed = activeResume.parsedData;
      const payload = {
        confirmedProfile: {
          headline: parsed.headline || undefined,
          targetRoles: parsed.targetRoles,
          totalExperienceYears: parsed.totalExperienceYears || undefined,
          preferredLocations: parsed.preferredLocations,
          workModes: parsed.workModes,
        },
        confirmedSkills: parsed.skills
          .filter((s) => confirmedSkills.has(s.id))
          .map((s) => ({
            name: s.name,
            proficiencyLevel: s.proficiency !== 'UNKNOWN' ? (s.proficiency as any) : null,
            yearsOfExperience: s.yearsOfExperience,
          })),
        confirmedExperience: parsed.experience
          .filter((e) => confirmedExp.has(e.id))
          .map((e) => ({
            company: e.company,
            roleTitle: e.roleTitle,
            startDate: e.startDate,
            endDate: e.endDate,
            isCurrent: e.isCurrent,
            description: e.description,
            skillsUsed: e.skillsUsed,
          })),
        confirmedEducation: parsed.education
          .filter((ed) => confirmedEdu.has(ed.id))
          .map((ed) => ({
            institution: ed.institution,
            degree: ed.degree,
            fieldOfStudy: ed.fieldOfStudy,
            startDate: ed.startDate,
            endDate: ed.endDate,
          })),
      };

      await resumeApiClient.confirmFacts(activeResume.id, payload);
      setSuccessMessage('Confirmed resume facts persisted to your profile.');
      await loadResumes();
    } catch (err: any) {
      setError(err?.message || 'Failed to confirm resume facts.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResume = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    try {
      setLoading(true);
      await resumeApiClient.deleteResume(id);
      setSuccessMessage('Resume deleted successfully.');
      await loadResumes();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete resume.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!activeResume) return;
    try {
      const url = await resumeApiClient.getPreviewUrl(activeResume.id);
      window.open(url, '_blank');
    } catch (err: any) {
      alert(err.message || 'Could not open preview.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 lg:pb-12">
      <TopBar showBack title="Resume Intelligence" />

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
      />

      <main className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-4 md:pt-6 space-y-5">
        {/* Candidate Truth Layer Banner */}
        <div className="rounded-[22px] bg-blue-50/70 border border-blue-200/80 p-5 space-y-2">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Truth Layer & Provenance</span>
          </div>
          <p className="text-xs text-blue-900/80 leading-relaxed">
            Resume details are classified as <strong>AI_SUGGESTED</strong> until you review and confirm them.
            We never silently invent facts or overwrite your verified profile.
          </p>
        </div>

        {/* Status / Notifications */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-800">{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-800">{successMessage}</div>
          </div>
        )}

        {uploading && (
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center animate-spin text-blue-600">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Processing Resume</h4>
                <p className="text-[11px] text-slate-500">{uploadStage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Action Card */}
        <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Upload Your Resume</h3>
              <p className="text-[11px] text-slate-400">PDF or DOCX up to 10MB</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            {uploading ? 'Processing...' : 'Select File'}
          </Button>
        </div>

        {/* Current / Active Resume Document Card */}
        {activeResume && (
          <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 truncate max-w-[200px] md:max-w-md">
                    {activeResume.originalFilename}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Status: <span className="font-semibold text-slate-700">{activeResume.status}</span> · {Math.round(activeResume.fileSizeBytes / 1024)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteResume(activeResume.id)}
                  className="p-2 text-slate-400 hover:text-red-600 transition"
                  title="Delete Resume"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex gap-2">
              <Button size="sm" variant="secondary" fullWidth onClick={handlePreview}>
                Preview Document
              </Button>
              {activeResume.status === 'REVIEW_REQUIRED' && (
                <Button size="sm" variant="primary" fullWidth onClick={handleConfirmAll}>
                  Confirm Selected
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Parsed Intelligence Review Screen */}
        {activeResume?.parsedData && (
          <div className="space-y-4">
            {/* Header & Advisory Recommendations */}
            {activeResume.parsedData.advisoryAnalysis && (
              <div className="rounded-[22px] bg-amber-50/60 border border-amber-200/80 p-5 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>AI Advisory Analysis (Suggestions Only)</span>
                </div>
                <ul className="text-xs text-amber-900/80 space-y-1 list-disc pl-4">
                  {activeResume.parsedData.advisoryAnalysis.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Extracted Skills Section */}
            <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Extracted Skills ({activeResume.parsedData.skills.length})
                </h3>
                <span className="text-[11px] text-slate-400">Select to confirm</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {activeResume.parsedData.skills.map((skill) => {
                  const isChecked = confirmedSkills.has(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => handleToggleSkill(skill.id)}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition ${
                        isChecked
                          ? 'bg-blue-50 border-blue-200 text-blue-800'
                          : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                      }`}
                    >
                      {isChecked ? (
                        <Check className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>{skill.name}</span>
                      {skill.proficiency && skill.proficiency !== 'UNKNOWN' && (
                        <span className="text-[10px] text-blue-600/70">({skill.proficiency})</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Extracted Experience Section */}
            <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Extracted Experience ({activeResume.parsedData.experience.length})
              </h3>
              <div className="space-y-3">
                {activeResume.parsedData.experience.map((exp) => {
                  const isChecked = confirmedExp.has(exp.id);
                  return (
                    <div
                      key={exp.id}
                      className={`p-4 rounded-xl border transition space-y-2 ${
                        isChecked
                          ? 'bg-white border-slate-200'
                          : 'bg-slate-50 border-slate-200/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{exp.roleTitle}</h4>
                          <p className="text-[11px] text-slate-500 font-medium">{exp.company}</p>
                          <p className="text-[10px] text-slate-400">
                            {exp.startDate || 'Unknown'} — {exp.isCurrent ? 'Present' : exp.endDate || 'Unknown'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={isChecked ? 'secondary' : 'ghost'}
                          onClick={() => handleToggleExp(exp.id)}
                        >
                          {isChecked ? 'Confirmed' : 'Excluded'}
                        </Button>
                      </div>
                      {exp.description && (
                        <p className="text-[11px] text-slate-600 leading-relaxed">{exp.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Extracted Education Section */}
            <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Extracted Education ({activeResume.parsedData.education.length})
              </h3>
              <div className="space-y-3">
                {activeResume.parsedData.education.map((edu) => {
                  const isChecked = confirmedEdu.has(edu.id);
                  return (
                    <div
                      key={edu.id}
                      className={`p-4 rounded-xl border transition flex items-start justify-between gap-2 ${
                        isChecked
                          ? 'bg-white border-slate-200'
                          : 'bg-slate-50 border-slate-200/60 opacity-60'
                      }`}
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{edu.degree}</h4>
                        <p className="text-[11px] text-slate-500">{edu.institution}</p>
                        {edu.fieldOfStudy && (
                          <p className="text-[10px] text-slate-400">Field: {edu.fieldOfStudy}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={isChecked ? 'secondary' : 'ghost'}
                        onClick={() => handleToggleEdu(edu.id)}
                      >
                        {isChecked ? 'Confirmed' : 'Excluded'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sticky Action Footer for Candidate Review */}
            <div className="sticky bottom-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-lg flex gap-3">
              <Button
                variant="primary"
                fullWidth
                onClick={handleConfirmAll}
                disabled={loading}
              >
                Save Confirmed Profile Facts
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
