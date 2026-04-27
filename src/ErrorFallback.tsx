import { useEffect, useState } from "react";
import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";

import { AlertTriangleIcon, RefreshCwIcon, ClipboardCopyIcon, Share2Icon, RotateCcwIcon } from "lucide-react";

import {
  collectDiagnostics,
  copyToClipboard,
  formatDiagnosticReport,
  getCapacitorShare,
  reloadBypassingCache,
  shareDiagnosticReport,
  type DiagnosticReport,
} from "./lib/diagnostics";

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export const ErrorFallback = ({ error, resetErrorBoundary }: ErrorFallbackProps) => {
  if (import.meta.env.DEV) throw error;

  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [status, setStatus] = useState<string>("");
  const [shareAvailable, setShareAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setShareAvailable(!!getCapacitorShare());
    collectDiagnostics(error).then((r) => {
      if (!cancelled) setReport(r);
    });
    return () => {
      cancelled = true;
    };
  }, [error]);

  const reportText = report ? formatDiagnosticReport(report) : "Collecting diagnostics…";

  const handleCopy = async () => {
    if (!report) return;
    const ok = await copyToClipboard(reportText);
    setStatus(ok ? "Diagnostic report copied to clipboard." : "Could not copy to clipboard.");
  };

  const handleShare = async () => {
    if (!report) return;
    const ok = await shareDiagnosticReport(report);
    setStatus(ok ? "Share dialog opened." : "Could not open share dialog.");
  };

  const handleHardReload = () => {
    setStatus("Clearing caches and reloading…");
    void reloadBypassingCache();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangleIcon />
          <AlertTitle>This app has encountered a runtime error</AlertTitle>
          <AlertDescription>
            Something unexpected happened while running the application. Use the
            diagnostic report below when reporting this issue so the maintainers
            can reproduce and fix it.
          </AlertDescription>
        </Alert>

        <div className="bg-card border rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-sm text-muted-foreground mb-2">Error Details:</h3>
          <pre className="text-xs text-destructive bg-muted/50 p-3 rounded border overflow-auto max-h-32 whitespace-pre-wrap break-words">
            {(error.name ? error.name + ": " : "") + (error.message || String(error))}
            {error.stack ? "\n\n" + error.stack : ""}
          </pre>
        </div>

        <div className="bg-card border rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-sm text-muted-foreground mb-2">Diagnostic Report:</h3>
          <pre
            className="text-xs bg-muted/50 p-3 rounded border overflow-auto max-h-64 whitespace-pre-wrap break-words"
            data-testid="diagnostic-report"
          >
            {reportText}
          </pre>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Button onClick={resetErrorBoundary} variant="outline">
            <RefreshCwIcon />
            Try Again
          </Button>
          <Button onClick={handleHardReload} variant="outline">
            <RotateCcwIcon />
            Reload App
          </Button>
          <Button onClick={handleCopy} variant="outline" disabled={!report}>
            <ClipboardCopyIcon />
            Copy Diagnostic Report
          </Button>
          {shareAvailable && (
            <Button onClick={handleShare} variant="outline" disabled={!report}>
              <Share2Icon />
              Share
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground min-h-[1em]" aria-live="polite">
          {status}
        </div>
      </div>
    </div>
  );
}
