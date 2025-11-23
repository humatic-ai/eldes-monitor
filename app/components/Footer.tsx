"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Linkedin } from "lucide-react";

export default function Footer() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="bg-surface border-t border-border mt-auto">
      <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-text-secondary text-center sm:text-left">
            <p>
              © {currentYear} ELDES ESIM364 Monitor. All rights reserved.
            </p>
            <p className="mt-1">
              Fork of{" "}
              <a
                href="https://github.com/augustas2/eldes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent-hover underline"
              >
                augustas2/eldes
              </a>{" "}
              and{" "}
              <a
                href="https://github.com/tanelvakker/eldes-cloud-api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent-hover underline"
              >
                tanelvakker/eldes-cloud-api
              </a>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://www.linkedin.com/company/humatic-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-accent transition-colors"
              aria-label="HumaticAI LinkedIn"
            >
              <Linkedin className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

