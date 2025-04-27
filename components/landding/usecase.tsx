import { FlickeringGrid } from "../background/flickering-grid";
import { GamingGridUseCase } from "./gaming-grid-usecase";
import { OrbitingCirclesUseCase } from "./orbiting-circles-usecase";
import { PaymentFlowUseCase } from "./payment-flow-usecase";

export function UseCaseSection() {
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
            Use Cases
          </h2>
        </div>
        <div className="from-muted/40 grid w-full grid-cols-1 border-b border-r bg-gradient-to-b to-transparent to-50% sm:grid-cols-2 md:grid-cols-3">
          <div className="border-x border-t">
            <div className="flex flex-col items-center justify-center h-[350px] overflow-hidden border-b -mb-[1px]">
              <GamingGridUseCase />
            </div>
            <div className="flex flex-col justify-center text-left px-4 py-6 -mr-[1px] -mt-[1px] -ml-[1px]">
              <p className="text-md font-bold">Web3 Gaming</p>
              <p className="text-sm">
                Develop blockchain games with NFT assets, token rewards, and
                on-chain game mechanics.
              </p>
            </div>
          </div>
          <div className="border-x border-t -mr-[1px] -ml-[1px]">
            <div className="flex flex-col items-center justify-center h-[350px] overflow-hidden border-b -mb-[1px]">
              <div className="flex items-center justify-center h-full w-full">
                <OrbitingCirclesUseCase />
              </div>
            </div>
            <div className="flex flex-col justify-center text-left px-4 py-6 -mr-[1px] -mt-[1px] -ml-[1px]">
              <p className="text-md font-bold">DeFi Applications</p>
              <p className="text-sm">
                Build decentralized exchanges, lending platforms, and yield
                farming solutions on Solana.
              </p>
            </div>
          </div>
          <div className="border-x border-t -mr-[1px] ">
            <div className="flex flex-col items-center justify-center h-[350px] overflow-hidden border-b -mb-[1px]">
              <div className="flex items-center justify-center h-full w-full">
                <PaymentFlowUseCase />
              </div>
            </div>
            <div className="flex flex-col justify-center text-left px-4 py-6 -mr-[1px] -mt-[1px] -ml-[1px]">
              <p className="text-md font-bold">Payment Infrastructure</p>
              <p className="text-sm">
                Create fast, secure payment systems with low fees for e-commerce
                and cross-border transfers.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
