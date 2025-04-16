"use client";

import { TerminalDemo } from "@/components/terminal-demo";
import AnimatedGroup from "@/components/ui/animated-group";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
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
    <div className="container mx-auto px-4 py-10 md:py-16">
      <div className="flex flex-col gap-8 md:flex-row md:gap-12">
        {/* Left Column - Content */}
        <div className="flex flex-1 flex-col gap-6 md:justify-center">
          <AnimatedGroup variants={transitionVariants}>
            <Link
              href="#features"
              className="hover:bg-background dark:hover:border-t-border bg-muted group mx-auto md:mx-0 flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-zinc-950/5 transition-colors duration-300 dark:border-t-white/5 dark:shadow-zinc-950"
            >
              <span className="text-foreground text-sm">
                Introduction to Murphis
              </span>
              <span className="dark:border-background block h-4 w-0.5 border-l bg-white dark:bg-zinc-700"></span>

              <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                  <span className="flex size-6">
                    <ArrowRight className="m-auto size-3" />
                  </span>
                  <span className="flex size-6">
                    <ArrowRight className="m-auto size-3" />
                  </span>
                </div>
              </div>
            </Link>
          </AnimatedGroup>

          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              Onchainkit SDK
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto md:mx-0 mb-6">
              The Onchainkit SDK is a powerful tool for building onchain
              applications. It provides a set of functions for interacting with
              the blockchain and a set of hooks for interacting with the
              blockchain.
            </p>
            <Button
              asChild
              className="px-6 py-2.5 text-base rounded-lg hover:translate-y-[-2px] transition-transform"
            >
              <Link href="/docs">Get Started</Link>
            </Button>
          </div>
        </div>

        {/* Right Column - Terminal Demo */}
        <div className="flex flex-1 items-center justify-center mt-8 md:mt-0">
          <div className="w-full max-w-lg">
            <TerminalDemo />
          </div>
        </div>
      </div>
    </div>
  );
}
