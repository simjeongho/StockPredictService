"use client";

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit";
}

const sizeClasses = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export default function GradientButton({
  children,
  onClick,
  disabled,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
}: GradientButtonProps) {
  if (variant === "outline") {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`
          relative inline-flex items-center justify-center font-semibold rounded-xl
          border border-purple-500/50 text-transparent bg-clip-text
          bg-gradient-to-r from-purple-400 to-blue-400
          hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/20
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-300
          ${sizeClasses[size]} ${className}
        `}
      >
        <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          {children}
        </span>
      </button>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center font-semibold rounded-xl
        bg-gradient-to-r from-purple-600 to-blue-500
        hover:from-purple-500 hover:to-blue-400
        text-white shadow-lg shadow-purple-500/25
        hover:shadow-purple-500/40 hover:scale-[1.02]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        transition-all duration-300
        ${sizeClasses[size]} ${className}
      `}
    >
      {children}
    </button>
  );
}
