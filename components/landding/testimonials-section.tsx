import { FlickeringGrid } from "../background/flickering-grid";
import { AvatarCircles } from "../ui/avatar-circles";
import { StarIcon } from "lucide-react";

// Testimonial data array
const testimonials = [
  {
    name: "Solomon",
    role: "Solana lead dev rel",
    avatarUrl:
      "https://pbs.twimg.com/profile_images/1900239823253782528/cVjoQ-Rx_400x400.jpg",
    quote: "This looks great, how can I help",
  },
  {
    name: "Zhe | Poll",
    role: "Developer at SolToolkit",
    avatarUrl: "https://pbs.twimg.com/profile_images/1633646870340722694/apYQ1Wku_400x400.jpg",
    quote: `Generating UI with AI is hit and miss. \n
            I would love a v0-style app that generates multiple design variations at once 
            and presents them to choose from. 
            Better yet, multiple designs from different models.`,
  },
  {
    name: "k2 | superteam 🇻🇳 🇬🇧",
    role: "Lead at SuperteamVN",
    avatarUrl: "https://pbs.twimg.com/profile_images/1782916325544767488/nuWf-EUh_400x400.jpg",
    quote: `<span style="color: blue;">@murphyaidev</span>
            is Solana’s on-chain dev toolkit — born from 
            <span style="color: blue;">@pkxro</span>
            ’s call, built with 
            <span style="color: blue;">@sendaifun</span>
            , and now aiming to become the AI-aid tool for solana manlets. 
            <span style="color: blue;">@SaitamaCoder_VN</span>
            bets devs will love it like 
            <span style="color: blue;">@cursor_ai</span>
            . He’s got few weeks to prove it.`,
  },
];

export function TestimonialsSection() {
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
            Testimonials
          </h2>
        </div>
        <div className="from-muted/40 bg-gradient-to-b to-transparent to-50% ">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={index}
                name={testimonial.name}
                role={testimonial.role}
                avatarUrl={testimonial.avatarUrl || "https://via.placeholder.com/150"}
                quote={testimonial.quote}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

interface TestimonialCardProps {
  name: string;
  role: string;
  avatarUrl: string;
  quote: string;
}

function TestimonialCard({
  name,
  role,
  avatarUrl,
  quote,
}: TestimonialCardProps) {
  return (
    <div className="bg-background/50 backdrop-blur-sm border -mr-[1px] -ml-[1px] -mt-[1px] -mb-[1px] p-6 flex flex-col h-full">
      <div className="flex items-start mb-4">
        <div className="mr-3">
          <AvatarCircles
            avatarUrls={[
              {
                imageUrl: avatarUrl,
                profileUrl: "#",
              },
            ]}
          />
        </div>
        <div className="flex flex-col text-left">
          <h3 className="font-medium text-sm">{name}</h3>
          <p className="text-muted-foreground text-xs">{role}</p>
        </div>
      </div>
      <p className="text-sm flex-grow italic text-left" dangerouslySetInnerHTML={{ __html: quote }}></p>
    </div>
  );
}
