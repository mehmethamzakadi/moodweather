// src/components/ui/card.tsx
"use client"

import { ReactNode } from "react"

interface CardProps {
  children: ReactNode
  className?: string
  variant?: "default" | "gradient" | "glass"
  padding?: "sm" | "md" | "lg"
  hover?: boolean
}

export default function Card({
  children,
  className = "",
  variant = "glass",
  padding = "md",
  hover = false,
}: CardProps) {
  const baseClasses = "rounded-2xl border transition-all duration-300"

  const variantClasses = {
    default: "bg-white shadow-lg border-gray-200",
    gradient: "bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-lg border-white/20 shadow-2xl",
    glass: "bg-white/10 backdrop-blur-sm border-white/20 shadow-xl",
  }

  const paddingClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  }

  const hoverClasses = hover
    ? "hover:scale-[1.02] hover:shadow-2xl hover:bg-white/15 cursor-pointer"
    : ""

  return (
    <div
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${hoverClasses}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
