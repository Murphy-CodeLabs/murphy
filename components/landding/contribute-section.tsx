import Image from "next/image";
import { Ripple } from "../background/ripple";
import { LinkButton } from "../ui/link-button";
import { AvatarCircles } from "../ui/avatar-circles";
import { FlickeringGrid } from "../background/flickering-grid";

const avatars = [
  {
    imageUrl: "https://avatars.githubusercontent.com/u/110114506",
    profileUrl: "https://github.com/Lou1sVuong",
  },
  {
    imageUrl: "https://avatars.githubusercontent.com/u/112191530",
    profileUrl: "https://github.com/SaitamaCoderVN",
  },
  {
    imageUrl: "https://avatars.githubusercontent.com/u/88271496",
    profileUrl: "https://github.com/henryhoangduong",
  },
];

export function ContributeSection() {
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
            Community
          </h2>
        </div>
        <div className="relative p-4 flex flex-col items-center justify-center border from-muted/40 bg-gradient-to-b to-transparent to-50% py-24">
          <h2 className="text-pretty  text-center text-md  dark:opacity-90 dark:drop-shadow-lg max-w-xl mx-auto">
            We're grateful for the amazing open-source community that helps make
            our project better every day.
          </h2>
          <AvatarCircles numPeople={69} avatarUrls={avatars} />
          <LinkButton
            className="mt-4"
            variant={"outline"}
            href="https://github.com/murphis/murphis"
            blankTarget
          >
            <Image
              src="/brand-logos/github.svg"
              alt="GitHub Logo"
              className="size-6 mr-2 dark:invert"
              width={16}
              height={16}
            />
            Become a contributor
          </LinkButton>
          <Ripple />
        </div>
      </section>
    </>
  );
}
