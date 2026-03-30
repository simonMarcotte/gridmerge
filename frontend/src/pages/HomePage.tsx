import { Link } from "react-router";
import { ArrowRight, FileUp, GripVertical, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: FileUp,
    title: "Upload PDFs",
    description: "Drag and drop multiple PDF files to get started.",
  },
  {
    icon: GripVertical,
    title: "Reorder",
    description: "Arrange your PDFs in the exact order you need.",
  },
  {
    icon: Download,
    title: "Download",
    description: "Get a single merged PDF with configurable grid layout.",
  },
];

export function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-24 flex flex-col items-center text-center gap-12">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Merge PDFs into a grid
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Upload your lecture slides, handouts, or documents and combine them
          into a single, neatly arranged grid PDF.
        </p>
      </div>

      <Button asChild size="lg" className="gap-2">
        <Link to="/upload">
          Get started
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>

      <div className="grid sm:grid-cols-3 gap-6 w-full mt-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-border bg-card p-6 text-left flex flex-col gap-3"
          >
            <f.icon className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
