"use client";

import { GridPattern } from "@/components/background/grid-pattern";
import { TerminalDemo } from "@/components/landding/terminal-demo";
import AnimatedGroup from "@/components/ui/animated-group";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Code,
  Dumbbell,
  Layers,
  Mail,
  SendHorizonal,
  Zap,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { LinkButton } from "../ui/link-button";

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
              <Link
                href="/docs/onchainkit"
                className="rounded-(--radius) flex w-fit items-center gap-2 border p-1 pr-3 bg-primary/10 "
              >
                <span className="bg-muted rounded-[calc(var(--radius)-0.25rem)] px-2 py-1 text-xs">
                  New
                </span>
                <span className="text-sm">Introduction Onchainkit</span>
                <span className="bg-(--color-border) block h-4 w-px"></span>

                <ArrowRight className="size-4" />
              </Link>

              <div className="text-center md:text-left">
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight mb-6 text-left">
                  Murphy
                </h1>
                <p className="text-muted-foreground text-lg md:text-xl max-w-2xl text-left mx-0 mb-8 leading-relaxed">
                  A powerful and developer-friendly Kit for building
                  decentralized applications on Solana. Simplify blockchain
                  interactions, accelerate development, and unlock the full
                  potential of the Solana ecosystem.
                </p>
                <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-start">
                  <LinkButton href="/docs/onchainkit" className="h-10">
                    Get Started
                  </LinkButton>
                  <EmailSubscribe />
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

const EmailSubscribe = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSubmitted(true);
        setEmail("");
        // Reset submission state after 3 seconds
        setTimeout(() => setIsSubmitted(false), 3000);
      }
    } catch (error) {
      console.error("Error subscribing:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="">
      <div className="rounded-md bg-background has-[input:focus]:ring-muted relative grid grid-cols-[1fr_auto] items-center border pr-2 ">
        <Mail className="text-caption pointer-events-none absolute inset-y-0 left-5 my-auto size-5" />

        <input
          placeholder="Your mail address"
          className="h-10 w-full bg-transparent pl-12 focus:outline-none"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="md:pr-1.5 lg:pr-0">
          <Button
            aria-label="submit"
            className="rounded-sm h-7"
            type="submit"
            disabled={isLoading || isSubmitted}
          >
            {isLoading ? (
              <span className="hidden md:block">Subscribing...</span>
            ) : isSubmitted ? (
              <span className="hidden md:block">Subscribed!</span>
            ) : (
              <>
                <span className="hidden md:block">Subscribe</span>
                <SendHorizonal
                  className="relative mx-auto size-5 md:hidden"
                  strokeWidth={2}
                />
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};
