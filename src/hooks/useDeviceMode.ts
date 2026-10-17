"use client";

import { useState, useEffect } from 'react';

export interface DeviceMode {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  width: number;
  height: number;
}

export function useDeviceMode(): DeviceMode {
  const [device, setDevice] = useState<DeviceMode>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouch: false,
    width: 1200,
    height: 800,
  });

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouch = 
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 || 
        window.matchMedia('(pointer: coarse)').matches;
      
      const isMobile = width < 768 || (isTouch && width < 1024);
      const isTablet = width >= 768 && width < 1024 && !isMobile;
      const isDesktop = width >= 1024;

      setDevice({
        isMobile,
        isTablet,
        isDesktop,
        isTouch,
        width,
        height,
      });
    };

    checkDevice();
    window.addEventListener('resize', checkDevice, { passive: true });
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return device;
}
