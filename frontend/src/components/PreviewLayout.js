"use client";

import React, { useRef, useEffect } from "react";

export default function PreviewLayout({ options }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Scale down the drawing if the page width is too large.
    const scale = Math.min(1, 500 / options.PAGE_WIDTH);
    canvas.width = options.PAGE_WIDTH * scale;
    canvas.height = options.PAGE_HEIGHT * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and fill background in white.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Scaled values.
    const pageWidth = options.PAGE_WIDTH * scale;
    const pageHeight = options.PAGE_HEIGHT * scale;
    const margin = options.MARGIN * scale;
    const titleHeight = options.TITLE_HEIGHT * scale;
    const slidesPerRow = options.SLIDES_PER_ROW;
    const slidesPerColumn = options.SLIDES_PER_COLUMN;

    // Draw title area outline (outlined in black).
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.strokeRect(margin, margin, pageWidth - 2 * margin, titleHeight);

    // Calculate grid starting Y (below the title area).
    const gridTop = margin + titleHeight;
    const availableHeight = pageHeight - gridTop - margin;
    // Compute each cell's width and height.
    const cellWidth = (pageWidth - (slidesPerRow + 1) * margin) / slidesPerRow;
    const cellHeight = (availableHeight - (slidesPerColumn - 1) * margin) / slidesPerColumn;

    // Draw grid cells (outlined in black).
    for (let row = 0; row < slidesPerColumn; row++) {
      for (let col = 0; col < slidesPerRow; col++) {
        const x = margin + col * (cellWidth + margin);
        const y = gridTop + row * (cellHeight + margin);
        ctx.strokeRect(x, y, cellWidth, cellHeight);
      }
    }

    // Draw blue dotted lines between each column.
    const dotLength = 5 * scale;
    const gap = 5 * scale;
    const gridBottom = gridTop + slidesPerColumn * cellHeight + (slidesPerColumn - 1) * margin;
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    for (let col = 1; col < slidesPerRow; col++) {
      let x = margin + col * (cellWidth + margin) - margin / 2;
      let y = gridTop;
      while (y < gridBottom) {
        const yEnd = Math.min(y + dotLength, gridBottom);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, yEnd);
        ctx.stroke();
        y += dotLength + gap;
      }
    }
  }, [options]);

  return <canvas ref={canvasRef} style={{ border: "1px solid #ddd", width: "100%", height: "auto" }} />;
}
