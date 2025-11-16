export const AriaIcon = ({ size = 18, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M12 8V12L15 15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="2" fill={color}/>
    <path d="M8 4L9 6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 4L15 6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
