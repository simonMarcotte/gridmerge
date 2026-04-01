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
  const pad = margin === 0 ? 2 : Math.min(16, 3 + margin * 0.4);
  const gap = margin === 0 ? 0 : Math.max(1, pad * 0.5);

  const titleHeight = settings.TITLE_HEIGHT ?? 200;
  const titleFrac = showTitle ? titleHeight / pageH : 0;

  // Calculate grid area
  const titleH = previewH * titleFrac;
  const gridAreaH = previewH - pad * 2 - titleH;
  const gridAreaW = previewW - pad * 2;

  const totalGapX = gap * (cols - 1);
  const totalGapY = gap * (rows - 1);
  const cellW = (gridAreaW - totalGapX) / cols;
  const cellH = (gridAreaH - totalGapY) / rows;

  // Center the grid within the page
  const gridTotalW = cols * cellW + totalGapX;
  const gridTotalH = rows * cellH + totalGapY;
  const offsetX = pad + (gridAreaW - gridTotalW) / 2;
  const offsetY = pad + titleH + (gridAreaH - gridTotalH) / 2;

  return (
    <div
      className="mx-auto rounded-sm border border-border relative overflow-hidden"
      style={{ width: previewW, height: previewH, background: "var(--popover)" }}
    >
      {/* Title bar */}
      {showTitle && (
        <div
          className="absolute bg-muted-foreground/20 rounded-sm"
          style={{
            left: pad + gridAreaW * 0.2,
            top: pad + titleH * 0.15,
            width: gridAreaW * 0.6,
            height: Math.max(2, titleH * 0.7),
          }}
        />
      )}

      {/* Grid cells */}
      {Array.from({ length: rows * cols }).map((_, i) => {
        const row = i % rows;
        const col = Math.floor(i / rows);
        const x = offsetX + col * (cellW + gap);
        const y = offsetY + row * (cellH + gap);
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
