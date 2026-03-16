"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { JobProgressBanner } from "@/components/ui/job-progress-banner";
import { Wand2 } from "lucide-react";

export default function GenerateStrategyButton({ brandId }: { brandId: string }) {
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    if (!confirm("為此品牌生成新的 AI 行銷策略？系統將在後台執行，你可以隨時離開此頁面。")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/brands/${brandId}/strategy`, { method: "POST" });
      const data = await res.json();

      if (!res.ok && res.status !== 202) {
        const msg = data.error ?? "無法啟動策略生成";
        const hint = data.hint ? `\n\n💡 ${data.hint}` : "";
        alert(msg + hint);
        return;
      }

      if (data.alreadyRunning) {
        alert("已有進行中的策略生成任務，請稍候。");
        setJobId(data.jobId);
        return;
      }

      setJobId(data.jobId);
      setActiveJob(true);
    } catch {
      alert("網絡錯誤，請重試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        className="w-full justify-start"
        onClick={handleGenerate}
        loading={loading}
        disabled={loading || activeJob}
      >
        <Wand2 className="h-4 w-4" />
        {activeJob ? "策略生成中…" : "生成行銷策略"}
      </Button>

      {jobId && (
        <JobProgressBanner
          jobId={jobId}
          brandId={brandId}
          jobType="GENERATE_STRATEGY"
          onDone={() => {
            setActiveJob(false);
            setJobId(null);
            router.refresh();
          }}
          onDismiss={() => { setActiveJob(false); setJobId(null); }}
        />
      )}
    </>
  );
}
