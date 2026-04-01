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

// --- Presigned upload flow (S3 mode: fast, parallel uploads) ---

async function submitJobPresigned(
  files: File[],
  options?: MergeOptions,
  outputName?: string,
): Promise<string> {
  // Step 1: Get presigned upload URLs from API
  const prepareRes = await fetch(`${API_BASE}/api/jobs/prepare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: files.map((f) => ({ name: f.name, size: f.size })),
      options: options ?? {},
      output_name: outputName ?? null,
    }),
  });

  if (!prepareRes.ok) {
    const text = await prepareRes.text();
    throw new Error(text || `Prepare failed (${prepareRes.status})`);
  }

  const { job_id, upload_urls } = await prepareRes.json();

  // Step 2: Upload all files directly to S3 in parallel
  const uploads = files.map((file, i) =>
    fetch(upload_urls[i].url, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": "application/pdf" },
    }).then((res) => {
      if (!res.ok) throw new Error(`Upload failed for ${file.name}`);
    }),
  );
  await Promise.all(uploads);

  // Step 3: Tell API all files are uploaded, start processing
  const startRes = await fetch(`${API_BASE}/api/jobs/${job_id}/start`, {
    method: "POST",
  });
  if (!startRes.ok) {
    throw new Error(`Failed to start job (${startRes.status})`);
  }

  return job_id;
}

// --- Legacy multipart upload flow (local storage fallback) ---

async function submitJobMultipart(
  files: File[],
  options?: MergeOptions,
  outputName?: string,
): Promise<string> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  if (options) {
    formData.append("options", JSON.stringify(options));
  }
  if (outputName) {
    formData.append("output_name", outputName);
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

// Try presigned first, fall back to multipart
async function submitJob(
  files: File[],
  options?: MergeOptions,
  outputName?: string,
): Promise<string> {
  try {
    return await submitJobPresigned(files, options, outputName);
  } catch {
    // Presigned not available (local dev) — fall back to multipart
    return await submitJobMultipart(files, options, outputName);
  }
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

  const contentType = res.headers.get("Content-Type") ?? "";

  // S3 presigned URL response (JSON with download_url)
  if (contentType.includes("application/json")) {
    const data = await res.json();
    const blobRes = await fetch(data.download_url);
    const blob = await blobRes.blob();
    return {
      blob,
      name: data.name ?? "merged.pdf",
      size: data.size ?? blob.size,
      pages: data.pages ?? 0,
    };
  }

  // Local storage: direct stream
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
  outputName?: string,
  signal?: AbortSignal,
): Promise<JobStatus> {
  const jobId = await submitJob(files, options, outputName);

  // Poll until done — returns job metadata (not the blob yet)
  while (true) {
    if (signal?.aborted) {
      await cancelJob(jobId);
      throw new DOMException("Cancelled", "AbortError");
    }
    await new Promise((r) => setTimeout(r, 800));
    const status = await pollJob(jobId);
    status.id = jobId;
    onProgress?.(status);

    if (status.status === "completed") {
      return status;
    }
    if (status.status === "failed") {
      throw new Error(status.error ?? "Merge failed");
    }
  }
}

export async function cancelJob(jobId: string): Promise<void> {
  await fetch(`${API_BASE}/api/jobs/${jobId}/cancel`, { method: "POST" });
}

export async function downloadMergedPdf(jobId: string): Promise<Blob> {
  const result = await downloadJob(jobId);
  return result.blob;
}
