import React from 'react';

export default function UsersThree(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17 14.5c2.1 0 3.75 1.5 3.75 3.5v1H24v-1c0-2.8-2.6-5-5.5-5a5.55 5.55 0 0 0-2.2.4" />
      <path d="M7 14.5c-2.1 0-3.75 1.5-3.75 3.5v1H0v-1C0 15 2.6 12.8 5.5 12.8A5.55 5.55 0 0 1 7.7 13.2" />
      <circle cx="20" cy="8" r="3.5" />
      <circle cx="4" cy="8" r="3.5" />
      
      <circle cx="12" cy="9" r="4" />
      <path d="M12 15c-3.3 0-6 2.7-6 6v1h12v-1c0-3.3-2.7-6-6-6Z" />
    </svg>
  );
}
