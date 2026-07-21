import React from 'react';

export default function DilectiNavIcon({ heartColor = "text-current", strokeWidth = "1.75", ...props }: React.SVGProps<SVGSVGElement> & { heartColor?: string, strokeWidth?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc" {...props}>
      <title id="title">Dilecti nav lightbulb icon</title>
      <desc id="desc">Small monochrome Dilecti heart lightbulb icon designed for a gray bottom navigation bar.</desc>
      <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.25V1"/>
        <path d="M7.15 4.05L6.1 3"/>
        <path d="M16.85 4.05L17.9 3"/>
        <path d="M12 4.4C8.45 4.4 5.9 7.05 5.9 10.35C5.9 12.55 6.98 14.27 8.52 15.68C9.6 16.67 9.95 17.65 9.95 18.65H14.05C14.05 17.65 14.4 16.67 15.48 15.68C17.02 14.27 18.1 12.55 18.1 10.35C18.1 7.05 15.55 4.4 12 4.4Z"/>
        <path d="M9.55 20.05H14.45"/>
        <path d="M9.85 22H14.15"/>
      </g>
      <path className={heartColor} fill="currentColor" d="M12 14.25C11.73 14 11.39 13.7 11 13.36C9.65 12.19 8.65 11.32 8.65 10.03C8.65 8.96 9.47 8.17 10.54 8.17C11.15 8.17 11.7 8.48 12 8.91C12.3 8.48 12.85 8.17 13.46 8.17C14.53 8.17 15.35 8.96 15.35 10.03C15.35 11.32 14.35 12.19 13 13.36C12.61 13.7 12.27 14 12 14.25Z"/>
    </svg>
  );
}
