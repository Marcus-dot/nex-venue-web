"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service like Sentry or Crashlytics
    console.error("Global Error Boundary caught an exception:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background dark:bg-[#0f101e] flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full">
        <GlassCard className="!p-10 text-center border-2 border-red-500/20 bg-red-500/5 shadow-2xl shadow-red-500/10">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
            <AlertCircle size={40} className="animate-pulse" />
          </div>
          
          <h2 className="text-3xl font-black text-surface-dark dark:text-white mb-4 tracking-tight">System Fault</h2>

          <p className="text-surface-dark/60 dark:text-white/60 font-medium mb-8">
            We encountered an unexpected issue while trying to render this screen. Our team has been notified.
          </p>

          <Button 
            onClick={() => reset()} 
            className="w-full !py-4 text-lg gap-2"
          >
            <RefreshCcw size={20} /> Try to Recover
          </Button>
          
          <div className="mt-6 text-xs text-surface-dark/40 dark:text-white/40 font-bold bg-white/50 dark:bg-white/5 p-4 rounded-xl text-left overflow-x-auto border border-surface-dark/10 dark:border-white/10">
            <code>{error.message || "An unknown error occurred."}</code>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
