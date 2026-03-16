"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface JobStep {
  step: string;
  status: "pending" | "running" | "done" | "error";
}

interface JobStatus {
  id: string;
  brandId: string;
  type: string;
  status: string;
  progressPct: number;
  currentStep: string | null;
  steps: JobStep[];
  resultId: string | null;
  errorMessage: string | null;
  updatedAt: string;
}

interface Props {
  jobId: string;
  brandId: string;
  jobType: "GENERATE_STRATEGY" | "GENERATE_CONTENT";
  onDone?: (resultId: string | null) => void;
  onDismiss?: () => void;
}

const JOB_LABELS: Record<string, string> = {
  GENERATE_STRATEGY: "生成行銷策略",
  GENERATE_CONTENT: "生成 4 週內容計畫",
};

export function JobProgressBanner({ jobId, brandId, jobType, onDone, onDismiss }: Props) {
  const router = useRouter();
  const [job, setJob] = useState<JobStatus | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // Track whether we've already fired onDone to avoid repeated calls
  const doneFiredRef = useRef(false);
  // Track the previous status to detect transitions
  const prevStatusRef = useRef<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) return;
      const data: JobStatus = await res.json();
      setJob(data);

      // Only fire onDone when status TRANSITIONS to DONE (not on every poll)
      if (
        data.status === "DONE" &&
        !doneFiredRef.current &&
        prevStatusRef.current !== null // skip if this is initial load of an already-done job
      ) {
        doneFiredRef.current = true;
        onDone?.(data.resultId);
      }
      prevStatusRef.current = data.status;
    } catch {
      // ignore network errors during polling
    }
  }, [jobId, onDone]);

  useEffect(() => {
    poll();
    const interval = setInterval(() => {
      // Stop polling once job is terminal
      if (!job || job.status === "RUNNING" || job.status === "PENDING") {
        poll();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [poll, job]);

  if (dismissed || !job) return null;
  if (job.status === "DONE" && !job.resultId && dismissed) return null;

  const isDone = job.status === "DONE";
  const isFailed = job.status === "FAILED";
  const isRunning = job.status === "RUNNING" || job.status === "PENDING";

  const handleViewResult = () => {
    if (jobType === "GENERATE_STRATEGY") {
      router.push(`/brands/${brandId}/strategy`);
    } else {
      router.push(`/brands/${brandId}/content`);
    }
    router.refresh();
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`fixed bottom-5 right-5 w-80 z-50 rounded-2xl shadow-2xl border transition-all ${
        isDone
          ? "bg-emerald-50 border-emerald-200"
          : isFailed
          ? "bg-red-50 border-red-200"
          : "bg-white border-indigo-200"
      }`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {isDone ? (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            ) : isFailed ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                {JOB_LABELS[jobType] ?? jobType}
              </p>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                </button>
                {(isDone || isFailed) && (
                  <button
                    onClick={handleDismiss}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Current step */}
            <p className={`text-xs mt-0.5 truncate ${isDone ? "text-emerald-600" : isFailed ? "text-red-600" : "text-indigo-500"}`}>
              {job.currentStep ?? "處理中…"}
            </p>

            {/* Progress bar */}
            {isRunning && (
              <div className="mt-2 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${job.progressPct}%` }}
                />
              </div>
            )}

            {isDone && (
              <div className="mt-2 h-1.5 bg-emerald-200 rounded-full">
                <div className="h-full w-full bg-emerald-500 rounded-full" />
              </div>
            )}
          </div>
        </div>

        {/* Expanded steps */}
        {expanded && job.steps.length > 0 && (
          <div className="mt-3 space-y-1.5 pl-8">
            {job.steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-shrink-0">
                  {s.status === "done" ? (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  ) : s.status === "running" ? (
                    <Loader2 className="h-3.5 w-3.5 text-indigo-500 animate-spin" />
                  ) : s.status === "error" ? (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-200" />
                  )}
                </div>
                <span className={`text-xs ${
                  s.status === "done" ? "text-gray-500 line-through" :
                  s.status === "running" ? "text-indigo-700 font-medium" :
                  s.status === "error" ? "text-red-600" :
                  "text-gray-400"
                }`}>
                  {s.step}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {isDone && (
          <button
            onClick={handleViewResult}
            className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {jobType === "GENERATE_STRATEGY" ? "查看策略" : "查看內容日曆"}
          </button>
        )}

        {isFailed && job.errorMessage && (
          <div className="mt-2 p-2 bg-red-100 rounded-lg text-xs text-red-700">
            {job.errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
