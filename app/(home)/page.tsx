import CanvasCursor from "@/components/canvas-cursor";
import HeroSection from "@/components/landding/hero-section";
import { HighlightsSection } from "@/components/landding/highlights";

export default function HomePage() {
  return (
    <main className="flex flex-col justify-center text-center">
      <CanvasCursor />
      <HeroSection />
      <HighlightsSection />
    </main>
  );
}
