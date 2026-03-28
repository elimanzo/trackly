'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

const easeOut: [number, number, number, number] = [0.23, 1, 0.32, 1]

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: easeOut }}
    >
      {children}
    </motion.div>
  )
}
