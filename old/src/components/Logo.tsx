"use client"

import { Zap } from "lucide-react"

interface LogoProps {
    size?: "sm" | "md" | "lg" | "xl"
    showText?: boolean
    className?: string
    variant?: "full" | "icon"
}

// Fixed blue color for logo background (matching landing page)
const LOGO_BLUE = "#3b82f6"
// Text color (dark gray/black)
const LOGO_TEXT = "#111827"

// Lightning Bolt Logo Design
function LogoIcon({ size }: { size: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
        >
            {/* Background rounded square */}
            <rect
                x="2"
                y="2"
                width="44"
                height="44"
                rx="12"
                fill={LOGO_BLUE}
            />

            {/* Lightning Bolt Icon (Filled White) */}
            {/* Scaled down ~85% */}
            <path
                d="M25 9L8 28H22L21 39L38 19H24L25 9Z"
                fill="white"
                stroke="white"
                strokeWidth="2"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export default function Logo({ size = "md", showText = true, className = "", variant = "full" }: LogoProps) {
    const sizeMap = {
        sm: { icon: 24, text: "text-lg", gap: "gap-1.5" },
        md: { icon: 32, text: "text-xl", gap: "gap-2" },
        lg: { icon: 40, text: "text-2xl", gap: "gap-2.5" },
        xl: { icon: 48, text: "text-3xl", gap: "gap-3" },
    }

    const { icon: iconSize, text: textSize, gap } = sizeMap[size]

    if (variant === "icon") {
        return <LogoIcon size={iconSize} />
    }

    return (
        <div className={`flex items-center ${gap} ${className}`}>
            <LogoIcon size={iconSize} />
            {showText && (
                <span
                    className={`font-semibold ${textSize} tracking-tight`}
                    style={{
                        color: LOGO_TEXT,
                        fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                        letterSpacing: "-0.02em"
                    }}
                >
                    ADSER
                </span>
            )}
        </div>
    )
}

// Static version without theme context
export function LogoStatic({
    size = "md",
    showText = true,
    className = ""
}: LogoProps) {
    const sizeMap = {
        sm: { icon: 24, text: "text-lg", gap: "gap-1.5" },
        md: { icon: 32, text: "text-xl", gap: "gap-2" },
        lg: { icon: 40, text: "text-2xl", gap: "gap-2.5" },
        xl: { icon: 48, text: "text-3xl", gap: "gap-3" },
    }

    const { icon: iconSize, text: textSize, gap } = sizeMap[size]

    return (
        <div className={`flex items-center ${gap} ${className}`}>
            <LogoIcon size={iconSize} />
            {showText && (
                <span
                    className={`font-semibold ${textSize} tracking-tight`}
                    style={{
                        color: LOGO_TEXT,
                        fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                        letterSpacing: "-0.02em"
                    }}
                >
                    ADSER
                </span>
            )}
        </div>
    )
}
