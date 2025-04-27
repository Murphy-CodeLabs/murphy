"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gamepad2Icon, Trophy, Gem } from "lucide-react";

export function GamingGridUseCase() {
  const [isHovered, setIsHovered] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Only render particles on client-side to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  const icons = [
    { Icon: Gamepad2Icon, delay: 0 },
    { Icon: Trophy, delay: 0.2 },
    { Icon: Gem, delay: 0.4 },
  ];

  return (
    <div
      className="relative w-full h-full flex items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      ref={containerRef}
    >
      <div className="absolute inset-0 bg-gradient-radial from-purple-500/20 dark:from-purple-500/10 to-transparent opacity-70" />

      <div className="relative flex items-center justify-center gap-8 z-10">
        {icons.map(({ Icon, delay }, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0.7 }}
            animate={{
              opacity: 1,
              scale: isHovered ? 1.1 : 1,
              y: isHovered ? -5 : 0,
            }}
            transition={{
              duration: 0.5,
              delay: isHovered ? delay * 0.2 : 0,
              type: "spring",
              stiffness: 200,
            }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
              <div className="relative bg-gradient-to-br from-purple-400/40 to-indigo-600/40 dark:from-purple-400/30 dark:to-indigo-600/30 p-4 rounded-xl border border-purple-500/40 dark:border-purple-500/30 backdrop-blur-sm">
                <Icon className="w-8 h-8 text-purple-800 dark:text-purple-200" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-background to-transparent" />

      {/* Only render particles on client-side to avoid hydration mismatch */}
      {isClient && (
        <>
          {Array.from({ length: 15 }).map((_, i) => {
            // Use deterministic seeds for each particle
            const x = ((i * 17) % 300) - 150;
            const y = ((i * 23) % 300) - 150;
            const opacity = 0.3 + ((i * 13) % 50) / 100;

            return (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-purple-600/40 dark:bg-purple-400/30"
                initial={{
                  x,
                  y,
                  opacity,
                }}
                animate={{
                  x: [((i * 19) % 300) - 150, ((i * 23) % 300) - 150],
                  y: [((i * 29) % 300) - 150, ((i * 31) % 300) - 150],
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
    </div>
  );
}
