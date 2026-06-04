import "./landing.css";
import LandingReveal from "@/components/landing/LandingReveal";
import { Hero } from "@/components/landing/LandingHero";
import {
  Topbar,
  KitSection,
  GuestbookSection,
  GallerySection,
  PricingSection,
  Closing,
} from "@/components/landing/LandingSections";

export default function HomePage() {
  return (
    <div className="landing-root">
      <LandingReveal />
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
