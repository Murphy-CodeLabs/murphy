import { LinkButton } from "../ui/link-button";

export function CallActionSection() {
  return (
    <>
      <section className="flex-col from-background to-muted/50 flex w-full items-center justify-center border bg-gradient-to-b px-2 py-12 md:px-0 md:py-16 lg:py-20">
        <h2 className="text-pretty text-center text-2xl font-bold dark:opacity-90 dark:drop-shadow-lg sm:text-4xl md:text-5xl lg:text-6xl">
          Ready to build your next Dapp?
        </h2>
        <LinkButton className="mt-10" href="/docs/onchainkit">
          Get Started
        </LinkButton>
      </section>
    </>
  );
}
