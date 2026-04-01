import { useState, useCallback } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { SortableFileList } from "@/components/SortableFileList";
import type { PdfItem } from "@/components/SortableFileList";
import { SettingsPanel, DEFAULT_SETTINGS } from "@/components/SettingsPanel";
import type { SettingsState } from "@/components/SettingsPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileText, X } from "lucide-react";
import { mergePdfs, downloadMergedPdf } from "@/lib/api";
import type { MergeOptions, JobStatus } from "@/lib/api";

let nextId = 0;

function settingsToOptions(s: SettingsState): MergeOptions {
  return {
    PAGE_WIDTH: s.PAGE_WIDTH,
    PAGE_HEIGHT: s.PAGE_HEIGHT,
    MARGIN: s.MARGIN,
    TITLE_HEIGHT: s.showTitles ? s.TITLE_HEIGHT : 0,
    SLIDES_PER_ROW: s.SLIDES_PER_ROW,
    SLIDES_PER_COLUMN: s.SLIDES_PER_COLUMN,
    DPI_SCALE: s.DPI_SCALE,
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadPage() {
  const [items, setItems] = useState<PdfItem[]>([]);
  const [outputName, setOutputName] = useState("merged");
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<JobStatus | null>(null);
  const [result, setResult] = useState<JobStatus | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback((files: File[]) => {
    const newItems = files.map((file) => ({
      id: `pdf-${++nextId}`,
      file,
    }));
    setItems((prev) => [...prev, ...newItems]);
    setError(null);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleMerge = async () => {
    if (items.length < 1) return;
    setLoading(true);
    setError(null);
    setProgress(null);
    setResult(null);
    try {
      const name = outputName.trim() || "merged";
      const job = await mergePdfs(
        items.map((i) => i.file),
        settingsToOptions(settings),
        (status) => setProgress(status),
        `${name.replace(/\.pdf$/i, "")}.pdf`,
      );
      setResult(job);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    setDownloading(true);
    try {
      const blob = await downloadMergedPdf(result.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const name = outputName.trim()
        ? `${outputName.trim().replace(/\.pdf$/i, "")}.pdf`
        : "merged.pdf";
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upload PDFs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add your files, drag to reorder, then merge.
          </p>
        </div>
        <SettingsPanel settings={settings} onChange={setSettings} />
      </div>

      <FileDropzone onFiles={addFiles} currentCount={items.length} disabled={loading} />

      <SortableFileList items={items} onReorder={setItems} onRemove={removeItem} />

      {items.length > 0 && !result && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1 flex flex-col gap-1.5">
              <label htmlFor="output-name" className="text-sm font-medium">
                Output filename
              </label>
              <div className="flex items-stretch">
                <Input
                  id="output-name"
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                  placeholder="merged"
                  className="rounded-r-none border-r-0"
                  disabled={loading}
                />
                <span className="inline-flex items-center rounded-r-lg border border-input bg-muted px-3 text-sm text-muted-foreground">
                  .pdf
                </span>
              </div>
            </div>
            <Button
              onClick={handleMerge}
              disabled={loading || items.length < 1}
              className="gap-2 sm:w-auto"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {loading ? "Merging..." : "Merge"}
            </Button>
          </div>

          {loading && progress && (
            <div className="flex flex-col gap-1.5">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {progress.progress_message || "Starting..."}
              </p>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2.5">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {outputName.trim()
                    ? `${outputName.trim().replace(/\.pdf$/i, "")}.pdf`
                    : "merged.pdf"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {result.output_pages} {result.output_pages === 1 ? "page" : "pages"}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {formatSize(result.output_size ?? 0)}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={handleDownload} disabled={downloading} className="gap-2">
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading ? "Downloading..." : "Download"}
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
