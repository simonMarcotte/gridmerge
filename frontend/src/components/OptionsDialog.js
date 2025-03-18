"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import PreviewLayout from "@/components/PreviewLayout";

const PAGE_SIZES = {
  A4: { PAGE_WIDTH: 2480, PAGE_HEIGHT: 3508 },
  Letter: { PAGE_WIDTH: 2550, PAGE_HEIGHT: 3300 },
};

export default function OptionsDialog({ open, setOpen }) {
  // Local state for options.
  const [pageSize, setPageSize] = useState("A4");
  const [orientation, setOrientation] = useState("Portrait");
  const [titleHeightPercent, setTitleHeightPercent] = useState(100);
  const [margin, setMargin] = useState(10);
  const [dpiScale, setDpiScale] = useState(4);
  const [slidesPerColumn, setSlidesPerColumn] = useState(3);
  const [slidesPerRow, setSlidesPerRow] = useState(2);

  // Calculate page dimensions based on pageSize and orientation.
  const baseSize = PAGE_SIZES[pageSize];
  const computedSize =
    orientation === "Portrait"
      ? baseSize
      : { PAGE_WIDTH: baseSize.PAGE_HEIGHT, PAGE_HEIGHT: baseSize.PAGE_WIDTH };

  // Build preview options.
  const previewOptions = {
    ...computedSize,
    TITLE_HEIGHT: 200 * (Number(titleHeightPercent) / 100),
    MARGIN: Number(margin),
    SLIDES_PER_COLUMN: Number(slidesPerColumn),
    SLIDES_PER_ROW: Number(slidesPerRow),
  };

  const saveOptions = () => {
    const TITLE_HEIGHT = 200 * (Number(titleHeightPercent) / 100);
    const baseSize = PAGE_SIZES[pageSize];
    const computedSize =
      orientation === "Portrait"
        ? baseSize
        : { PAGE_WIDTH: baseSize.PAGE_HEIGHT, PAGE_HEIGHT: baseSize.PAGE_WIDTH };

    const options = {
      ...computedSize,
      TITLE_HEIGHT,
      MARGIN: Number(margin),
      DPI_SCALE: Number(dpiScale),
      SLIDES_PER_COLUMN: Number(slidesPerColumn),
      SLIDES_PER_ROW: Number(slidesPerRow),
    };
    localStorage.setItem("pdfMergeOptions", JSON.stringify(options));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="p-2">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Merge Options</DialogTitle>
          <DialogDescription>
            Customize your PDF merge settings and preview layout.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col md:flex-row gap-4 py-4">
          {/* Options Form */}
          <div className="flex-1">
            <div className="grid gap-4">
              {/* Page Size */}
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm font-medium">Page Size</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value)}
                  className="col-span-1 rounded border p-2"
                >
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                </select>
              </div>
              {/* Orientation */}
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm font-medium">Orientation</label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value)}
                  className="col-span-1 rounded border p-2"
                >
                  <option value="Portrait">Portrait</option>
                  <option value="Landscape">Landscape</option>
                </select>
              </div>
              {/* Title Height Percentage */}
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm font-medium">
                  Title Height (% of 200px)
                </label>
                <Input
                  type="number"
                  value={titleHeightPercent}
                  onChange={(e) => setTitleHeightPercent(e.target.value)}
                />
              </div>
              {/* Margin */}
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm font-medium">Margin (px)</label>
                <Input
                  type="number"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                />
              </div>
              {/* DPI Scale */}
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm font-medium">DPI Scale</label>
                <Input
                  type="number"
                  value={dpiScale}
                  onChange={(e) => setDpiScale(e.target.value)}
                />
              </div>
              {/* Slides Per Column */}
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm font-medium">Slides per Column</label>
                <Input
                  type="number"
                  value={slidesPerColumn}
                  onChange={(e) => setSlidesPerColumn(e.target.value)}
                />
              </div>
              {/* Slides Per Row */}
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm font-medium">Slides per Row</label>
                <Input
                  type="number"
                  value={slidesPerRow}
                  onChange={(e) => setSlidesPerRow(e.target.value)}
                />
              </div>
            </div>
          </div>
          {/* Preview Section (aligned to the top) */}
          <div className="flex-1 flex flex-col items-start">
            <PreviewLayout options={previewOptions} />
          </div>
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={saveOptions}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
