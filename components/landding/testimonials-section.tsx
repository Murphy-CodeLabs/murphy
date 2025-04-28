import { FlickeringGrid } from "../background/flickering-grid";
import { AvatarCircles } from "../ui/avatar-circles";
import { StarIcon } from "lucide-react";

// Testimonial data array
const testimonials = [
  {
    name: "Alex Chen",
    role: "Senior Developer at SolTech",
    avatarUrl: "https://i.pravatar.cc/150?img=1",
    quote:
      "Murphy has completely transformed our development workflow. We're building dApps on Solana in half the time it used to take us.",
  },
  {
    name: "Sarah Johnson",
    role: "Founder at NFT Marketplace",
    avatarUrl: "https://i.pravatar.cc/150?img=5",
    quote:
      "The simplicity of integrating wallet connections and handling transactions made our NFT platform development incredibly smooth.",
  },
  {
    name: "Michael Rodriguez",
    role: "CTO at DeFi Protocol",
    avatarUrl: "https://i.pravatar.cc/150?img=12",
    quote:
      "We evaluated several frameworks before choosing Murphy. The performance optimizations and ease of use were unmatched.",
    rating: 4,
  },
  {
    name: "Emily Zhang",
    role: "Lead Engineer at GameDAO",
    avatarUrl: "https://i.pravatar.cc/150?img=20",
    quote:
      "Our Web3 game needed reliable blockchain integration without sacrificing UX. Murphy delivered exactly what we needed.",
  },
  {
    name: "David Kim",
    role: "Developer at Payment Solutions",
    avatarUrl: "https://i.pravatar.cc/150?img=15",
    quote:
      "Building our payment infrastructure on Solana with Murphy reduced transaction costs by 90% while improving processing speed.",
  },
  {
    name: "Lisa Patel",
    role: "Project Manager at Web3 Agency",
    avatarUrl: "https://i.pravatar.cc/150?img=33",
    quote:
      "The documentation and community support around Murphy has been exceptional. It's made onboarding new team members so much easier.",
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
                avatarUrl={testimonial.avatarUrl}
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
      <p className="text-sm flex-grow italic text-left">{quote}</p>
    </div>
  );
}
