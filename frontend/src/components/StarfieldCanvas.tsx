"use client";

import { useEffect, useRef } from "react";

export function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const stars = Array.from({ length: 85 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height * 0.72,
      radius: Math.random() * 1.2 + 0.3,
      alpha: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.005 + 0.002,
      offset: Math.random() * Math.PI * 2,
    }));

    let time = 0;
    let rafId = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      for (const star of stars) {
        const brightness =
          0.3 + 0.7 * Math.sin(time * star.speed * 8 + star.offset);
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(235, 220, 255, ${Math.max(
          0.1,
          star.alpha * brightness
        )})`;
        ctx.fill();
      }
      time += 1;
      rafId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 opacity-60 pointer-events-none"
    />
  );
}

