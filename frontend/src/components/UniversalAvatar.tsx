"use client";

import React, { useState } from "react";
import Image from "next/image";

export interface UniversalAvatarUser {
  name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
}

export interface UniversalAvatarProps {
  user?: UniversalAvatarUser | null;
  name?: string | null;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  alt?: string;
  showBorder?: boolean;
}

const GRADIENT_PALETTES = [
  "from-amber-500 to-rose-600",
  "from-indigo-500 to-purple-600",
  "from-emerald-500 to-teal-700",
  "from-orange-500 to-amber-600",
  "from-fuchsia-600 to-pink-600",
  "from-blue-600 to-indigo-700",
  "from-teal-500 to-emerald-600",
  "from-violet-600 to-indigo-800",
  "from-rose-500 to-pink-700",
  "from-sky-500 to-blue-700",
  "from-amber-600 to-yellow-600",
  "from-purple-600 to-rose-600",
];

const SIZE_MAP = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs font-semibold",
  md: "w-10 h-10 text-sm font-semibold",
  lg: "w-16 h-16 text-xl font-bold",
  xl: "w-20 h-20 text-2xl font-bold",
  "2xl": "w-24 h-24 text-3xl font-bold",
};

function getDeterministicGradient(name: string): string {
  if (!name || !name.trim()) return "from-stone-600 to-stone-800";
  let hash = 0;
  const clean = name.trim().toLowerCase();
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[index];
}

export default function UniversalAvatar({
  user,
  name,
  avatarUrl,
  size = "md",
  className = "",
  alt,
  showBorder = false,
}: UniversalAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Extract name and avatar dynamically from user object or explicit props
  const resolvedName =
    user?.full_name || user?.name || name || "User";
  const resolvedAvatar =
    user?.avatar_url || user?.avatarUrl || avatarUrl || null;

  const displayName = resolvedName.trim() || "User";
  const initial = displayName.charAt(0).toUpperCase() || "U";
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;
  const gradient = getDeterministicGradient(displayName);

  const hasValidAvatar = Boolean(resolvedAvatar && resolvedAvatar.trim() && !imageError);

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 flex items-center justify-center select-none shadow-sm ${sizeClasses} ${
        showBorder ? "ring-2 ring-white/80 shadow-md" : ""
      } ${className}`}
      title={displayName}
    >
      {hasValidAvatar ? (
        <Image
          src={resolvedAvatar!}
          alt={alt || `${displayName}'s avatar`}
          fill
          sizes="(max-width: 768px) 100px, 150px"
          className="object-cover rounded-full"
          onError={() => setImageError(true)}
          unoptimized={resolvedAvatar!.startsWith("http")}
        />
      ) : (
        <div
          className={`w-full h-full rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white tracking-wider font-display uppercase shadow-inner`}
        >
          {initial}
        </div>
      )}
    </div>
  );
}
