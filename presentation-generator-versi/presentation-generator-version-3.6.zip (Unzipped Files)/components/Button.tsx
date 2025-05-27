
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  Icon?: React.ElementType;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  Icon,
  className = '',
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles = {
    primary: "bg-sky-600 hover:bg-sky-500 focus:ring-sky-500 text-white",
    secondary: "bg-slate-600 hover:bg-slate-500 focus:ring-slate-500 text-slate-100 border border-slate-500",
    danger: "bg-red-600 hover:bg-red-500 focus:ring-red-500 text-white",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      type="button"
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon className={`w-5 h-5 ${children ? (size === 'sm' ? 'mr-1.5' : 'mr-2') : ''} ${size === 'sm' ? 'w-4 h-4' : ''}`} />}
      {children}
    </button>
  );
};

export default Button;
