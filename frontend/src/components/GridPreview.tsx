import type { SettingsState } from "@/components/SettingsPanel";

interface GridPreviewProps {
  settings: SettingsState;
}

export function GridPreview({ settings }: GridPreviewProps) {
  const rows = settings.SLIDES_PER_COLUMN ?? 3;
  const cols = settings.SLIDES_PER_ROW ?? 2;
  const showTitle = settings.showTitles;
  const pageW = settings.PAGE_WIDTH ?? 2480;
  const pageH = settings.PAGE_HEIGHT ?? 3508;
  const margin = settings.MARGIN ?? 10;

  const aspect = pageW / pageH;
  const previewH = 140;
  const previewW = previewH * aspect;

  // Exaggerated mapping so spacing differences are clearly visible
  // None=0 → 2px, Tight=5 → 4px, Normal=10 → 7px, Wide=30 → 14px
  const pad = margin === 0 ? 2 : Math.min(16, 3 + margin * 0.4);
  const gap = margin === 0 ? 0 : Math.max(1, pad * 0.5);

  const titleHeight = settings.TITLE_HEIGHT ?? 200;
  const titleFrac = showTitle ? titleHeight / pageH : 0;
  const innerW = previewW - pad * 2;
  const innerH = previewH - pad * 2;
  const titleH = innerH * titleFrac;
  const gridTop = pad + titleH;
  const gridH = innerH - titleH;

  const cellW = (innerW - gap * (cols - 1)) / cols;
  const cellH = (gridH - gap * (rows - 1)) / rows;

  return (
    <div
      className="mx-auto rounded-md border border-border relative overflow-hidden"
      style={{ width: previewW, height: previewH, background: "var(--popover)" }}
    >
      {/* Page background showing margin as visible border */}
      <div
        className="absolute rounded-sm"
        style={{
          left: pad,
          top: pad,
          width: innerW,
          height: innerH,
          background: "transparent",
        }}
      />

      {/* Title bar */}
      {showTitle && (
        <div
          className="absolute bg-muted-foreground/20 rounded-sm"
          style={{
            left: pad + innerW * 0.2,
            top: pad + titleH * 0.15,
            width: innerW * 0.6,
            height: Math.max(2, titleH * 0.7),
          }}
        />
      )}

      {/* Grid cells */}
      {Array.from({ length: rows * cols }).map((_, i) => {
        const row = i % rows;
        const col = Math.floor(i / rows);
        const x = pad + col * (cellW + gap);
        const y = gridTop + row * (cellH + gap);
        return (
          <div
            key={i}
            className="absolute rounded-[2px] border border-border bg-muted/40"
            style={{
              left: x,
              top: y,
              width: cellW,
              height: cellH,
            }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[7px] text-muted-foreground/60">{i + 1}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
