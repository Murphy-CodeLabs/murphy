import {
  AnimatedSpan,
  Terminal,
  TypingAnimation,
} from "@/components/ui/terminal";

export function TerminalDemo() {
  return (
    <Terminal className="text-left">
      <TypingAnimation>&gt; onchainkit add swap</TypingAnimation>

      <AnimatedSpan delay={1500} className="text-purple-500">
        <span>Installing swap components and dependencies ...</span>
      </AnimatedSpan>

      <AnimatedSpan delay={3500} className="text-green-500">
        <span>✔ Added conponents/swap</span>
      </AnimatedSpan>

      <AnimatedSpan delay={4000} className="text-green-500">
        <span>✔ Added utils/swap</span>
      </AnimatedSpan>

      <AnimatedSpan delay={4500} className="text-green-500">
        <span>✔ Added types</span>
      </AnimatedSpan>

      <AnimatedSpan delay={5000} className="text-green-500">
        <span>✔ Added constants</span>
      </AnimatedSpan>

      <AnimatedSpan delay={5500} className="text-muted-foreground">
        <span>Successfully installed swap!</span>
      </AnimatedSpan>
    </Terminal>
  );
}
