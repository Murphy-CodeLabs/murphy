"use client";

import { TerminalDemo } from "@/components/terminal-demo";
import AnimatedGroup from "@/components/ui/animated-group";
import { Button } from "@/components/ui/button";
import { ArrowRight, Code, Layers, Zap } from "lucide-react";
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
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/50 z-0" />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.02] z-0" />

        <div className="container relative mx-auto px-6 py-16 md:py-24 z-10">
          <div className="flex flex-col gap-12 md:flex-row md:gap-16 items-center">
            {/* Left Column - Content */}
            <div className="flex flex-1 flex-col gap-8 md:justify-center">
              <AnimatedGroup variants={transitionVariants}>
                <Link
                  href="#features"
                  className="group mx-auto md:mx-0 flex w-fit items-center gap-4 rounded-full border border-primary/10 bg-primary/5 p-1.5 pl-5 shadow-lg transition-all duration-300 hover:border-primary/20 hover:bg-primary/10 dark:border-primary/20 dark:bg-primary/10 dark:hover:border-primary/30 dark:hover:bg-primary/15"
                >
                  <span className="text-foreground/90 font-medium text-sm">
                    Introduction to Murphis
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
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                  Murphis SDK
                </h1>
                <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto md:mx-0 mb-8 leading-relaxed">
                  The Murphis SDK is a powerful tool for building onchain
                  applications. It provides a set of functions for interacting
                  with the blockchain and a set of hooks for interacting with
                  the blockchain.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <Button
                    asChild
                    size="lg"
                    className="px-8 py-6 text-base rounded-xl hover:translate-y-[-2px] transition-all duration-300 font-medium shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
                  >
                    <Link href="/docs">Get Started</Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column - Terminal Demo */}
            <div className="flex flex-1 items-center justify-center mt-8 md:mt-0">
              <div className="w-full max-w-lg transform transition-all duration-500 hover:scale-[1.01] relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-purple-500/30 rounded-2xl blur-xl opacity-50"></div>
                <div className="relative">
                  <TerminalDemo />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute hidden md:block top-1/4 -left-28 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute hidden md:block bottom-1/4 -right-28 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Quote Section */}
      <div className="relative bg-gradient-to-b from-background to-background/95 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <blockquote className="text-xl md:text-2xl font-serif italic text-foreground/90 leading-relaxed mb-8">
              "Murphy's Law states: 'Whatever can go wrong, will go wrong.' Just
              like building a startup or launching a product—full of risks but
              as exciting as exploring the universe."
            </blockquote>
            <p className="text-muted-foreground font-medium">
              From the Murphy Documentation
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful SDK Features
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to build amazing onchain applications with
              ease
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-background rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-border/50 group hover:-translate-y-1">
              <div className="bg-primary/10 text-primary p-4 rounded-xl mb-6 inline-block group-hover:bg-primary/20 transition-all duration-300">
                <Code size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Simple Integration</h3>
              <p className="text-muted-foreground">
                Easily integrate with your existing React applications with our
                React hooks and components.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-background rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-border/50 group hover:-translate-y-1">
              <div className="bg-purple-500/10 text-purple-500 p-4 rounded-xl mb-6 inline-block group-hover:bg-purple-500/20 transition-all duration-300">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Optimized for performance with minimal overhead, ensuring your
                applications run smoothly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-background rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-border/50 group hover:-translate-y-1">
              <div className="bg-blue-500/10 text-blue-500 p-4 rounded-xl mb-6 inline-block group-hover:bg-blue-500/20 transition-all duration-300">
                <Layers size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Comprehensive Tools</h3>
              <p className="text-muted-foreground">
                A complete set of tools for blockchain interaction, from
                transactions to data fetching.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="relative py-16 md:py-24 bg-gradient-to-br from-background to-background/80 overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-grid-pattern"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Start Building?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join the community of developers using Murphy to create innovative
              onchain applications.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="px-8 py-6 text-base rounded-xl hover:translate-y-[-2px] transition-all duration-300 font-medium shadow-md"
              >
                <Link href="/docs">View Documentation</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="px-8 py-6 text-base rounded-xl hover:translate-y-[-2px] transition-all duration-300 font-medium"
              >
                <Link href="#examples">See Examples</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute hidden md:block bottom-1/3 -right-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute hidden md:block top-1/3 -left-20 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>
    </>
  );
}
