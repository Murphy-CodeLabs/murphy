"use client";

import { useState } from "react";
import { Check, Clipboard } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InstallationCommandsProps {
  packageUrl: string;
}

export default function InstallationCommands({
  packageUrl,
}: InstallationCommandsProps) {
  const [command, setCommand] = useState(
    `pnpm dlx shadcn@canary add ${packageUrl}`
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    toast.success("Command copied to clipboard");

    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  return (
    <div className="rounded-lg overflow-hidden">
      <div className="bg-fd-background text-white">
        <Tabs defaultValue="pnpm">
          <TabsList className="bg-fd-background rounded-none h-12 px-2 w-full justify-between">
            <div>
              <TabsTrigger
                value="pnpm"
                onClick={() =>
                  setCommand(`pnpm dlx shadcn@canary add ${packageUrl}`)
                }
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-[color:var(--fd-border)] data-[state=active]:shadow-none rounded-none px-2 text-white data-[state=inactive]:text-zinc-500 data-[state=active]:text-fd-primary"
              >
                pnpm
              </TabsTrigger>
              <TabsTrigger
                value="npm"
                onClick={() =>
                  setCommand(`npx shadcn@latest add ${packageUrl}`)
                }
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-[color:var(--fd-border)] data-[state=active]:shadow-none rounded-none px-2 text-white data-[state=inactive]:text-zinc-500 data-[state=active]:text-fd-primary"
              >
                npm
              </TabsTrigger>
              <TabsTrigger
                value="yarn"
                onClick={() =>
                  setCommand(`yarn dlx shadcn@latest add ${packageUrl}`)
                }
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-[color:var(--fd-border)] data-[state=active]:shadow-none rounded-none px-2 text-white data-[state=inactive]:text-zinc-500 data-[state=active]:text-fd-primary"
              >
                yarn
              </TabsTrigger>
              <TabsTrigger
                value="bun"
                onClick={() =>
                  setCommand(`bunx --bun shadcn@latest add ${packageUrl}`)
                }
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-[color:var(--fd-border)] data-[state=active]:shadow-none rounded-none px-2 text-white data-[state=inactive]:text-zinc-500 data-[state=active]:text-fd-primary"
              >
                bun
              </TabsTrigger>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-zinc-800 rounded-md hover:text-white"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="size-3" />
              ) : (
                <Clipboard className="size-3" />
              )}
            </Button>
          </TabsList>

          <TabsContent value="pnpm" className="p-4 pt-2">
            <div className="font-mono text-sm text-fd-foreground">
              <span className="text-fd-primary">pnpm</span> dlx shadcn@canary
              add {packageUrl}
            </div>
          </TabsContent>

          <TabsContent value="npm" className="p-4 pt-2">
            <div className="font-mono text-sm text-fd-foreground">
              <span className="text-fd-primary">npx</span> shadcn@latest add{" "}
              {packageUrl}
            </div>
          </TabsContent>

          <TabsContent value="yarn" className="p-4 pt-2">
            <div className="font-mono text-sm text-fd-foreground">
              <span className="text-fd-primary">yarn</span> dlx shadcn@latest
              add {packageUrl}
            </div>
          </TabsContent>

          <TabsContent value="bun" className="p-4 pt-2">
            <div className="font-mono text-sm text-fd-foreground">
              <span className="text-fd-primary">bunx</span> --bun shadcn@latest
              add {packageUrl}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
