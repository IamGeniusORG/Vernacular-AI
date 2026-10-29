"use client";

import React, { useEffect, useRef } from "react";

/**
 * DynamicWeaveCanvas
 * 
 * An interactive, hardware-accelerated HTML5 Canvas that spans the entire
 * browser viewport. It dynamically recalculates warp & weft loom thread density,
 * organic wave geometries, and ambient silk fiber particles as the browser
 * window size changes in real-time.
 */
export default function DynamicWeaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Mouse coordinates for subtle interactive wave deflection
    let mouseX = -1000;
    let mouseY = -1000;
    let targetMouseX = -1000;
    let targetMouseY = -1000;

    // Ambient floating loom fiber particles
    interface FiberParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
    }

    let particles: FiberParticle[] = [];

    const PARTICLE_COLORS = [
      "rgba(200, 90, 50, ",   // Terracotta / rust
      "rgba(46, 90, 54, ",    // Sage forest green
      "rgba(217, 119, 6, ",   // Golden amber
      "rgba(180, 160, 140, ", // Soft handloom linen
    ];

    const initParticles = (w: number, h: number) => {
      // Density dynamically scales with browser canvas area
      const count = Math.min(48, Math.max(16, Math.floor((w * h) / 38000)));
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -Math.random() * 0.35 - 0.1, // Gently float upwards
          size: Math.random() * 2.2 + 0.8,
          color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
          alpha: Math.random() * 0.25 + 0.1,
        });
      }
    };

    // Resize handler: updates dimensions to fill 100% of browser window
    const resizeCanvas = () => {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
      initParticles(width, height);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas, { passive: true });

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        targetMouseX = e.touches[0].clientX;
        targetMouseY = e.touches[0].clientY;
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    let time = 0;

    // Render loop
    const render = () => {
      time += 0.007;

      // Smooth mouse interpolation
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // ── 1. Vertical Loom Warp Threads (Dynamic density based on canvas width) ──
      const threadSpacing = Math.max(38, Math.min(64, width / 32));
      const threadCount = Math.ceil(width / threadSpacing) + 2;

      ctx.lineWidth = 1;

      for (let i = 0; i < threadCount; i++) {
        const baseX = i * threadSpacing;
        ctx.beginPath();

        // Color alternates with subtle gold / sage / rust tints
        const tint = i % 4;
        if (tint === 0) ctx.strokeStyle = "rgba(200, 90, 50, 0.035)";
        else if (tint === 1) ctx.strokeStyle = "rgba(46, 90, 54, 0.03)";
        else if (tint === 2) ctx.strokeStyle = "rgba(217, 119, 6, 0.035)";
        else ctx.strokeStyle = "rgba(168, 150, 130, 0.025)";

        // Warp thread curves gently down the screen
        const waveOffset = Math.sin(time + i * 0.4) * 12;
        const distToMouse = Math.abs(mouseX - baseX);
        const mouseDeflect = distToMouse < 180 ? ((180 - distToMouse) / 180) * 16 * Math.sign(mouseX - baseX) : 0;

        ctx.moveTo(baseX + waveOffset * 0.3, 0);
        ctx.bezierCurveTo(
          baseX + waveOffset + mouseDeflect,
          height * 0.33,
          baseX - waveOffset - mouseDeflect,
          height * 0.66,
          baseX + waveOffset * 0.4,
          height
        );
        ctx.stroke();
      }

      // ── 2. Horizontal Weft Waves (Simulating interwoven cross-threads) ──
      const weftCount = 5;
      for (let j = 0; j < weftCount; j++) {
        const baseY = (height / (weftCount + 1)) * (j + 1);
        const waveSpeed = time * (0.8 + j * 0.15);
        const amp = 14 + j * 4;

        ctx.beginPath();
        ctx.strokeStyle = j % 2 === 0 ? "rgba(200, 90, 50, 0.03)" : "rgba(46, 90, 54, 0.025)";
        ctx.lineWidth = 1.2;

        ctx.moveTo(0, baseY + Math.sin(waveSpeed) * amp);
        for (let x = 0; x <= width; x += 40) {
          const dy = Math.sin((x / width) * 5 + waveSpeed) * amp;
          ctx.lineTo(x, baseY + dy);
        }
        ctx.stroke();
      }

      // ── 3. Ambient Floating Silk Fiber Particles ──
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around canvas boundaries seamlessly
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-10 w-full h-full block"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
      }}
    />
  );
}
