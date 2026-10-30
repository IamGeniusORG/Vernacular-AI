"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  ElementType,
  ComponentPropsWithoutRef,
} from "react";
import { useLanguage } from "@/context/LanguageContext";

interface LanguageTransitionContextType {
  isTransitioning: boolean;
  transitionClass: string;
}

const LanguageTransitionContext = createContext<LanguageTransitionContextType>({
  isTransitioning: false,
  transitionClass: "opacity-100 blur-none transition-all duration-300 ease-in-out",
});

export function LanguageTransitionProvider({ children }: { children: ReactNode }) {
  const { activeLanguage } = useLanguage();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isFirstRender = useRef(true);
  const prevLang = useRef(activeLanguage);

  useEffect(() => {
    // Avoid triggering transition on initial mount or hydration
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevLang.current = activeLanguage;
      return;
    }

    if (prevLang.current !== activeLanguage) {
      prevLang.current = activeLanguage;
      setIsTransitioning(true);

      const timer = window.setTimeout(() => {
        setIsTransitioning(false);
      }, 150);

      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeLanguage]);

  // Sync body dataset and classes for global CSS styling
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isTransitioning) {
      document.body.classList.add("lang-transitioning");
      document.body.classList.remove("lang-idle");
    } else {
      document.body.classList.remove("lang-transitioning");
      document.body.classList.add("lang-idle");
    }
  }, [isTransitioning]);

  const transitionClass = isTransitioning
    ? "opacity-0 blur-sm pointer-events-none transition-all duration-150 ease-out"
    : "opacity-100 blur-none transition-all duration-300 ease-in-out";

  return (
    <LanguageTransitionContext.Provider value={{ isTransitioning, transitionClass }}>
      {children}
    </LanguageTransitionContext.Provider>
  );
}

export function useLanguageTransition() {
  return useContext(LanguageTransitionContext);
}

interface LanguageTransitionWrapperProps<T extends ElementType = "div"> {
  as?: T;
  children?: ReactNode;
  className?: string;
}

export function LanguageTransitionWrapper<T extends ElementType = "div">({
  as,
  children,
  className = "",
  ...props
}: LanguageTransitionWrapperProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof LanguageTransitionWrapperProps<T>>) {
  const Component = as || "div";
  const { transitionClass } = useLanguageTransition();

  return (
    <Component
      data-lang-content
      className={`${transitionClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}
