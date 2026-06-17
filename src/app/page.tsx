"use client";
import "./landing.css";
import { useEffect } from "react";
import { Hero } from "@/components/landing/LandingHero";
import { Topbar, KitSection, GuestbookSection, GallerySection, PricingSection, Closing } from "@/components/landing/LandingSections";

export default function HomePage() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="landing-root grain">
      <Topbar />
      <Hero />
      <KitSection />
      <div className="divline" />
      <GuestbookSection />
      <div className="divline" />
      <GallerySection />
      <div className="divline" />
      <PricingSection />
      <Closing />
    </div>
  );
}
