'use client'

import { cn } from 'twl/macro'

const state = { 'p-2': true }

// The injected `clsx` import has to land after the directive, not before it.
export const result = cn`flex ${state}`
