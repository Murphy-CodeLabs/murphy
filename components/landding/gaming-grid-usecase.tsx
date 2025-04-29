"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

export function GamingGridUseCase() {
  const [isHovered, setIsHovered] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Only render particles on client-side to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  const icons = [
    {
      Icon: (
        <svg
          width="32"
          height="32"
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
          strokeWidth="0.5"
          stroke="currentColor"
          fill="none"
        >
          <path d="M0 13L3 14L6 11H10L13 14L16 13L15.248 4.7284C15.1076 3.18316 13.812 2 12.2604 2H3.73964C2.18803 2 0.89244 3.18316 0.751964 4.72839L0 13ZM12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6ZM12 8C12 8.55228 11.5523 9 11 9C10.4477 9 10 8.55228 10 8C10 7.44772 10.4477 7 11 7C11.5523 7 12 7.44772 12 8ZM5 8C6.10457 8 7 7.10457 7 6C7 4.89543 6.10457 4 5 4C3.89543 4 3 4.89543 3 6C3 7.10457 3.89543 8 5 8Z" />
        </svg>
      ),
      delay: 0,
    },
    {
      Icon: (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          strokeWidth="0.5"
          stroke="currentColor"
          fill="none"
        >
          <path d="M12,15a1,1,0,0,0-1,1v6a1,1,0,0,0,2,0V16A1,1,0,0,0,12,15Z" />
          <path d="M5,12H3a1,1,0,0,0,0,2H5a1,1,0,0,0,0-2Z" />
          <path d="M21,12H19a1,1,0,0,0,0,2h2a1,1,0,0,0,0-2Z" />
          <path d="M6.36,6.36a1,1,0,0,0-1.41,0L3.51,7.79A1,1,0,0,0,4.93,9.21L6.36,7.79A1,1,0,0,0,6.36,6.36Z" />
          <path d="M17.64,6.36a1,1,0,0,0,0,1.43l1.43,1.42a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42L19.07,6.36A1,1,0,0,0,17.64,6.36Z" />
          <path d="M12,8a4,4,0,1,0,4,4A4,4,0,0,0,12,8Zm0,6a2,2,0,1,1,2-2A2,2,0,0,1,12,14Z" />
          <path d="M12,5a1,1,0,0,0,1-1V2a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5Z" />
        </svg>
      ),
      delay: 0.2,
    },
    {
      Icon: (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          strokeWidth="0.5"
          stroke="currentColor"
          fill="none"
        >
          <path d="M20.66,7.26c0-.07,0-.14,0-.21s0-.15,0-.22a2.37,2.37,0,0,0-.1-.65,2.49,2.49,0,0,0-.23-.6,3,3,0,0,0-.39-.51,2.54,2.54,0,0,0-.51-.39,2.33,2.33,0,0,0-.6-.23,2.37,2.37,0,0,0-.65-.1c-.07,0-.15,0-.22,0s-.14,0-.21,0H6.33c-.07,0-.14,0-.21,0s-.15,0-.22,0a2.37,2.37,0,0,0-.65.1,2.49,2.49,0,0,0-.6.23,3,3,0,0,0-.51.39,2.54,2.54,0,0,0-.39.51,2.33,2.33,0,0,0-.23.6,2.37,2.37,0,0,0-.1.65c0,.07,0,.15,0,.22s0,.14,0,.21V16.74c0,.07,0,.14,0,.21s0,.15,0,.22a2.37,2.37,0,0,0,.1.65,2.49,2.49,0,0,0,.23.6,3,3,0,0,0,.39.51,2.54,2.54,0,0,0,.51.39,2.33,2.33,0,0,0,.6.23,2.37,2.37,0,0,0,.65.1c.07,0,.15,0,.22,0s.14,0,.21,0H17.67c.07,0,.14,0,.21,0s.15,0,.22,0a2.37,2.37,0,0,0,.65-.1,2.49,2.49,0,0,0,.6-.23,3,3,0,0,0,.51-.39,2.54,2.54,0,0,0,.39-.51,2.33,2.33,0,0,0,.23-.6,2.37,2.37,0,0,0,.1-.65c0-.07,0-.15,0-.22s0-.14,0-.21ZM12,16a1,1,0,1,1,1-1A1,1,0,0,1,12,16Zm0-4a1,1,0,0,1-1-1V9a1,1,0,0,1,2,0v2A1,1,0,0,1,12,12Z" />
        </svg>
      ),
      delay: 0.4,
    },
  ];

  return (
    <div
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      ref={containerRef}
    >
      <div className="relative flex items-center justify-center gap-12 z-10">
        {icons.map(({ Icon, delay }, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0.7 }}
            animate={{
              opacity: 1,
              scale: isHovered ? 1.15 : 1,
              y: isHovered ? -8 : 0,
            }}
            transition={{
              duration: 0.6,
              delay: isHovered ? delay * 0.3 : 0,
              type: "spring",
              stiffness: 300,
              damping: 15,
            }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              <div className="absolute inset-0 blur-2xl rounded-full bg-background" />
              <div className="relative p-6 rounded-2xl border">{Icon}</div>
            </div>
          </motion.div>
        ))}
      </div>

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
                className="absolute w-1 h-1 rounded-full"
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
