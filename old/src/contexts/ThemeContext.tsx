"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

type Theme = "light" | "dark" | "system"
type PrimaryColor = "violet" | "blue" | "green" | "orange" | "rose" | "cyan" | "indigo" | "teal" | "amber" | "pink" | "sky" | "slate" | "emerald" | "lavender"

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
    primaryColor: PrimaryColor
    setPrimaryColor: (color: PrimaryColor) => void
    primaryIntensity: number
    setPrimaryIntensity: (value: number) => void
    compactMode: boolean
    setCompactMode: (compact: boolean) => void
    showAnimations: boolean
    setShowAnimations: (show: boolean) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const primaryColors: Record<PrimaryColor, { light: string; dark: string }> = {
    violet: { light: "oklch(0.55 0.2 260)", dark: "oklch(0.65 0.2 260)" },
    blue: { light: "oklch(0.55 0.2 240)", dark: "oklch(0.65 0.2 240)" },
    green: { light: "oklch(0.55 0.2 150)", dark: "oklch(0.65 0.2 150)" },
    orange: { light: "oklch(0.55 0.2 50)", dark: "oklch(0.65 0.2 50)" },
    rose: { light: "oklch(0.55 0.2 10)", dark: "oklch(0.65 0.2 10)" },
    cyan: { light: "oklch(0.55 0.2 200)", dark: "oklch(0.65 0.2 200)" },
    indigo: { light: "oklch(0.55 0.2 270)", dark: "oklch(0.65 0.2 270)" },
    teal: { light: "oklch(0.55 0.2 175)", dark: "oklch(0.65 0.2 175)" },
    amber: { light: "oklch(0.55 0.2 80)", dark: "oklch(0.65 0.2 80)" },
    pink: { light: "oklch(0.55 0.2 350)", dark: "oklch(0.65 0.2 350)" },
    sky: { light: "oklch(0.65 0.15 230)", dark: "oklch(0.70 0.15 230)" },
    slate: { light: "oklch(0.55 0.05 250)", dark: "oklch(0.65 0.05 250)" },
    emerald: { light: "oklch(0.60 0.15 160)", dark: "oklch(0.70 0.15 160)" },
    lavender: { light: "oklch(0.65 0.12 280)", dark: "oklch(0.72 0.12 280)" },
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const adjustOklch = (color: string, intensity: number) => {
    // Preserve hue and keep saturation even on low intensity to avoid dull gray
    const match = color.match(/oklch\(([^)]+)\)/)
    if (!match) return color
    const [lightnessStr, chromaStr, hueStr] = match[1].split(/\s+/)
    const lightness = parseFloat(lightnessStr)
    const chroma = parseFloat(chromaStr)
    const hue = hueStr

    // Map 60-140 -> chroma factor 0.8 - 1.6 (never drop too low)
    const chromaFactor = clamp(0.8 + (intensity - 100) / 100, 0.8, 1.6)

    // Lighten slightly when intensity is low, darken slightly when high
    const lightnessAdjust = (100 - intensity) / 400 // +0.1 at min, -0.1 at max
    const newLightness = clamp(lightness + lightnessAdjust, 0, 1)
    const newChroma = clamp(chroma * chromaFactor, 0, 0.55)

    return `oklch(${newLightness.toFixed(3)} ${newChroma.toFixed(3)} ${hue})`
}

export function ThemeProvider({ children }: { children: ReactNode }) {



    const [theme, setThemeState] = useState<Theme>("light")
    const [primaryColor, setPrimaryColorState] = useState<PrimaryColor>("sky")
    const [primaryIntensity, setPrimaryIntensityState] = useState<number>(100)
    const [compactMode, setCompactModeState] = useState(false)
    const [showAnimations, setShowAnimationsState] = useState(true)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        // eslint-disable-next-line
        setMounted(true)
        // Load from localStorage
        const savedTheme = localStorage.getItem("theme") as Theme
        const savedColor = localStorage.getItem("primaryColor") as PrimaryColor
        const savedIntensity = localStorage.getItem("primaryIntensity")
        const savedCompact = localStorage.getItem("compactMode")
        const savedAnimations = localStorage.getItem("showAnimations")

        if (savedTheme) setThemeState(savedTheme)
        if (savedColor) setPrimaryColorState(savedColor)
        if (savedIntensity) setPrimaryIntensityState(Number(savedIntensity))
        if (savedCompact) setCompactModeState(savedCompact === "true")
        if (savedAnimations !== null) setShowAnimationsState(savedAnimations !== "false")
    }, [])

    useEffect(() => {
        if (!mounted) return

        // Apply theme
        const root = document.documentElement

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
            root.classList.toggle("dark", systemTheme === "dark")
        } else {
            root.classList.toggle("dark", theme === "dark")
        }

        // Apply primary color
        const colorValue = primaryColors[primaryColor]
        const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
        const adjustedColor = adjustOklch(isDark ? colorValue.dark : colorValue.light, primaryIntensity)
        root.style.setProperty("--primary", adjustedColor)

        // Apply compact mode
        if (compactMode) {
            root.classList.add("compact")
        } else {
            root.classList.remove("compact")
        }

        // Apply animations
        if (!showAnimations) {
            root.classList.add("no-animations")
        } else {
            root.classList.remove("no-animations")
        }
    }, [theme, primaryColor, primaryIntensity, compactMode, showAnimations, mounted])

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme)
        localStorage.setItem("theme", newTheme)
    }

    const setPrimaryColor = (newColor: PrimaryColor) => {
        setPrimaryColorState(newColor)
        localStorage.setItem("primaryColor", newColor)
    }

    const setPrimaryIntensity = (value: number) => {
        const clamped = clamp(value, 40, 140)
        setPrimaryIntensityState(clamped)
        localStorage.setItem("primaryIntensity", String(clamped))
    }

    const setCompactMode = (compact: boolean) => {
        setCompactModeState(compact)
        localStorage.setItem("compactMode", String(compact))
    }

    const setShowAnimations = (show: boolean) => {
        setShowAnimationsState(show)
        localStorage.setItem("showAnimations", String(show))
    }

    if (!mounted) {
        return null
    }

    return (
        <ThemeContext.Provider value={{
            theme,
            setTheme,
            primaryColor,
            setPrimaryColor,
            primaryIntensity,
            setPrimaryIntensity,
            compactMode,
            setCompactMode,
            showAnimations,
            setShowAnimations,
        }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider")
    }
    return context
}
