// src/components/ui/toggle.tsx
"use client"

import { useState, useEffect } from "react"

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  icon?: React.ReactNode
  color?: "blue" | "purple" | "green" | "pink"
  size?: "sm" | "md" | "lg"
  disabled?: boolean
}

export default function Toggle({
  checked,
  onChange,
  label,
  description,
  icon,
  color = "blue",
  size = "md",
  disabled = false,
}: ToggleProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Size variants
  const sizeClasses = {
    sm: {
      toggle: "w-10 h-6",
      thumb: "w-4 h-4",
      translate: checked ? "translate-x-4" : "translate-x-1",
    },
    md: {
      toggle: "w-12 h-7",
      thumb: "w-5 h-5",
      translate: checked ? "translate-x-5" : "translate-x-1",
    },
    lg: {
      toggle: "w-14 h-8",
      thumb: "w-6 h-6",
      translate: checked ? "translate-x-6" : "translate-x-1",
    },
  }

  // Color variants
  const colorClasses = {
    blue: {
      bg: checked ? "bg-blue-500" : "bg-white/20",
      thumb: "bg-white",
      focus: "focus:ring-blue-500/50",
      glow: checked ? "shadow-blue-500/25" : "",
    },
    purple: {
      bg: checked ? "bg-purple-500" : "bg-white/20",
      thumb: "bg-white",
      focus: "focus:ring-purple-500/50",
      glow: checked ? "shadow-purple-500/25" : "",
    },
    green: {
      bg: checked ? "bg-green-500" : "bg-white/20",
      thumb: "bg-white",
      focus: "focus:ring-green-500/50",
      glow: checked ? "shadow-green-500/25" : "",
    },
    pink: {
      bg: checked ? "bg-pink-500" : "bg-white/20",
      thumb: "bg-white",
      focus: "focus:ring-pink-500/50",
      glow: checked ? "shadow-pink-500/25" : "",
    },
  }

  const sizeClass = sizeClasses[size]
  const colorClass = colorClasses[color]

  if (!isMounted) {
    return (
      <div className="flex items-center space-x-3 animate-pulse">
        <div className={`${sizeClass.toggle} bg-white/20 rounded-full`}></div>
        <div className="h-4 bg-white/20 rounded w-24"></div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between space-x-4 group">
      <div className="flex items-center space-x-3">
        {icon && (
          <div className="text-white/80 group-hover:text-white transition-colors">
            {icon}
          </div>
        )}
        <div className="flex flex-col">
          <label className="text-white/90 font-medium cursor-pointer group-hover:text-white transition-colors">
            {label}
          </label>
          {description && (
            <span className="text-white/60 text-xs group-hover:text-white/70 transition-colors">
              {description}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex items-center
          ${sizeClass.toggle}
          ${colorClass.bg}
          ${colorClass.focus}
          ${colorClass.glow}
          rounded-full border-2 border-transparent
          transition-all duration-300 ease-in-out
          focus:outline-none focus:ring-4
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:scale-105 active:scale-95
          shadow-lg
          ${checked ? 'shadow-lg' : 'shadow-md'}
        `}
      >
        <span className="sr-only">{label}</span>
        <span
          className={`
            ${sizeClass.thumb}
            ${colorClass.thumb}
            ${sizeClass.translate}
            inline-block rounded-full
            transition-transform duration-300 ease-in-out
            shadow-lg
            ${checked ? 'scale-110' : 'scale-100'}
          `}
        />
      </button>
    </div>
  )
}
