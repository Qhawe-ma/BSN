import React from 'react';

export const GlassCard: React.FC<{ children: React.ReactNode; className?: string; hoverEffect?: boolean; onClick?: () => void }> = ({ children, className = "", hoverEffect = false, onClick }) => (
  <div 
    className={`relative bg-gray-900/40 backdrop-blur-xl border border-white/5 shadow-xl rounded-3xl overflow-hidden ${hoverEffect ? 'transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl hover:bg-gray-900/50' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg' }> = ({ 
  children, variant = 'primary', size = 'md', className = "", ...props 
}) => {
  const variants = {
    primary: "bg-gradient-to-r from-primary to-yellow-400 text-black font-bold hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
    secondary: "bg-white/5 text-white hover:bg-white/10 border border-white/10 backdrop-blur-sm",
    ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-white/5",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-base"
  };

  return (
    <button 
      className={`rounded-full transition-all duration-200 flex items-center justify-center gap-2 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    className={`w-full bg-black/20 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all ${props.className}`}
    {...props}
  />
);

export const Badge: React.FC<{ children: React.ReactNode; color?: string; variant?: 'solid' | 'outline' }> = ({ children, color = "bg-primary", variant = 'outline' }) => {
  const baseStyle = "text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide uppercase";
  const styles = variant === 'outline' 
    ? `${color} bg-opacity-10 text-primary border border-primary/20`
    : `bg-gradient-to-r from-primary to-yellow-400 text-black`;

  return (
    <span className={`${baseStyle} ${styles}`}>
      {children}
    </span>
  );
};

export const Avatar: React.FC<{ url: string; size?: 'sm' | 'md' | 'lg' | 'xl'; bordered?: boolean; address?: string }> = ({ url, size = 'md', bordered = true, address }) => {
  const [imgError, setImgError] = React.useState(false);
  const sizes = {
    sm: "w-8 h-8",
    md: "w-11 h-11",
    lg: "w-16 h-16",
    xl: "w-24 h-24"
  };
  
  const fallbackUrl = address 
    ? `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`
    : `https://api.dicebear.com/7.x/identicon/svg?seed=${Date.now()}`;
  
  return (
    <div className={`${sizes[size]} rounded-full overflow-hidden ${bordered ? 'ring-2 ring-white/10 ring-offset-2 ring-offset-black/50' : ''} bg-gray-800 flex-shrink-0 shadow-lg`}>
      <img 
        src={imgError ? fallbackUrl : (url || fallbackUrl)} 
        alt="" 
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    </div>
  );
};