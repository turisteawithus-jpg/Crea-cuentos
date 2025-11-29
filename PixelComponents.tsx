import React from 'react';

interface DoodleCardProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  onClick?: () => void;
  disabled?: boolean;
  rotate?: string; // e.g. 'rotate-1', '-rotate-2'
}

export const DoodleCard: React.FC<DoodleCardProps> = ({ children, className = '', color = 'bg-white', onClick, disabled, rotate = 'rotate-0' }) => {
  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={`
        relative border-[3px] border-black p-6 
        rounded-[20px_5px_20px_5px]
        shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] 
        transition-all duration-200 
        ${disabled ? 'opacity-60 cursor-not-allowed grayscale-[0.5]' : 'hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:rotate-0 cursor-pointer active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}
        ${color}
        ${rotate}
        ${className}
      `}
    >
      {/* Decorative "Tape" or Doodle marks */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-white/40 rotate-2 border border-gray-400/20"></div>
      
      {children}
    </div>
  );
};

interface DoodleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
}

export const DoodleButton: React.FC<DoodleButtonProps> = ({ children, className = '', variant = 'primary', ...props }) => {
  const colors = {
    primary: 'bg-cyan-400 hover:bg-cyan-300',
    secondary: 'bg-yellow-400 hover:bg-yellow-300',
    success: 'bg-lime-400 hover:bg-lime-300',
    danger: 'bg-red-400 hover:bg-red-300'
  };

  return (
    <button
      className={`
        px-6 py-2 border-[3px] border-black text-2xl font-bold uppercase tracking-wide
        rounded-xl
        shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
        active:shadow-none active:translate-y-1 active:translate-x-1
        transition-all
        font-amatic
        ${colors[variant]}
        ${className}
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      {...props}
    >
      {children}
    </button>
  );
};

// Doodles SVG
export const ScribbleBackground: React.FC<{className?: string, type?: 'spiral' | 'star' | 'zigzag'}> = ({className = '', type = 'spiral'}) => {
   let path = "";
   if (type === 'spiral') {
     path = "M10,10 C40,10 40,40 10,40 C-20,40 -20,10 10,10 M10,10 C50,10 50,50 10,50";
   } else if (type === 'star') {
     path = "M25,2 L32,18 L48,18 L36,28 L40,44 L25,34 L10,44 L14,28 L2,18 L18,18 Z";
   } else {
     path = "M0,25 L10,5 L20,45 L30,5 L40,45 L50,25";
   }

   return (
      <div className={`absolute pointer-events-none opacity-40 ${className}`}>
        <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
           <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d={path} />
        </svg>
      </div>
   );
};
