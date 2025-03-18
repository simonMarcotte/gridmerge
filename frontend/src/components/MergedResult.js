"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Document } from "react-pdf";

export default function MergedResult({
  mergedUrl,
  fileMeta,
  formatFileSize,
  onDownload,
  onClear,
  onDocumentLoadSuccess,
}) {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-bold">Merged PDF Ready</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Details of your merged PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {fileMeta && (
          <div className="w-full border p-4 rounded bg-muted">
            <p>
              <strong>Name:</strong> {fileMeta.name}
            </p>
            <p>
              <strong>Size:</strong> {formatFileSize(fileMeta.size)}
            </p>
            <p>
              <strong>Pages:</strong>{" "}
              {fileMeta.pages !== null ? fileMeta.pages : "Loading..."}
            </p>
          </div>
        )}
        <Button onClick={onDownload}>Download PDF</Button>
        <Button variant="outline" onClick={onClear}>
          Clear Merged Result
        </Button>
      </CardContent>
      {mergedUrl && (
        <Document
          file={mergedUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          style={{ position: "absolute", top: "-10000px", left: "-10000px" }}
        />
      )}
    </Card>
  );
}
