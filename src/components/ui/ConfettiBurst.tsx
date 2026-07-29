"use client";

import { useEffect, useRef } from 'react';

interface ConfettiProps {
  active: boolean;
  color?: string; // main color of the burst
  originX?: number; // 0–1 relative to container
  originY?: number;
}

/**
 * Canvas-based confetti burst. Fires once when `active` flips to true.
 * Lightweight — no external dependencies.
 */
export function ConfettiBurst({ active, color = '#3861ff', originX = 0.5, originY = 0.5 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const W = canvas.width;
    const H = canvas.height;
    const ox = W * originX;
    const oy = H * originY;

    // Parse a base hex color and generate palette
    const palette = [color, '#ffffff', '#ffc857', '#a855f7', '#00e5a0'];

    // Create particles
    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      ax: number; ay: number;
      size: number;
      color: string;
      rotation: number;
      rotSpeed: number;
      alpha: number;
      decay: number;
      shape: 'rect' | 'circle';
    };

    const particles: Particle[] = Array.from({ length: 60 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      return {
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4, // bias upward
        ax: 0,
        ay: 0.25, // gravity
        size: 4 + Math.random() * 6,
        color: palette[Math.floor(Math.random() * palette.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        alpha: 1,
        decay: 0.016 + Math.random() * 0.012,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      };
    });

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = false;

      for (const p of particles) {
        if (p.alpha <= 0) continue;
        alive = true;
        p.vx += p.ax;
        p.vy += p.ay;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.alpha -= p.decay;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (alive) {
        animRef.current = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, W, H);
      }
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active, color, originX, originY]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
        borderRadius: 'inherit',
      }}
    />
  );
}
