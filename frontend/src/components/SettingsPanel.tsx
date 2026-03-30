import { useState } from "react";
import { Settings, Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GridPreview } from "@/components/GridPreview";
import type { MergeOptions } from "@/lib/api";

const PAGE_SIZES: Record<string, { PAGE_WIDTH: number; PAGE_HEIGHT: number }> = {
  A4: { PAGE_WIDTH: 2480, PAGE_HEIGHT: 3508 },
  Letter: { PAGE_WIDTH: 2550, PAGE_HEIGHT: 3300 },
};

const QUALITY_PRESETS: Record<string, number> = {
  Draft: 1,
  Standard: 2,
  High: 4,
  Ultra: 6,
};

const TITLE_SIZE_PRESETS: Record<string, number> = {
  Small: 120,
  Medium: 200,
  Large: 300,
};

const MARGIN_PRESETS: Record<string, number> = {
  None: 0,
  Tight: 5,
  Normal: 10,
  Wide: 30,
};

export interface SettingsState extends MergeOptions {
  showTitles: boolean;
}

export const DEFAULT_SETTINGS: SettingsState = {
  PAGE_WIDTH: 2480,
  PAGE_HEIGHT: 3508,
  MARGIN: 10,
  TITLE_HEIGHT: 200,
  SLIDES_PER_ROW: 2,
  SLIDES_PER_COLUMN: 3,
  DPI_SCALE: 4,
  showTitles: true,
};

interface SettingsPanelProps {
  settings: SettingsState;
  onChange: (settings: SettingsState) => void;
}

function HintLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 text-sm shrink-0 cursor-default">
          {label}
          <Info className="h-3 w-3 text-muted-foreground/50" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-52 text-xs">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}

function ToggleGroup({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  options: Record<string, number>;
  value: number;
  onChange: (v: number) => void;
}) {
  const active = Object.entries(options).find(([, v]) => v === value)?.[0];
  return (
    <div className="flex items-center justify-between gap-3">
      <HintLabel label={label} hint={hint} />
      <div className="flex gap-1">
        {Object.entries(options).map(([name, v]) => (
          <button
            key={name}
            type="button"
            onClick={() => onChange(v)}
            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
              active === name
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

function ValidatedNumberInput({
  value,
  onCommit,
  min,
  max,
  fallback,
  className,
}: {
  value: number;
  onCommit: (v: number) => void;
  min: number;
  max: number;
  fallback: number;
  className?: string;
}) {
  const [text, setText] = useState(String(value));
  const [error, setError] = useState(false);

  const lastCommitted = useState({ v: value })[0];
  if (lastCommitted.v !== value) {
    lastCommitted.v = value;
    setText(String(value));
    setError(false);
  }

  function validate(raw: string) {
    const n = parseInt(raw, 10);
    if (raw === "" || isNaN(n) || n < min || n > max) return null;
    return n;
  }

  const hasError = error || text === "";

  return (
    <Tooltip open={hasError ? undefined : false}>
      <TooltipTrigger asChild>
        <Input
          type="text"
          inputMode="numeric"
          value={text}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, "");
            setText(raw);
            const n = validate(raw);
            if (n !== null) {
              setError(false);
              onCommit(n);
              lastCommitted.v = n;
            } else {
              setError(raw !== "");
            }
          }}
          onBlur={() => {
            const n = validate(text);
            if (n !== null) {
              setError(false);
              onCommit(n);
              lastCommitted.v = n;
            } else {
              setError(false);
              setText(String(fallback));
              onCommit(fallback);
              lastCommitted.v = fallback;
            }
          }}
          aria-invalid={hasError ? "true" : undefined}
          className={className}
        />
      </TooltipTrigger>
      {hasError && (
        <TooltipContent side="bottom" className="text-xs text-destructive">
          {text === "" ? "Required" : `Must be ${min}\u2013${max}`}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const currentSize =
    Object.entries(PAGE_SIZES).find(
      ([, v]) =>
        v.PAGE_WIDTH === settings.PAGE_WIDTH &&
        v.PAGE_HEIGHT === settings.PAGE_HEIGHT,
    )?.[0] ?? "Custom";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Merge settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 flex flex-col gap-4" align="end">
        <p className="text-sm font-medium">Grid settings</p>

        <GridPreview settings={settings} />

        <Separator />

        {/* Page size */}
        <div className="flex items-center justify-between gap-3">
          <HintLabel label="Page size" hint="Output PDF page dimensions." />
          <div className="flex gap-1">
            {Object.keys(PAGE_SIZES).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onChange({ ...settings, ...PAGE_SIZES[name] })}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  currentSize === name
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Grid layout */}
        <div className="flex items-center justify-between gap-3">
          <HintLabel label="Grid" hint="How many slides to fit on each page of the output." />
          <div className="flex items-center gap-1.5">
            <ValidatedNumberInput
              value={settings.SLIDES_PER_COLUMN!}
              onCommit={(v) => update("SLIDES_PER_COLUMN", v)}
              min={1}
              max={10}
              fallback={3}
              className="w-14 text-center"
            />
            <span className="text-xs text-muted-foreground">rows</span>
            <span className="text-muted-foreground mx-0.5">x</span>
            <ValidatedNumberInput
              value={settings.SLIDES_PER_ROW!}
              onCommit={(v) => update("SLIDES_PER_ROW", v)}
              min={1}
              max={10}
              fallback={2}
              className="w-14 text-center"
            />
            <span className="text-xs text-muted-foreground">cols</span>
          </div>
        </div>

        <Separator />

        {/* Titles */}
        <div className="flex items-center justify-between gap-3">
          <HintLabel
            label="Show titles"
            hint="Adds the PDF filename as a heading on the first page of each document in the grid."
          />
          <Switch
            checked={settings.showTitles}
            onCheckedChange={(v) => update("showTitles", v)}
          />
        </div>
        {settings.showTitles && (
          <ToggleGroup
            label="Title size"
            hint="How much vertical space to reserve for the title heading."
            options={TITLE_SIZE_PRESETS}
            value={settings.TITLE_HEIGHT!}
            onChange={(v) => update("TITLE_HEIGHT", v)}
          />
        )}

        <Separator />

        <ToggleGroup
          label="Spacing"
          hint="Gap between slides and around the page edges."
          options={MARGIN_PRESETS}
          value={settings.MARGIN!}
          onChange={(v) => update("MARGIN", v)}
        />

        <ToggleGroup
          label="Quality"
          hint="Higher quality extracts slides at greater resolution. Looks sharper but takes longer to process."
          options={QUALITY_PRESETS}
          value={settings.DPI_SCALE!}
          onChange={(v) => update("DPI_SCALE", v)}
        />
      </PopoverContent>
    </Popover>
  );
}
