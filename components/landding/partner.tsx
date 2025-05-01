import React from "react";
import { FlickeringGrid } from "../background/flickering-grid";
import Image from "next/image";
const Partner = () => {
  return (
    <>
      <section className="flex flex-col items-center border-x">
        <div className="overflow relative from-background to-muted/50 flex w-full flex-col items-center justify-center bg-gradient-to-b to-50% px-2 py-5 lg:py-10 md:px-0 ">
          <FlickeringGrid
            className="absolute inset-0 z-0 size-full from-background to-muted/50 bg-gradient-to-b [mask-image:linear-gradient(to_bottom,#000_10%,transparent_80%)]"
            squareSize={4}
            gridGap={6}
            color="#6B7280"
            maxOpacity={0.5}
            flickerChance={0.1}
          />
          <h2 className="text-foreground text-pretty text-center text-md dark:opacity-90 dark:drop-shadow-lg max-w-xl mx-auto z-10 font-semibold">
            Our Partners
          </h2>
        </div>
        <div className="w-full grid grid-cols-3 gap-6 md:gap-8 lg:gap-10 from-background to-muted/50  bg-gradient-to-t">
          <div className="flex items-center gap-2 justify-center">
            <svg
              width="42"
              height="32"
              viewBox="0 0 42 32"
              xmlns="http://www.w3.org/2000/svg"
              className="size-8 md:size-10 lg:size-12 dark:invert"
            >
              <clipPath id="clip0">
                <polygon points="0 0, 20 0, 20 16, 0 16"></polygon>
                <polygon points="0 16, 20 16, 20 32, 0 32"></polygon>
                <polygon points="20 0, 42 0, 42 32, 20 32"></polygon>
              </clipPath>
              <path
                className="logo-path svelte-qowdym"
                d="M32.6944 4.90892H41.4468V8.28973C41.4468 12.8741 37.742 16.5795 33.1571 16.5795H32.6938L32.6944 4.90892ZM20.2372 0H32.6944V31.9071H31.2127C22.1822 31.9071 20.3765 25.6088 20.3765 20.0055L20.2372 0ZM0 7.22433C0 12.9205 4.07522 15.0043 8.61369 15.6993H0V32H8.28973C16.6252 32 17.5978 28.2952 17.5978 24.7757C17.5978 20.4688 14.6338 17.459 10.0495 16.3007H17.5978V0H9.30807C0.972554 0 0 3.70477 0 7.22433Z"
              ></path>
            </svg>
            <p className="text-xl md:text-3xl lg:text-4xl font-extrabold">
              Superteam
            </p>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <Image
              src="/partner/solana-logo.svg"
              alt="Solana"
              width={100}
              height={100}
              className="size-8 md:size-10 lg:size-12"
            />
            <p className="text-xl md:text-3xl lg:text-4xl font-extrabold">
              Solana
            </p>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <Image
              src="/partner/sendai-logo.svg"
              alt="SendAI"
              width={100}
              height={100}
              className="size-8 md:size-10 lg:size-44"
            />
            {/* <p className="text-xl md:text-3xl lg:text-4xl font-extrabold">
              SendAI
            </p> */}
          </div>
        </div>
      </section>
    </>
  );
};

export default Partner;
