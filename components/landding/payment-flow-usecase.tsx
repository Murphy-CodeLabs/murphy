"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

export function PaymentFlowUseCase() {
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
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          strokeWidth="0.5"
          stroke="currentColor"
          fill="none"
        >
          {/* Wallet icon */}
          <path d="M19,7H18V6a3,3,0,0,0-3-3H5A3,3,0,0,0,2,6V18a3,3,0,0,0,3,3H19a3,3,0,0,0,3-3V10A3,3,0,0,0,19,7ZM5,5H15a1,1,0,0,1,1,1V7H5A1,1,0,0,1,5,5ZM20,15H19a1,1,0,0,1,0-2h1Zm0-4H19a3,3,0,0,0,0,6h1v1a1,1,0,0,1-1,1H5a1,1,0,0,1-1-1V8.83A3,3,0,0,0,5,9H19a1,1,0,0,1,1,1Z" />
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
          {/* Credit Card icon */}
          <path d="M7,21h10a3,3,0,0,0,3-3V6a3,3,0,0,0-3-3H7A3,3,0,0,0,4,6V18A3,3,0,0,0,7,21ZM6,6A1,1,0,0,1,7,5H17a1,1,0,0,1,1,1V9H6ZM6,11H18v7a1,1,0,0,1-1,1H7a1,1,0,0,1-1-1ZM13,15H11a1,1,0,0,1,0-2h2a1,1,0,0,1,0,2Z" />
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
          {/* Dollar/Currency icon */}
          <path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" />
          <path d="M12,7a3,3,0,0,0-3,3,1,1,0,0,0,2,0,1,1,0,0,1,1-1,1,1,0,0,1,0,2,1,1,0,0,0,0,2,3,3,0,0,0,0,6,3,3,0,0,0,3-3,1,1,0,0,0-2,0,1,1,0,0,1-1,1,1,1,0,0,1,0-2,1,1,0,0,0,0-2,3,3,0,0,0,0-6Z" />
          <path d="M12,6a1,1,0,0,0,1-1V4a1,1,0,0,0-2,0V5A1,1,0,0,0,12,6Z" />
          <path d="M12,18a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V19A1,1,0,0,0,12,18Z" />
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
              <div className="absolute inset-0 blur-2xl rounded-full" />
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
