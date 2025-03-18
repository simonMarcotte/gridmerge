import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <header className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <h1 className="text-6xl font-bold">GridMerge</h1>
        <p className="mt-4 text-2xl text-muted-foreground">
          Merge your PDFs into customizable grid layouts.
        </p>
        <div className="mt-8">
          <Link href="/upload">
            <Button size="lg">Upload Your PDFs</Button>
          </Link>
        </div>
      </header>

      {/* Product Description Section */}
      <main className="flex-grow px-4 py-12">
        <section className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold">Effortless PDF Merging</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            GridMerge lets you combine multiple PDFs into one clean, organized layout.
            Whether you&apos;re preparing a presentation, a portfolio, or a comprehensive report,
            our tool makes it easy to showcase your documents in a visually appealing grid.
          </p>
        </section>

        {/* Feature Highlights */}
        <section className="max-w-5xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold">Easy to Use</h3>
            <p className="mt-2 text-muted-foreground">
              Just upload your files, choose your grid options, and merge.
            </p>
          </div>
          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold">Customizable Layouts</h3>
            <p className="mt-2 text-muted-foreground">
              Adjust the number of rows, columns, and margins to match your style.
            </p>
          </div>
          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold">Fast & Reliable</h3>
            <p className="mt-2 text-muted-foreground">
              Enjoy quick processing times and high-quality PDF output.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} GridMerge
      </footer>
    </div>
  );
}
