export const BotsIcon = ({ size = 18, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="7" width="14" height="13" rx="2" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M12 4V7" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="9" cy="12" r="1" fill={color}/>
    <circle cx="15" cy="12" r="1" fill={color}/>
    <path d="M9 16H15" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="2" r="1" fill={color}/>
  </svg>
);
