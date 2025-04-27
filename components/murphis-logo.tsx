import Image from "next/image";
export default function MurphisLogo() {
  return (
    <Image
      src="/murphis/logo/murphis.svg"
      alt="Murphis Logo"
      width={100}
      height={100}
      className="size-7 invert dark:invert-0"
    />
  );
}
