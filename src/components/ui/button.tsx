"use client"

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { buttonVariants } from "./button-variants"

/** Variants that get spring-physics hover/press (not ghost, link, or icon-only sizes). */
const SPRING_VARIANTS = new Set(["default", "outline", "secondary", "destructive"])
const SPRING_CONFIG = { type: "spring" as const, stiffness: 500, damping: 30 }

type ButtonProps = Omit<HTMLMotionProps<"button">, "ref"> &
  VariantProps<typeof buttonVariants> & {
    /** Pass-through render prop for Base UI composition (e.g. Dialog.Close render). */
    render?: React.ReactElement
  }

function Button({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: ButtonProps) {
  const reduced = useReducedMotion()
  const useSpring = SPRING_VARIANTS.has(variant ?? "default") && !reduced

  if (render) {
    return (
      <button
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      />
    )
  }

  return (
    <motion.button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      whileHover={useSpring ? { scale: 1.02 } : undefined}
      whileTap={useSpring ? { scale: 0.97 } : undefined}
      transition={useSpring ? SPRING_CONFIG : undefined}
      {...props}
    />
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
