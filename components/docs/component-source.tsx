"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Code, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface ComponentSourceProps {
  name: string;
  children?: React.ReactNode;
  source?: string;
  githubUrl?: string;
  description?: string;
  category?: string;
  tags?: string[];
  dependencies?: string[];
}

export function ComponentSource({
  name,
  children,
  source,
  githubUrl,
  description,
  category,
  tags = [],
  dependencies = []
}: ComponentSourceProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy code");
    }
  };

  const copyCommand = async () => {
    const command = `npx @murphy/cli@latest add ${name}`;
    await copyToClipboard(command);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{name}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {category && (
            <Badge variant="secondary">{category}</Badge>
          )}
          {githubUrl && (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View Source
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Install Command */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Code className="h-4 w-4" />
            Installation
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between bg-secondary/50 rounded-md p-3">
            <code className="text-sm font-mono">
              npx @murphy/cli@latest add {name}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyCommand}
              className="h-8 w-8 p-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dependencies */}
      {dependencies.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Dependencies</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {dependencies.map((dep, index) => (
                <code key={index} className="text-sm bg-secondary/50 px-2 py-1 rounded block">
                  {dep}
                </code>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Source Code */}
      {source && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Source Code
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(source)}
                className="h-8 w-8 p-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <pre className="bg-secondary/50 p-4 rounded-md overflow-x-auto text-sm">
              <code>{source}</code>
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Custom Content */}
      {children && (
        <div className="space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

// Alternative simpler version
export function ComponentSourceSimple({
  name,
  children
}: {
  name: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const copyCommand = async () => {
    try {
      const command = `npx @murphy/cli@latest add ${name}`;
      await navigator.clipboard.writeText(command);
      setCopied(true);
      toast.success("Command copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy command");
    }
  };

  return (
    <div className="my-6 rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6 pb-3">
        <h3 className="text-lg font-semibold leading-none tracking-tight">
          Installation
        </h3>
      </div>
      <div className="p-6 pt-0">
        <div className="flex items-center justify-between rounded-md bg-muted px-4 py-3">
          <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
            npx @murphy/cli@latest add {name}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyCommand}
            className="h-6 w-6 p-0"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export { ComponentSource as default };