"use client";

import { GridPattern } from "@/components/background/grid-pattern";
import { TerminalDemo } from "@/components/landding/terminal-demo";
import AnimatedGroup from "@/components/ui/animated-group";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Code, Dumbbell, Layers, Zap } from "lucide-react";
import Link from "next/link";
import React from "react";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring",
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

export default function HeroSection() {
  return (
    <>
      {/* Main Hero Header */}
      <div className="relative overflow-hidden border w-full">
        <GridPattern
          width={30}
          height={30}
          x={-1}
          y={-1}
          strokeDasharray={"4 2"}
          className={cn(
            "-z-20 [mask-image:radial-gradient(650px_circle_at_center,white,transparent)]"
          )}
        />
        <div className="container relative  py-16 md:py-24 z-10">
          <div className="flex flex-col gap-12 md:flex-row md:gap-16 items-center">
            {/* Left Column - Content */}
            <div className="flex flex-1 flex-col gap-8 md:justify-center">
              <AnimatedGroup variants={transitionVariants}>
                <Link
                  href="/docs/onchainkit"
                  className="group mx-auto md:mx-0 flex w-fit items-center gap-4 rounded-full border border-primary/10 bg-primary/5 p-1.5 pl-5 shadow-lg transition-all duration-300 hover:border-primary/20 hover:bg-primary/10 dark:border-primary/20 dark:bg-primary/10 dark:hover:border-primary/30 dark:hover:bg-primary/15"
                >
                  <span className="text-foreground/90 font-medium text-sm">
                    Introduction to Murphis SDK
                  </span>
                  <span className="block h-4 w-0.5 bg-primary/30 dark:bg-primary/40"></span>

                  <div className="bg-primary/10 dark:bg-primary/20 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 size-7 overflow-hidden rounded-full transition-all duration-500">
                    <div className="flex w-14 -translate-x-1/2 transition-all duration-500 ease-in-out group-hover:translate-x-0">
                      <span className="flex size-7">
                        <ArrowRight className="m-auto size-3.5 text-primary/90" />
                      </span>
                      <span className="flex size-7">
                        <ArrowRight className="m-auto size-3.5 text-primary/90" />
                      </span>
                    </div>
                  </div>
                </Link>
              </AnimatedGroup>

              <div className="text-center md:text-left">
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight mb-6">
                  Murphis SDK
                </h1>
                <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto md:mx-0 mb-8 leading-relaxed">
                  A powerful and developer-friendly SDK for building
                  decentralized applications on Solana. Simplify blockchain
                  interactions, accelerate development, and unlock the full
                  potential of the Solana ecosystem.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <Button
                    asChild
                    size="lg"
                    className="px-8 py-6 text-base rounded-xl hover:translate-y-[-2px] transition-all duration-300 font-medium shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
                  >
                    <Link href="/docs/onchainkit">Get Started</Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column - Terminal Demo */}
            <div className="flex flex-1 items-center justify-center mt-8 md:mt-0">
              <div className="w-full max-w-lg transform transition-all duration-500 relative">
                <div className="relative">
                  <TerminalDemo />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
