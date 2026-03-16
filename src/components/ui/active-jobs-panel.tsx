"use client";

import { useEffect, useState } from "react";
import { JobProgressBanner } from "./job-progress-banner";
import { useRouter } from "next/navigation";

interface JobRecord {
  id: string;
  brandId: string;
  type: string;
  status: string;
}

interface Props {
  brandId: string;
}

/**
 * Rendered on every brand detail page.
 * On mount, fetches any PENDING/RUNNING jobs for this brand
 * and re-attaches the progress banners — so if the user
 * navigated away and came back they can still see live progress.
 */
export function ActiveJobsPanel({ brandId }: Props) {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/brands/${brandId}/jobs`)
      .then((r) => r.json())
      .then((data: JobRecord[]) => {
        if (Array.isArray(data)) {
          // Only restore banners for jobs that were STILL RUNNING when page loaded
          // (not for already-done/failed jobs, which would cause infinite refresh)
          const inProgress = data.filter(
            (j) => j.status === "PENDING" || j.status === "RUNNING"
          );
          setJobs(inProgress);
        }
      })
      .catch(() => {});
  }, [brandId]);

  if (jobs.length === 0) return null;

  return (
    <>
      {jobs.map((job) => (
        <JobProgressBanner
          key={job.id}
          jobId={job.id}
          brandId={brandId}
          jobType={job.type as "GENERATE_STRATEGY" | "GENERATE_CONTENT"}
          // When restored from ActiveJobsPanel, only refresh if job was still running when page loaded
          onDone={
            job.status === "PENDING" || job.status === "RUNNING"
              ? () => router.refresh()
              : undefined
          }
          onDismiss={() => setJobs((prev) => prev.filter((j) => j.id !== job.id))}
        />
      ))}
    </>
  );
}
