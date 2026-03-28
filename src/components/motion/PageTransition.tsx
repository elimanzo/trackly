'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

const easeOut: [number, number, number, number] = [0.23, 1, 0.32, 1]

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, transform: 'translateY(6px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={{ duration: 0.18, ease: easeOut }}
    >
      {children}
    </motion.div>
  )
}
