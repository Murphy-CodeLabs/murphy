import { OrbitingCircles } from "./orbiting-circles";

export function OrbitingCirclesUseCase() {
  return (
    <div className="relative flex h-[120%] w-full flex-col items-center justify-center">
      <OrbitingCircles iconSize={60}>
        <Icons.music />
        <Icons.folder />
        <Icons.bmo />
        <Icons.home />
        <Icons.mailbox />
      </OrbitingCircles>
      <OrbitingCircles iconSize={40} radius={100} reverse speed={2}>
        <Icons.mailbox />
        <Icons.folder />
        <Icons.bmo />
        <Icons.home />
        <Icons.music />
      </OrbitingCircles>
    </div>
  );
}

const Icons = {
  music: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      width="100"
      height="100"
      viewBox="0 0 48 48"
    >
      <path
        fill="#f50057"
        d="M42,37c0,2.762-2.238,5-5,5H11c-2.761,0-5-2.238-5-5V11c0-2.762,2.239-5,5-5h26c2.762,0,5,2.238,5,5 V37z"
      ></path>
      <path
        fill="#fff"
        d="M19.775,14.821C19.321,14.926,19,15.33,19,15.796V29c0,0.552-0.448,1-1,1h-1c-2.209,0-4,1.343-4,3	s1.791,3,4,3s4-1.343,4-3V21.334c0-0.466,0.321-0.87,0.775-0.974l7.306-1.686C29.551,18.565,30,18.922,30,19.404V26	c0,0.552-0.448,1-1,1h-1c-2.209,0-4,1.343-4,3s1.791,3,4,3s4-1.343,4-3V13.257c0-0.643-0.598-1.119-1.225-0.974L19.775,14.821z"
      ></path>
    </svg>
  ),
  folder: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      width="100"
      height="100"
      viewBox="0 0 48 48"
    >
      <path
        fill="#FFA000"
        d="M40,12H22l-4-4H8c-2.2,0-4,1.8-4,4v8h40v-4C44,13.8,42.2,12,40,12z"
      ></path>
      <path
        fill="#FFCA28"
        d="M40,12H8c-2.2,0-4,1.8-4,4v20c0,2.2,1.8,4,4,4h32c2.2,0,4-1.8,4-4V16C44,13.8,42.2,12,40,12z"
      ></path>
    </svg>
  ),
  bmo: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      width="100"
      height="100"
      viewBox="0 0 48 48"
    >
      <path
        fill="none"
        stroke="#00796b"
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeWidth="3"
        d="M3.5 34.5C3.5 29.253 7.753 24 13 24M44.5 14.5c0 5.247-4.253 9.5-9.5 9.5M19.5 36.5L19.5 44.5M28.5 36.5L28.5 44.5"
      ></path>
      <path
        fill="#00bfa5"
        d="M34,37H14c-1.105,0-2-0.895-2-2V5c0-1.105,0.895-2,2-2h20c1.105,0,2,0.895,2,2v30 C36,36.105,35.105,37,34,37z"
      ></path>
      <path
        fill="#e0f2f1"
        d="M32,19H16c-0.552,0-1-0.448-1-1V7c0-0.552,0.448-1,1-1h16c0.552,0,1,0.448,1,1v11 C33,18.552,32.552,19,32,19z"
      ></path>
      <path
        fill="#212121"
        d="M18.5 9A1.5 1.5 0 1 0 18.5 12 1.5 1.5 0 1 0 18.5 9zM29.5 9A1.5 1.5 0 1 0 29.5 12 1.5 1.5 0 1 0 29.5 9z"
      ></path>
      <path
        fill="none"
        stroke="#212121"
        strokeMiterlimit="10"
        d="M26.5,13c0,1.381-1.119,2.5-2.5,2.5s-2.5-1.119-2.5-2.5"
      ></path>
      <path
        fill="#212121"
        d="M15 21H27V23H15zM32 21A1 1 0 1 0 32 23 1 1 0 1 0 32 21z"
      ></path>
      <path fill="#76ff03" d="M33 26A1 1 0 1 0 33 28A1 1 0 1 0 33 26Z"></path>
      <path fill="#ffea00" d="M17 25H19V31H17z"></path>
      <path
        fill="#ffea00"
        d="M17 25H19V31H17z"
        transform="rotate(-90 18 28)"
      ></path>
      <path
        fill="#212121"
        d="M18 35h-2c-.552 0-1-.448-1-1l0 0c0-.552.448-1 1-1h2c.552 0 1 .448 1 1l0 0C19 34.552 18.552 35 18 35zM24 35h-2c-.552 0-1-.448-1-1l0 0c0-.552.448-1 1-1h2c.552 0 1 .448 1 1l0 0C25 34.552 24.552 35 24 35z"
      ></path>
      <path
        fill="#ff3d00"
        d="M30.5 30A2.5 2.5 0 1 0 30.5 35A2.5 2.5 0 1 0 30.5 30Z"
      ></path>
      <path fill="#84ffff" d="M28 25L26 28 30 28z"></path>
    </svg>
  ),
  home: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      width="100"
      height="100"
      viewBox="0 0 48 48"
    >
      <path fill="#E8EAF6" d="M42 39L6 39 6 23 24 6 42 23z"></path>
      <path fill="#C5CAE9" d="M39 21L34 16 34 9 39 9zM6 39H42V44H6z"></path>
      <path
        fill="#B71C1C"
        d="M24 4.3L4 22.9 6 25.1 24 8.4 42 25.1 44 22.9z"
      ></path>
      <path fill="#D84315" d="M18 28H30V44H18z"></path>
      <path fill="#01579B" d="M21 17H27V23H21z"></path>
      <path
        fill="#FF8A65"
        d="M27.5,35.5c-0.3,0-0.5,0.2-0.5,0.5v2c0,0.3,0.2,0.5,0.5,0.5S28,38.3,28,38v-2C28,35.7,27.8,35.5,27.5,35.5z"
      ></path>
    </svg>
  ),
  mailbox: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      width="100"
      height="100"
      viewBox="0 0 48 48"
    >
      <path
        fill="#2196F3"
        d="M45,34V18c0-4.418-3.582-8-8-8H16c-4.418,0-8,3.582-8,8v16H45z"
      ></path>
      <path fill="#FF3D00" d="M38 17H42V23H38z"></path>
      <path fill="#FF3D00" d="M30 17H40V19H30z"></path>
      <path fill="#FF3D00" d="M29 16A2 2 0 1 0 29 20A2 2 0 1 0 29 16Z"></path>
      <path fill="#DD2C00" d="M29 17A1 1 0 1 0 29 19A1 1 0 1 0 29 17Z"></path>
      <path fill="#FFCC80" d="M25 34H30V44H25z"></path>
      <path fill="#FFA726" d="M25 34H30V36H25z"></path>
      <path
        fill="#1976D2"
        d="M16,10c-4.411,0-8,3.589-8,8v14v2h2h12h2v-2V18C24,13.589,20.411,10,16,10L16,10z"
      ></path>
      <path
        fill="#64B5F6"
        d="M16,12c-3.309,0-6,2.691-6,6v14h12V18C22,14.691,19.309,12,16,12z"
      ></path>
      <path
        fill="#0D47A1"
        d="M20,20c0,0.552-0.448,1-1,1h-6c-0.552,0-1-0.448-1-1l0,0c0-0.552,0.448-1,1-1h6C19.552,19,20,19.448,20,20L20,20z"
      ></path>
    </svg>
  ),
};
