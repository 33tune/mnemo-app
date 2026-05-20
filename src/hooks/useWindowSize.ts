"use client";
import { useState, useEffect } from "react";

export function useWindowSize() {
  const [size, setSize] = useState({ width: 1440, height: 900 });
  useEffect(() => {
    function update() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}