import { useCallback, useRef, useState } from "react";
import type { DragEvent, ChangeEvent } from "react";
import { Upload } from "lucide-react";

const MAX_FILES = 20;
const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

interface FileDropzoneProps {
  onFiles: (files: File[]) => void;
  currentCount: number;
  disabled?: boolean;
}

export function FileDropzone({ onFiles, currentCount, disabled }: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filterAndWarn = useCallback(
    (raw: File[]) => {
      setWarning(null);
      const warnings: string[] = [];

      // Filter to PDFs
      let files = raw.filter((f) => {
        if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
          warnings.push(`${f.name} is not a PDF`);
          return false;
        }
        return true;
      });

      // Filter oversized
      files = files.filter((f) => {
        if (f.size > MAX_FILE_SIZE) {
          warnings.push(`${f.name} exceeds ${MAX_FILE_SIZE_MB}MB`);
          return false;
        }
        return true;
      });

      // Enforce total count
      const remaining = MAX_FILES - currentCount;
      if (files.length > remaining) {
        warnings.push(`Only ${remaining} more file${remaining === 1 ? "" : "s"} allowed (max ${MAX_FILES})`);
        files = files.slice(0, remaining);
      }

      if (warnings.length) setWarning(warnings.join(". "));
      if (files.length) onFiles(files);
    },
    [onFiles, currentCount],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      filterAndWarn(Array.from(e.dataTransfer.files));
    },
    [filterAndWarn, disabled],
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      filterAndWarn(Array.from(e.target.files ?? []));
      e.target.value = "";
    },
    [filterAndWarn],
  );

  const atLimit = currentCount >= MAX_FILES;

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        disabled={disabled || atLimit}
        className={`
          w-full rounded-xl border-2 border-dashed p-10
          flex flex-col items-center gap-3 transition-colors cursor-pointer
          ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}
          ${disabled || atLimit ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {atLimit
            ? `Maximum ${MAX_FILES} files reached`
            : "Drop PDF files here or click to browse"}
        </p>
        {!atLimit && (
          <p className="text-xs text-muted-foreground/60">
            Max {MAX_FILE_SIZE_MB}MB per file, up to {MAX_FILES} files
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          hidden
          onChange={handleChange}
        />
      </button>
      {warning && (
        <p className="text-xs text-destructive">{warning}</p>
      )}
    </div>
  );
}
