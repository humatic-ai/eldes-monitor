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
    <footer className="pt-6 pb-5 px-4 md:px-8 border-t border-border mt-8">
      <div className="max-w-container mx-auto relative">
        <ul className="list-none flex justify-center gap-3 mb-1.5 relative">
          <li>
            <Link
              href="/"
              className="no-underline text-text-secondary transition-colors duration-300 text-xs font-medium hover:text-text-primary"
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              href="/credentials"
              className="no-underline text-text-secondary transition-colors duration-300 text-xs font-medium hover:text-text-primary"
            >
              Credentials
            </Link>
          </li>
          <li className="absolute right-0 top-1/2 -translate-y-1/2">
            <a
              href="https://www.linkedin.com/company/humaticai/"
              target="_blank"
              rel="noopener"
              aria-label="LinkedIn"
              className="inline-flex items-center leading-none text-text-secondary transition-colors duration-300 hover:text-text-primary"
            >
              <Linkedin className="w-4 h-4" aria-hidden="true" />
            </a>
          </li>
        </ul>
        <p className="text-center text-text-secondary text-xs m-0">
          &copy; {currentYear} HumaticAI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
