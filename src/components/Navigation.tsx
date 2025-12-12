import { Link } from "react-router-dom";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

export default function Navigation() {
  const [open, setOpen] = useState(false);

  return (
    <header className="text-primary w-full border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-semibold text-lg flex items-center gap-3">
          <span className="inline-block w-9 h-9 rounded-md bg-linear-to-br from-(--color-primary) to-(--color-accent) shadow-md" />
          <span>Boilerplate</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <nav className="flex gap-4 items-center">
            <Link
              to="/"
              className="text-sm text-gray-700 dark:text-gray-200 hover:underline"
            >
              Home
            </Link>
            <Link
              to="/stores"
              className="text-sm text-gray-700 dark:text-gray-200 hover:underline"
            >
              Stores
            </Link>
            <Link
              to="/about"
              className="text-sm text-gray-700 dark:text-gray-200 hover:underline"
            >
              About
            </Link>
            <Link
              to="/contact"
              className="text-sm text-gray-700 dark:text-gray-200 hover:underline"
            >
              Contact
            </Link>
          </nav>
          <ThemeToggle />
        </div>

        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((s) => !s)}
            className="p-2 rounded-md border bg-white/60 dark:bg-gray-800/60"
          >
            <svg
              className="w-5 h-5 text-gray-700 dark:text-gray-200"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              {open ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-white/90 dark:bg-gray-900/95 border-t">
          <div className="container mx-auto px-6 py-4 flex flex-col gap-3">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="text-base text-gray-800 dark:text-gray-100"
            >
              Home
            </Link>
            <Link
              to="/stores"
              onClick={() => setOpen(false)}
              className="text-base text-gray-800 dark:text-gray-100"
            >
              Stores
            </Link>
            <Link
              to="/about"
              onClick={() => setOpen(false)}
              className="text-base text-gray-800 dark:text-gray-100"
            >
              About
            </Link>
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="text-base text-gray-800 dark:text-gray-100"
            >
              Contact
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
