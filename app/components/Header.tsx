"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";

export default function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/eldes/api/auth/status", {
          credentials: "include",
        });
        const data = await response.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileNavRef.current &&
        !mobileNavRef.current.contains(event.target as Node)
      ) {
        setMobileNavOpen(false);
      }
    };

    if (mobileNavOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [mobileNavOpen]);

  const handleLogout = async () => {
    try {
      await fetch("/eldes/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/eldes/login");
      router.refresh();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + "/");
  };

  const navItems = [
    { href: "/eldes", label: "Dashboard", icon: null },
    { href: "/eldes/credentials", label: "Credentials", icon: null },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-header bg-surface border-b transition-all ${
          isScrolled ? "border-border shadow-sm" : "border-border"
        }`}
      >
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/eldes" className="flex items-center gap-3">
              <img
                src="/assets/logo.png"
                alt="ELDES Monitor Logo"
                className="h-8 w-auto"
              />
              <span className="text-xl font-semibold text-text-primary hidden sm:inline">
                ELDES Monitor
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-accent/20 text-accent"
                      : "text-text-secondary hover:text-text-primary hover:bg-border"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* User Info & Logout */}
            <div className="flex items-center gap-4">
              {user && (
                <div className="hidden sm:flex items-center gap-3">
                  <span className="text-sm text-text-secondary">
                    {user.username}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-border rounded-md transition-colors"
                    aria-label="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden lg:inline">Logout</span>
                  </button>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="md:hidden p-2 text-text-secondary hover:text-text-primary hover:bg-border rounded-md transition-colors"
                aria-label="Toggle menu"
              >
                {mobileNavOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      {mobileNavOpen &&
        createPortal(
          <div className="fixed inset-0 z-mobile-nav md:hidden">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileNavOpen(false)}
            />
            <div
              ref={mobileNavRef}
              className="absolute right-0 top-0 h-full w-64 bg-surface border-l border-border shadow-modal overflow-y-auto"
            >
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-text-primary">
                    Menu
                  </span>
                  <button
                    onClick={() => setMobileNavOpen(false)}
                    className="p-2 text-text-secondary hover:text-text-primary hover:bg-border rounded-md transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {user && (
                  <div className="text-sm text-text-secondary">
                    {user.username}
                  </div>
                )}
              </div>

              <nav className="p-4 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? "bg-accent/20 text-accent"
                        : "text-text-secondary hover:text-text-primary hover:bg-border"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                {user && (
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileNavOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-border rounded-md transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                )}
              </nav>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

