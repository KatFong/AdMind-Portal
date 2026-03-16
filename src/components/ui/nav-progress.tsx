"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    const current = pathname + searchParams.toString();
    const prev = prevPathRef.current;
    if (current === prev) return;
    prevPathRef.current = current;

    // Navigation completed — animate to 100% then hide
    setVisible(true);
    setWidth(100);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [pathname, searchParams]);

  if (!visible && width === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-0.5 pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 300ms" }}
    >
      <div
        className="h-full bg-indigo-500"
        style={{
          width: `${width}%`,
          transition: width === 100 ? "width 300ms ease-out" : "none",
        }}
      />
    </div>
  );
}

// Trigger: shows progress bar immediately when any Link is clicked
export function NavProgressTrigger() {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("http")) return;

      setActive(true);
      setProgress(20);
      // Simulate progress
      const t1 = setTimeout(() => setProgress(60), 150);
      const t2 = setTimeout(() => setProgress(80), 400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      const t = setTimeout(() => { setActive(false); setProgress(0); }, 350);
      return () => clearTimeout(t);
    }
  }, [progress]);

  if (!active) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 pointer-events-none">
      <div
        className="h-full bg-indigo-500 shadow-sm"
        style={{ width: `${progress}%`, transition: "width 200ms ease-out" }}
      />
    </div>
  );
}
