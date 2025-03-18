"use client";

import React from "react";

export default function PDFPreview({ mergedUrl }) {
  return (
    <div className="border rounded p-2">
      {mergedUrl ? (
        <iframe src={mergedUrl} title="PDF Preview" className="w-full h-96" />
      ) : (
        <p className="text-sm text-muted-foreground">No preview available</p>
      )}
    </div>
  );
}
