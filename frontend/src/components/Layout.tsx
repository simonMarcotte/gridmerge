import { Outlet, Link, useLocation } from "react-router";
import { Grid3X3 } from "lucide-react";

export function Layout() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <nav className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Grid3X3 className="h-5 w-5" />
            GridMerge
          </Link>
          {isHome && (
            <Link
              to="/upload"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Upload
            </Link>
          )}
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
