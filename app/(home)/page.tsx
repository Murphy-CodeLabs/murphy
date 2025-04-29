import CanvasCursor from "@/components/canvas-cursor";
import { CallActionSection } from "@/components/landding/call-action-section";
import { ContributeSection } from "@/components/landding/contribute-section";
import HeroSection from "@/components/landding/hero-section";
import { HighlightsSection } from "@/components/landding/highlights";
import { TestimonialsSection } from "@/components/landding/testimonials-section";
import { UseCaseSection } from "@/components/landding/usecase";
import Partner from "@/components/landding/partner";
export default function HomePage() {
  return (
    <main className="flex flex-col justify-center text-center">
      {/* <CanvasCursor /> */}
      <HeroSection />
      <HighlightsSection />
      <UseCaseSection />
      <Partner />
      <ContributeSection />
      <TestimonialsSection />
      <CallActionSection />
    </main>
  );
}
