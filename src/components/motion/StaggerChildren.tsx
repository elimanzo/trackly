'use client'

import { motion } from 'framer-motion'

const easeOut: [number, number, number, number] = [0.23, 1, 0.32, 1]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, transform: 'translateY(10px)' },
  show: {
    opacity: 1,
    transform: 'translateY(0px)',
    transition: { duration: 0.22, ease: easeOut },
  },
}

export function StaggerChildren({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div className={className} variants={container} initial="hidden" animate="show">
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  )
}
