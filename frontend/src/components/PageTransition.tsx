"use client";

import React, { ReactNode } from "react";
import { motion, PanInfo } from "framer-motion";
import { useRouter } from "next/navigation";

interface SlideOverPageProps {
  children: ReactNode;
  fallbackBackUrl?: string;
  className?: string;
  onBack?: () => void;
}

export function SlideOverPage({
  children,
  fallbackBackUrl = "/shop",
  className = "",
  onBack,
}: SlideOverPageProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackBackUrl);
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // If swiped right past 90px or with strong swipe velocity
    if (info.offset.x > 90 || info.velocity.x > 450) {
      handleBack();
    }
  };

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0.96 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0.96 }}
      transition={{
        type: "spring",
        damping: 30,
        stiffness: 320,
        mass: 0.8,
      }}
      drag="x"
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.45 }}
      onDragEnd={handleDragEnd}
      className={`min-h-screen w-full relative touch-pan-y ${className}`.trim()}
    >
      {children}
    </motion.div>
  );
}

export function FadeInPage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className={`w-full ${className}`.trim()}
    >
      {children}
    </motion.div>
  );
}

export default SlideOverPage;
