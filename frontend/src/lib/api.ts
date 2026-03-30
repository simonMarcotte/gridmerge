// In dev: "http://localhost:8000", in prod: "" (same domain via CloudFront)
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export interface MergeOptions {
  PAGE_WIDTH?: number;
  PAGE_HEIGHT?: number;
  MARGIN?: number;
  TITLE_HEIGHT?: number;
  SLIDES_PER_COLUMN?: number;
  SLIDES_PER_ROW?: number;
  DPI_SCALE?: number;
}

export interface JobStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  progress_message: string;
  total_pdfs: number;
  processed_pdfs: number;
  output_filename: string | null;
  output_pages: number | null;
  output_size: number | null;
  error: string | null;
}

export interface MergeResult {
  blob: Blob;
  name: string;
  size: number;
  pages: number;
}

async function submitJob(
  files: File[],
  options?: MergeOptions,
): Promise<string> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  if (options) {
    formData.append("options", JSON.stringify(options));
  }

  const res = await fetch(`${API_BASE}/api/jobs`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload failed (${res.status})`);
  }

  const data = await res.json();
  return data.job_id;
}

async function pollJob(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
  if (!res.ok) {
    throw new Error(`Failed to get job status (${res.status})`);
  }
  return res.json();
}

async function downloadJob(jobId: string): Promise<MergeResult> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/download`);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }

  const blob = await res.blob();
  return {
    blob,
    name: res.headers.get("X-PDF-Name") ?? "merged.pdf",
    size: Number(res.headers.get("X-PDF-Size") ?? blob.size),
    pages: Number(res.headers.get("X-PDF-Pages") ?? 0),
  };
}

export async function mergePdfs(
  files: File[],
  options?: MergeOptions,
  onProgress?: (status: JobStatus) => void,
): Promise<JobStatus> {
  const jobId = await submitJob(files, options);

  // Poll until done — returns job metadata (not the blob yet)
  while (true) {
    await new Promise((r) => setTimeout(r, 800));
    const status = await pollJob(jobId);
    onProgress?.(status);

    if (status.status === "completed") {
      return status;
    }
    if (status.status === "failed") {
      throw new Error(status.error ?? "Merge failed");
    }
  }
}

export async function downloadMergedPdf(jobId: string): Promise<Blob> {
  const result = await downloadJob(jobId);
  return result.blob;
}
