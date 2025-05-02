"use client";

import { FlickeringGrid } from "../background/flickering-grid";
import { useEffect, useState } from "react";

interface StatsData {
  totalCopies: number;
  components: Array<{
    componentName: string;
    copyCount: number;
  }>;
  totalComponents: number;
}

export function StatsSection() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats");
        const data = await response.json();
        if (data.success) {
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <>
      <section>
        <div className="overflow relative from-background to-muted/50 flex w-full flex-col items-center justify-center border-x bg-gradient-to-b px-2 py-5 lg:py-10 md:px-0 ">
          <FlickeringGrid
            className="absolute inset-0 z-0 size-full from-background to-muted/50 bg-gradient-to-b [mask-image:linear-gradient(to_bottom,#000_10%,transparent_80%)]"
            squareSize={4}
            gridGap={6}
            color="#6B7280"
            maxOpacity={0.5}
            flickerChance={0.1}
          />
          <h2 className="text-foreground text-pretty text-center text-md dark:opacity-90 dark:drop-shadow-lg max-w-xl mx-auto z-10 font-semibold">
            Stats
          </h2>
        </div>
        <div className="from-muted/40 bg-gradient-to-b to-transparent to-50% border px-4 py-10">
          <div className="relative z-10 max-w-xl space-y-4">
            <h2 className="text-lg font-medium lg:text-2xl">
              Command Usage Statistics
            </h2>
            <p className="text-sm">
              Track your command usage and user engagement in real-time
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:gap-8 lg:gap-12">
            <div>
              <div className="mb-8 mt-8 grid grid-cols-2 gap-2 md:mb-0">
                <div className="space-y-2">
                  <div className="bg-linear-to-r from-zinc-950 to-zinc-600 bg-clip-text text-3xl font-bold text-transparent dark:from-white dark:to-zinc-800">
                    {loading ? "0" : stats?.totalCopies.toLocaleString()}+
                  </div>
                  <p className="text-sm">Total Commands Copied</p>
                </div>
                <div className="space-y-2">
                  <div className="bg-linear-to-r from-zinc-950 to-zinc-600 bg-clip-text text-3xl font-bold text-transparent dark:from-white dark:to-zinc-800">
                    {loading ? "0" : stats?.totalComponents.toLocaleString()}+
                  </div>
                  <p className="text-sm">Total Components</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <blockquote className="border-l-4 pl-4">
                <p className="text-sm">
                  Our platform helps developers save time and increase
                  productivity by CLI commands.
                </p>
              </blockquote>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
