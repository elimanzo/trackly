'use client'

import { motion } from 'framer-motion'

const easeOut: [number, number, number, number] = [0.23, 1, 0.32, 1]

interface FadeInProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, transform: 'translateY(8px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={{ duration: 0.25, delay, ease: easeOut }}
    >
      {children}
    </motion.div>
  )
}
