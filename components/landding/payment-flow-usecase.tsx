"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, ArrowRight, Wallet, DollarSign } from "lucide-react";

export function PaymentFlowUseCase() {
  const [isAnimating, setIsAnimating] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Only render particles on client-side to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);

    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 3000);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="relative w-full h-full flex items-center justify-center"
      ref={containerRef}
      onMouseEnter={() => setIsAnimating(true)}
      onMouseLeave={() => {
        setTimeout(() => setIsAnimating(false), 3000);
      }}
    >
      <div className="absolute inset-0 bg-gradient-radial from-emerald-500/20 dark:from-emerald-500/10 to-transparent opacity-70" />

      <div className="relative flex items-center justify-center gap-8 z-10">
        {/* Payment flow animation */}
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
            <div className="relative bg-gradient-to-br from-emerald-400/40 to-teal-600/40 dark:from-emerald-400/30 dark:to-teal-600/30 p-4 rounded-xl border border-emerald-500/40 dark:border-emerald-500/30 backdrop-blur-sm">
              <Wallet className="w-8 h-8 text-emerald-800 dark:text-emerald-200" />
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col items-center justify-center">
          <motion.div
            className="h-0.5 w-16 bg-gradient-to-r from-emerald-600/80 to-teal-600/80 dark:from-emerald-500/70 dark:to-teal-500/70"
            initial={{ scaleX: 0, opacity: 0.5 }}
            animate={{
              scaleX: isAnimating ? 1 : 0,
              opacity: isAnimating ? 1 : 0.5,
            }}
            transition={{
              duration: 0.8,
              ease: "easeInOut",
            }}
          />

          <motion.div
            className="mt-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: isAnimating ? 1 : 0.5,
              scale: isAnimating ? 1 : 0.8,
              y: isAnimating ? [-2, 2, -2] : 0,
            }}
            transition={{
              duration: 1.5,
              ease: "easeInOut",
              repeat: isAnimating ? Number.POSITIVE_INFINITY : 0,
              repeatType: "loop",
            }}
          >
            <ArrowRight className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
          </motion.div>
        </div>

        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
            <div className="relative bg-gradient-to-br from-emerald-400/40 to-teal-600/40 dark:from-emerald-400/30 dark:to-teal-600/30 p-4 rounded-xl border border-emerald-500/40 dark:border-emerald-500/30 backdrop-blur-sm">
              <CreditCard className="w-8 h-8 text-emerald-800 dark:text-emerald-200" />
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col items-center justify-center">
          <motion.div
            className="h-0.5 w-16 bg-gradient-to-r from-emerald-600/80 to-teal-600/80 dark:from-emerald-500/70 dark:to-teal-500/70"
            initial={{ scaleX: 0, opacity: 0.5 }}
            animate={{
              scaleX: isAnimating ? 1 : 0,
              opacity: isAnimating ? 1 : 0.5,
            }}
            transition={{
              duration: 0.8,
              delay: 0.3,
              ease: "easeInOut",
            }}
          />

          <motion.div
            className="mt-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: isAnimating ? 1 : 0.5,
              scale: isAnimating ? 1 : 0.8,
              y: isAnimating ? [-2, 2, -2] : 0,
            }}
            transition={{
              duration: 1.5,
              delay: 0.3,
              ease: "easeInOut",
              repeat: isAnimating ? Number.POSITIVE_INFINITY : 0,
              repeatType: "loop",
            }}
          >
            <ArrowRight className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
          </motion.div>
        </div>

        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
            <div className="relative bg-gradient-to-br from-emerald-400/40 to-teal-600/40 dark:from-emerald-400/30 dark:to-teal-600/30 p-4 rounded-xl border border-emerald-500/40 dark:border-emerald-500/30 backdrop-blur-sm">
              <DollarSign className="w-8 h-8 text-emerald-800 dark:text-emerald-200" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Only render particles on client-side to avoid hydration mismatch */}
      {isClient && (
        <>
          {Array.from({ length: 15 }).map((_, i) => {
            // Use deterministic seeds for each particle
            const x = ((i * 19) % 300) - 150;
            const y = ((i * 27) % 300) - 150;
            const opacity = 0.3 + ((i * 11) % 50) / 100;

            return (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-emerald-600/40 dark:bg-emerald-400/30"
                initial={{
                  x,
                  y,
                  opacity,
                }}
                animate={{
                  x: [((i * 23) % 300) - 150, ((i * 29) % 300) - 150],
                  y: [((i * 31) % 300) - 150, ((i * 37) % 300) - 150],
                  opacity: [opacity, opacity + 0.2, opacity],
                }}
                transition={{
                  duration: 10 + (i % 10),
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "reverse",
                }}
              />
            );
          })}
        </>
      )}

      <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
