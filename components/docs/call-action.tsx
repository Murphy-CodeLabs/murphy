import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardFooter } from "../ui/card";
import Link from "next/link";
import { linkIcons } from "../community-links";
import { Feedback } from "../feadback-card";

const LinkTree = () => {
  return (
    <div className="w-full rounded-sm shadow-none gap-1 p-2 border">
      <p className="text-sm text-black dark:text-neutral-400">
        Join Our Community
      </p>

      <div className="flex gap-2 mt-2">
        {linkIcons.map((link) => (
          <Button
            size="icon"
            className="rounded-sm shadow-none"
            variant="ghost"
            asChild
            key={link.href}
          >
            <Link target="_blank" href={link.href}>
              {link.icon}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
};

export function CallAction() {
  return (
    <div className="flex flex-col gap-4">
      <Feedback />
      <LinkTree />
    </div>
  );
}
