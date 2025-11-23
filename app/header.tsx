"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";

export default function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef<HTMLElement>(null);
  const underlineRef = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch by only rendering client-side interactive elements after mount
  useEffect(() => {
    setMounted(true);
    checkAuthStatus();
    // Check auth status periodically to keep it in sync
    const interval = setInterval(checkAuthStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/eldes/api/auth/status", {
        credentials: "include",
      });
      const data = await response.json();
      setAuthenticated(data.authenticated || false);
      setUsername(data.username || null);
    } catch (error) {
      console.error("Error checking auth status:", error);
      setAuthenticated(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/eldes/api/auth/logout", { 
        method: "POST",
        credentials: "include",
      });
      setAuthenticated(false);
      setUsername(null);
      // Next.js has basePath: "/eldes", so use "/login" - Next.js will prepend basePath automatically
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
    document.body.classList.remove("mobile-nav-open");
  }, [pathname]);

  const updateUnderlinePosition = () => {
    if (!navRef.current || !underlineRef.current) return;
    
    const activeLink = navRef.current.querySelector("a.active") as HTMLElement;
    if (activeLink) {
      const navRect = navRef.current.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      underlineRef.current.style.left = `${linkRect.left - navRect.left}px`;
      underlineRef.current.style.width = `${linkRect.width}px`;
    } else {
      underlineRef.current.style.width = "0px";
    }
  };

  useEffect(() => {
    if (!mounted) return;
    
    // Position nav underline to match active link
    updateUnderlinePosition();
    
    // Update on window resize
    window.addEventListener("resize", updateUnderlinePosition);
    return () => window.removeEventListener("resize", updateUnderlinePosition);
  }, [pathname, mounted]);

  const toggleMobileNav = () => {
    const newState = !mobileNavOpen;
    setMobileNavOpen(newState);
    document.body.classList.toggle("mobile-nav-open", newState);
  };

  const closeMobileNav = () => {
    setMobileNavOpen(false);
    document.body.classList.remove("mobile-nav-open");
  };

  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/credentials", label: "Credentials" },
  ];

  // Mobile nav portal - rendered outside header DOM to avoid backdrop-filter transparency issues
  const mobileNavPortal = mounted && typeof document !== 'undefined' && (
    createPortal(
      <div
        className={`fixed inset-0 z-mobile-nav ${mobileNavOpen ? "block" : "hidden"}`}
        id="mobileNav"
        aria-hidden={!mobileNavOpen}
        onClick={closeMobileNav}
      >
        <nav
          className={`absolute top-[56px] right-3 w-[min(86vw,280px)] max-h-[calc(100vh-4rem)] bg-surface border border-border rounded-lg flex flex-col overflow-y-auto shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-300 ${
            mobileNavOpen 
              ? "translate-y-0 opacity-100" 
              : "-translate-y-2 opacity-0 pointer-events-none"
          }`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <ul className="list-none p-2 flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`relative flex items-center no-underline px-3 py-2.5 rounded-md transition-all duration-300 text-sm font-medium min-h-[44px] cursor-pointer ${
                      isActive
                        ? "text-text-primary after:scale-x-100"
                        : "text-text-secondary after:scale-x-0 hover:bg-background hover:text-text-primary"
                    } after:content-[''] after:absolute after:left-3 after:right-3 after:bottom-1.5 after:h-0.5 after:bg-accent after:origin-left after:transition-transform after:duration-300`}
                    onClick={closeMobileNav}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            {authenticated && (
              <li className="border-t border-border mt-1 pt-1">
                {username && (
                  <div className="px-3 py-2 text-xs text-text-secondary">
                    {username}
                  </div>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    closeMobileNav();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md transition-all duration-300 text-sm font-medium min-h-[44px] cursor-pointer text-text-secondary hover:bg-background hover:text-text-primary"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>,
      document.body
    )
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 w-full flex justify-between items-center px-3 md:px-6 py-2.5 bg-background/80 backdrop-blur-xl backdrop-saturate-150 z-header transition-colors duration-300 shadow-lg">
        <div className="flex items-center relative">
          <Link href="/" className="flex items-center no-underline cursor-pointer">
            <div className="relative">
              <img
                src="/assets/logo.png"
                alt="ELDES Monitor Logo"
                className="h-6 w-auto block"
              />
            </div>
            <span className="text-xl font-bold ml-2.5 text-text-primary leading-none">
              ELDES Monitor
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {/* Mobile Hamburger Button */}
          <button
            className={`md:hidden w-9 h-9 rounded-md border flex items-center justify-center transition-all duration-300 cursor-pointer ${
              mobileNavOpen
                ? "bg-accent border-accent text-white"
                : "border-border bg-background text-text-primary"
            }`}
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-controls="mobileNav"
            aria-expanded={mobileNavOpen}
            onClick={toggleMobileNav}
          >
            {mobileNavOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-3 items-center relative" ref={navRef}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
              <Link
                key={item.href}
                href={item.href}
                  className={`relative no-underline text-sm py-1.5 rounded transition-colors duration-300 cursor-pointer ${
                    isActive
                      ? "text-text-primary font-medium active"
                      : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {item.label}
              </Link>
              );
            })}
            {authenticated && (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
                {username && (
                  <span className="text-xs text-text-secondary">{username}</span>
                )}
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary bg-accent/10 hover:bg-accent/20 border border-accent/30 hover:border-accent/50 rounded-md transition-all duration-300 cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            )}
            <div
              ref={underlineRef}
              className="absolute bottom-0.5 h-0.5 bg-accent transition-all duration-300 ease-in-out"
              aria-hidden="true"
            />
          </nav>
        </div>
      </header>

      {/* Mobile Navigation - Rendered via Portal */}
      {mobileNavPortal}
    </>
  );
}
