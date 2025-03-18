"use client";

import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUp, FileText, GripVertical, X } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const MAX_FILES = 10;

export default function FileUploader({ files, setFiles }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (newFiles) => {
    const combinedFiles = [...files, ...newFiles].slice(0, MAX_FILES);
    setFiles(combinedFiles);
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    addFiles(newFiles);
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        (file) => file.type === "application/pdf"
      );
      addFiles(droppedFiles);
    },
    [files]
  );

  const handleDeleteFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedFiles = Array.from(files);
    const [reorderedItem] = reorderedFiles.splice(result.source.index, 1);
    reorderedFiles.splice(result.destination.index, 0, reorderedItem);
    setFiles(reorderedFiles);
  };

  return (
    <div
      className="w-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={`grid w-full max-w-sm items-center gap-3 p-4 border-2 border-dashed rounded-lg text-center 
          ${dragOver ? "border-primary bg-primary/10" : "border-border"}`}
      >
        <Input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center">
          <FileUp className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            {dragOver
              ? "Drop your PDFs here"
              : "Drag and drop PDFs or click to select"}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current.click()}
            disabled={files.length >= MAX_FILES}
            className="mt-2"
          >
            Select PDFs
          </Button>
        </div>
      </div>
      {files.length >= MAX_FILES && (
        <p className="text-sm text-red-500 text-center">
          Maximum of {MAX_FILES} files reached
        </p>
      )}
      {files.length > 0 && (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="pdf-list">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2 mt-4"
              >
                {files.map((file, index) => (
                  <Draggable
                    key={`${file.name}-${index}`}
                    draggableId={`${file.name}-${index}`}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex items-center bg-secondary p-2 rounded-md"
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="mr-2 cursor-move"
                        >
                          <GripVertical className="text-muted-foreground" />
                        </div>
                        <FileText className="mr-2 text-blue-500" />
                        <span className="flex-grow truncate mr-2">
                          {file.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteFile(index)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
