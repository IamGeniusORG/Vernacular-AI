"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  User,
  Sliders,
  Store,
  LogOut,
  ChevronDown,
  ShoppingBag,
} from "lucide-react";
import UniversalAvatar from "@/components/UniversalAvatar";
import { useArtisan } from "@/context/ArtisanContext";

interface UserDropdownProps {
  className?: string;
  onOpenProfileDrawer?: () => void;
}

export default function UserDropdown({ className = "", onOpenProfileDrawer }: UserDropdownProps) {
  const router = useRouter();
  const {
    artisanId,
    profileName,
    avatarUrl,
    userRole,
    logout,
    isLoading,
  } = useArtisan();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsOpen(false);
    await logout();
    router.push("/shop");
    router.refresh();
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-9 h-9 rounded-full bg-stone-200 animate-pulse" />
      </div>
    );
  }

  // Not logged in: Show "Sign In" button
  if (!artisanId) {
    return (
      <Link
        href="/login"
        className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-xs sm:text-sm font-semibold transition shadow-sm shrink-0 flex items-center gap-1.5"
      >
        <span>Sign In</span>
      </Link>
    );
  }

  const isArtisan = userRole === "artisan";
  const displayName = profileName || (isArtisan ? "Artisan Partner" : "Patron");

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-stone-200/90 hover:border-stone-300 bg-white/80 hover:bg-white active:scale-95 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <UniversalAvatar
          name={displayName}
          avatarUrl={avatarUrl}
          size="sm"
          showBorder
        />
        <span className="hidden sm:inline-block text-xs font-semibold text-neutral-800 max-w-[120px] truncate">
          {displayName}
        </span>
        <ChevronDown
          size={14}
          className={`text-neutral-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
          {/* Header Card */}
          <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-3 bg-stone-50/50 rounded-t-2xl">
            <UniversalAvatar
              name={displayName}
              avatarUrl={avatarUrl}
              size="md"
              showBorder
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-neutral-900 truncate">
                {displayName}
              </p>
              <div className="mt-0.5">
                {isArtisan ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    <Sparkles size={10} /> Artisan Partner
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <ShoppingBag size={10} /> Patron / Buyer
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {isArtisan ? (
              <>
                <Link
                  href="/studio"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-stone-100 hover:text-neutral-900 transition"
                >
                  <Sparkles size={15} className="text-amber-600 shrink-0" />
                  <span>Studio Dashboard</span>
                </Link>

                {onOpenProfileDrawer ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenProfileDrawer();
                    }}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-stone-100 hover:text-neutral-900 transition"
                  >
                    <User size={15} className="text-neutral-500 shrink-0" />
                    <span>Edit Profile & Branding</span>
                  </button>
                ) : (
                  <Link
                    href="/studio"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-stone-100 hover:text-neutral-900 transition"
                  >
                    <User size={15} className="text-neutral-500 shrink-0" />
                    <span>Edit Profile & Branding</span>
                  </Link>
                )}

                <Link
                  href="/shop"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-stone-100 hover:text-neutral-900 transition"
                >
                  <Store size={15} className="text-neutral-500 shrink-0" />
                  <span>Explore Marketplace</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-stone-100 hover:text-neutral-900 transition"
                >
                  <User size={15} className="text-indigo-600 shrink-0" />
                  <span>My Account</span>
                </Link>

                <Link
                  href="/profile#preferences"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-stone-100 hover:text-neutral-900 transition"
                >
                  <Sliders size={15} className="text-neutral-500 shrink-0" />
                  <span>Preferences</span>
                </Link>

                <Link
                  href="/shop"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-stone-100 hover:text-neutral-900 transition"
                >
                  <ShoppingBag size={15} className="text-neutral-500 shrink-0" />
                  <span>Explore Handlooms</span>
                </Link>
              </>
            )}
          </div>

          {/* Sign Out */}
          <div className="pt-1 mt-1 border-t border-stone-100">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut size={15} className="shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
