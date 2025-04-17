import {
  CodeIcon,
  GlobeIcon,
  type LucideIcon,
  MousePointerClickIcon,
  Plus,
  RabbitIcon,
  ScaleIcon,
  ZapIcon,
  FolderTreeIcon,
  ShieldIcon,
} from "lucide-react";

export function HighlightsSection() {
  return (
    <>
      <section className="from-background to-muted/50 flex w-full items-center justify-center border-x bg-gradient-to-b px-2 py-12 md:px-0 md:py-16 lg:py-20">
        <h2 className="text-pretty text-center text-2xl font-bold dark:opacity-90 dark:drop-shadow-lg sm:text-4xl md:text-5xl lg:text-6xl">
          Build on Solana at
          <br />
          the speed of light.
        </h2>
      </section>
      <div className="from-muted/40 grid w-full grid-cols-1 border-b border-r bg-gradient-to-b to-transparent to-50% sm:grid-cols-2 md:grid-cols-3">
        <div className="relative">
          <Highlight title="Easy-to-Use" icon={MousePointerClickIcon}>
            Simple and intuitive API designed for developers of all skill levels
            to build on Solana easily.
          </Highlight>
          <Plus className="absolute -bottom-3 -right-[13px] z-1 hidden sm:block" />
        </div>
        <div className="relative">
          <Highlight title="High Performance" icon={ZapIcon}>
            Optimized for Solana's high-speed, low-cost blockchain environment
            with maximum throughput.
          </Highlight>
          <Plus className="absolute -bottom-3 -right-[13px] z-1 hidden md:block" />
        </div>
        <div className="relative">
          <Highlight title="Lightweight" icon={ScaleIcon}>
            Minimal overhead and efficient architecture that maximizes
            performance while reducing resource usage.
          </Highlight>
          <Plus className="absolute -bottom-3 -right-[13px] z-1 hidden sm:block md:hidden" />
        </div>

        <Highlight title="Fast Development" icon={RabbitIcon}>
          Accelerate your development process with ready-to-use components and
          comprehensive tools.
        </Highlight>
        <Highlight title="Open Source" icon={GlobeIcon}>
          Community-driven development with contributions from the Solana
          ecosystem and blockchain experts.
        </Highlight>
        <Highlight title="Secure & Reliable" icon={ShieldIcon}>
          Built with security best practices to ensure your Solana applications
          are robust and trustworthy.
        </Highlight>
      </div>
    </>
  );
}

interface HighlightPros extends React.PropsWithChildren {
  title: string;
  icon: LucideIcon;
}

export function Highlight({ icon: IconComp, title, children }: HighlightPros) {
  return (
    <div className="h-full border-l border-t px-4 py-5 md:p-8">
      <div className="text-muted-foreground mb-3 flex flex-row items-center gap-x-2 md:mb-4">
        <IconComp className="size-3 md:size-4" />
        <h2 className="text-xs font-normal md:text-sm md:font-medium">
          {title}
        </h2>
      </div>
      <p className="text-pretty text-sm md:text-base">{children}</p>
    </div>
  );
}
