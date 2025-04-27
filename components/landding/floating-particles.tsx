"use client";

import { useRef } from "react";
import { motion } from "framer-motion";

interface FloatingParticlesProps {
  count?: number;
  color?: string;
  maxSize?: number;
}

export function FloatingParticles({
  count = 30,
  color = "currentColor",
  maxSize = 4,
}: FloatingParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
      {Array.from({ length: count }).map((_, i) => {
        const size = Math.random() * maxSize + 1;

        return (
          <motion.div
            key={i}
            className="absolute rounded-full opacity-30 dark:opacity-40"
            style={{
              width: size,
              height: size,
              backgroundColor: color,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, Math.random() * -100 - 50],
              x: [0, (Math.random() - 0.5) * 50],
              opacity: [0.1, 0.3, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        );
      })}
    </div>
  );
}
