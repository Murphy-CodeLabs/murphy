import {
  AnimatedSpan,
  Terminal,
  TypingAnimation,
} from "@/components/ui/terminal";

const packageUrl = `pnpm dlx shadcn@canary add connect-wallet-button`;

export function TerminalDemo() {
  return (
    <Terminal className="text-left">
      <TypingAnimation className="max-w-full">{`> ${packageUrl}`}</TypingAnimation>

      <AnimatedSpan delay={5678} className="text-green-500">
        <span>✔ Checking registry.</span>
      </AnimatedSpan>

      <AnimatedSpan delay={5900} className="text-purple-500">
        <span>Installing dependencies...</span>
      </AnimatedSpan>

      <AnimatedSpan delay={7000} className="text-green-500">
        <span>✔ Created 3 files:</span>
      </AnimatedSpan>

      <AnimatedSpan delay={7000} className="text-muted-foreground">
        <span>- components/ui/murphy/connect-wallet-button.tsx</span>
      </AnimatedSpan>

      <AnimatedSpan delay={7000} className="text-muted-foreground">
        <span>- hook/murphy/use-walletMultiButton.ts</span>
      </AnimatedSpan>

      <AnimatedSpan delay={7000} className="text-muted-foreground">
        <span>- hook/murphy/use-walletModal.ts</span>
      </AnimatedSpan>

      <AnimatedSpan delay={7000} className="text-muted-foreground">
        <span>install complete</span>
      </AnimatedSpan>
    </Terminal>
  );
}
