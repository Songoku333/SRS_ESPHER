
import React from 'react';

const EsgConsultingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    {/* Circle containing the S */}
    <circle cx="10" cy="14" r="7" strokeLinecap="round" strokeLinejoin="round" />
    
    {/* The 'S' */}
    <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 11.5c0-1.5-4-1.5-5 0 0 2.5 5 2.5 5 5 0 1.5-4 1.5-5 0" />
    
    {/* The '3' (Cubed) */}
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 4h3l-2 2.5c1 0 2 .5 2 2s-1 2-2.5 2" />
  </svg>
);

export default EsgConsultingIcon;
