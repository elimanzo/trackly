'use client'

import { Tooltip as TooltipPrimitive } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Instant-on-subsequent context
// Tracks whether any tooltip was recently open. When true, the next tooltip
// skips its entry animation (duration-0) matching Emil Kowalski's pattern:
// first hover has a delay + animation; subsequent hovers are instant.
// ---------------------------------------------------------------------------

type InstantCtx = {
  isInstant: boolean
  signal: (open: boolean) => void
}

const InstantContext = React.createContext<InstantCtx>({
  isInstant: false,
  signal: () => {},
})

function TooltipProvider({
  delayDuration = 400,
  skipDelayDuration = 500,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  const [isInstant, setIsInstant] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  const signal = React.useCallback(
    (open: boolean) => {
      if (open) {
        clearTimeout(timer.current)
        setIsInstant(true)
      } else {
        timer.current = setTimeout(() => setIsInstant(false), skipDelayDuration)
      }
    },
    [skipDelayDuration]
  )

  return (
    <InstantContext.Provider value={{ isInstant, signal }}>
      <TooltipPrimitive.Provider
        data-slot="tooltip-provider"
        delayDuration={delayDuration}
        skipDelayDuration={skipDelayDuration}
        {...props}
      />
    </InstantContext.Provider>
  )
}

function Tooltip({ onOpenChange, ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const { signal } = React.useContext(InstantContext)

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      signal(open)
      onOpenChange?.(open)
    },
    [signal, onOpenChange]
  )

  return <TooltipPrimitive.Root data-slot="tooltip" onOpenChange={handleOpenChange} {...props} />
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  const { isInstant } = React.useContext(InstantContext)

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'animate-in bg-foreground text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance',
          isInstant && 'duration-0',
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
