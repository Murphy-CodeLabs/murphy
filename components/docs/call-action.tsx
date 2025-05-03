import { Button } from "@/components/ui/button";
import { Feedback } from "../feadback-card";
import { LinkTree } from "../community-links";

export function CallAction() {
  return (
    <div className="flex flex-col gap-4">
      <Feedback />
      <LinkTree />
    </div>
  );
}
