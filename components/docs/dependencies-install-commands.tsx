"use client";

import { useState } from "react";
import { Check, Clipboard } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DependenciesInstallCommandsProps {
  packageUrl: string;
}

export default function DependenciesInstallCommands({
  packageUrl,
}: DependenciesInstallCommandsProps) {
  const [copied, setCopied] = useState(false);
  const [command, setCommand] = useState(generateCommand("pnpm", packageUrl));

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    toast.success("Command copied to clipboard");

    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  function generateCommand(tool: "pnpm" | "npm" | "yarn" | "bun", url: string) {
    switch (tool) {
      case "pnpm":
        return `pnpm add ${url}`;
      case "npm":
        return `npm install ${url}`;
      case "yarn":
        return `yarn add ${url}`;
      case "bun":
        return `bun add ${url}`;
    }
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-fd-background text-white">
        <Tabs defaultValue="pnpm">
          <TabsList className="bg-fd-background rounded-none h-12 px-2 w-full justify-between">
            <div>
              {(["pnpm", "npm", "yarn", "bun"] as const).map((tool) => (
                <TabsTrigger
                  key={tool}
                  value={tool}
                  onClick={() => setCommand(generateCommand(tool, packageUrl))}
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-[color:var(--fd-border)] data-[state=active]:shadow-none rounded-none px-2 text-white data-[state=inactive]:text-zinc-500 data-[state=active]:text-fd-primary"
                >
                  {tool}
                </TabsTrigger>
              ))}
            </div>

            <Button variant="ghost" size="icon" onClick={handleCopy}>
              {copied ? (
                <Check className="size-3" />
              ) : (
                <Clipboard className="size-3" />
              )}
            </Button>
          </TabsList>

          {(["pnpm", "npm", "yarn", "bun"] as const).map((tool) => (
            <TabsContent key={tool} value={tool} className="p-4 pt-2">
              <div className="font-mono text-sm text-fd-foreground">
                <span className="text-fd-primary">{tool}</span>{" "}
                {generateCommand(tool, packageUrl).replace(`${tool} `, "")}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
