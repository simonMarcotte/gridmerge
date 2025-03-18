"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2,
  FileIcon,
  DownloadIcon,
  Trash2Icon,
  Edit2Icon,
} from "lucide-react";

import FileUploader from "@/components/FileUploader";
import OptionsDialog from "@/components/OptionsDialog";
import PDFPreview from "@/components/PDFPreview";

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mergedUrl, setMergedUrl] = useState("");
  const [fileMeta, setFileMeta] = useState(null);
  const [openOptions, setOpenOptions] = useState(false);
  const [downloadName, setDownloadName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(downloadName);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    else return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMergedUrl("");
    setFileMeta(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const storedOptions = localStorage.getItem("pdfMergeOptions");
      if (storedOptions) {
        formData.append("options", storedOptions);
      }

      const response = await fetch("http://localhost:8000/merge-pdfs/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to merge PDFs");
      }

      // Extract metadata from headers
      const name = response.headers.get("X-PDF-Name") || "merged_slides.pdf";
      const size = parseInt(response.headers.get("X-PDF-Size") || "0", 10);
      const pages = parseInt(response.headers.get("X-PDF-Pages") || "0", 10);

      // Log headers for debugging
      console.log("X-PDF-Name:", response.headers.get("X-PDF-Name"));
      console.log("X-PDF-Size:", response.headers.get("X-PDF-Size"));
      console.log("X-PDF-Pages:", response.headers.get("X-PDF-Pages"));
      for (const [key, value] of response.headers.entries()) {
        console.log(`${key}: ${value}`);
      }

      // Create blob URL for the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      setMergedUrl(url);
      setFileMeta({ name, size, pages });
      setDownloadName(name);
    } catch (err) {
      setError(err.message);
      console.error("Error merging PDFs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = mergedUrl;
    link.download = downloadName || fileMeta?.name || "merged_slides.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleClearMerge = () => {
    setMergedUrl("");
    setFileMeta(null);
  };

  // Merged Result Component with editable download name
  const MergedResult = () => {
    if (!fileMeta) return null;

    const handleNameSubmit = () => {
      setDownloadName(tempName);
      setIsEditing(false);
    };

    return (
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <FileIcon className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium flex items-center">
                  {isEditing ? (
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onBlur={handleNameSubmit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleNameSubmit();
                        }
                      }}
                      className="border border-gray-300 rounded p-1"
                      autoFocus
                    />
                  ) : (
                    <>
                      {downloadName}
                      <Edit2Icon
                        className="ml-2 h-4 w-4 text-muted-foreground cursor-pointer"
                        onClick={() => {
                          setTempName(downloadName);
                          setIsEditing(true);
                        }}
                      />
                    </>
                  )}
                </p>
                <div className="text-sm text-muted-foreground flex space-x-2">
                  <span>{formatFileSize(fileMeta.size)}</span>
                  <span>•</span>
                  <span>{fileMeta.pages} pages</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleDownload}
                title="Download"
              >
                <DownloadIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={handleClearMerge}
                title="Clear"
              >
                <Trash2Icon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md relative">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold">Upload PDFs</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Choose up to 10 PDF files and arrange their order.
          </CardDescription>
          <div className="absolute top-4 right-4">
            <OptionsDialog open={openOptions} setOpen={setOpenOptions} />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FileUploader files={files} setFiles={setFiles} />
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            <div className="flex justify-center">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={files.length === 0 || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  "Generate PDF"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {mergedUrl && (
        <div className="w-full max-w-md mt-6">
          <Tabs defaultValue="result">
            <TabsList>
              <TabsTrigger value="result">Result</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="result">
              <MergedResult />
            </TabsContent>
            <TabsContent value="preview">
              <PDFPreview mergedUrl={mergedUrl} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      <footer className="mt-8 text-sm text-muted-foreground flex gap-4 items-center">
        <Link href="/" className="hover:underline">
          Back to Home
        </Link>
        <span>|</span>
        <span>&copy; {new Date().getFullYear()} GridMerge</span>
      </footer>
    </div>
  );
}
