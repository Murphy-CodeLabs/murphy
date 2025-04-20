import OpenInV0Button from "./open-in-v0-button";
import { cn } from "@/lib/utils";

export function PreviewComponent({
  children,
  name,
  className,
  v0JsonFileName,
}: {
  children: React.ReactNode;
  name: string;
  className?: string;
  v0JsonFileName: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border rounded-lg p-4 min-h-[450px] relative",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-muted-foreground sm:pl-3">{name}</h2>

        <div className="flex items-center gap-2">
          <OpenInV0Button name={v0JsonFileName} className="w-fit" />
        </div>
      </div>
      <div className="flex items-center justify-center min-h-[400px] relative py-16">
        {children}
      </div>
    </div>
  );
}
