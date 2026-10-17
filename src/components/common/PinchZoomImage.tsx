"use client";

import React, { useRef, useState, useCallback, useEffect } from 'react';
import Image, { ImageProps } from 'next/image';

interface PinchZoomImageProps extends Omit<ImageProps, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'> {
  containerClassName?: string;
  enablePinch?: boolean;
  onTap?: () => void;
  onDoubleTap?: () => void;
  isCleanMode?: boolean;
}

export function PinchZoomImage({
  containerClassName = '',
  enablePinch = true,
  onTap,
  onDoubleTap,
  isCleanMode = false,
  className = '',
  alt,
  ...props
}: PinchZoomImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);

  const initialDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const lastTouchTimeRef = useRef<number>(0);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);

  const getDistance = (t1: React.Touch | Touch, t2: React.Touch | Touch) => {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  };

  const getMidpoint = (t1: React.Touch | Touch, t2: React.Touch | Touch) => {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    };
  };

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsPinching(false);
    initialDistanceRef.current = null;
  }, []);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!enablePinch) return;

    if (e.touches.length === 2) {
      // 2 fingers: Start pinch zoom
      hasMovedRef.current = true;
      setIsPinching(true);
      const dist = getDistance(e.touches[0], e.touches[1]);
      initialDistanceRef.current = dist;
      initialScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      // 1 finger: Check for tap / double tap
      hasMovedRef.current = false;
      touchStartPosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!enablePinch) return;

    if (e.touches.length === 2 && initialDistanceRef.current !== null) {
      hasMovedRef.current = true;
      const currentDist = getDistance(e.touches[0], e.touches[1]);
      const factor = currentDist / initialDistanceRef.current;
      const newScale = Math.min(Math.max(initialScaleRef.current * factor, 1), 3.5);
      setScale(newScale);

      // Subtle pan with fingers
      const mid = getMidpoint(e.touches[0], e.touches[1]);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const offsetX = (mid.x - centerX) * 0.35;
        const offsetY = (mid.y - centerY) * 0.35;
        setPosition({ x: offsetX, y: offsetY });
      }
    } else if (e.touches.length === 1 && touchStartPosRef.current) {
      const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
      if (dx > 8 || dy > 8) {
        hasMovedRef.current = true;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2 && isPinching) {
      // Released pinch: smoothly snap back
      resetZoom();
    }

    if (e.touches.length === 0 && !hasMovedRef.current) {
      const now = Date.now();
      const timeSinceLast = now - lastTouchTimeRef.current;

      if (timeSinceLast < 300) {
        // Double Tap
        if (onDoubleTap) {
          onDoubleTap();
        } else {
          // Toggle 2x zoom or reset
          if (scale > 1.2) {
            resetZoom();
          } else {
            setScale(2);
            setIsPinching(true);
          }
        }
      } else {
        // Single Tap
        if (scale > 1.2) {
          resetZoom();
        } else if (onTap) {
          onTap();
        }
      }
      lastTouchTimeRef.current = now;
    }
  };

  const handleTouchCancel = () => {
    resetZoom();
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      className={`relative overflow-hidden touch-pinch-zoom select-none ${containerClassName}`}
      style={{
        zIndex: isPinching && scale > 1.05 ? 40 : 'auto',
      }}
    >
      <div
        className="w-full h-full relative will-change-transform"
        style={{
          transform: `scale(${scale}) translate3d(${position.x / scale}px, ${position.y / scale}px, 0)`,
          transition: isPinching ? 'none' : 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <Image
          alt={alt || 'Visual'}
          className={`${className} transition-opacity duration-300`}
          {...props}
        />
      </div>

      {/* Subtle indicator when pinch zooming is active */}
      {isPinching && scale > 1.1 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-bold shadow-xl border border-white/20 pointer-events-none animate-fade-in">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
}
