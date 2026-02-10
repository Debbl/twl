import { createMacro } from 'babel-plugin-macros'
import { clsMacro } from './macro/cls'
import { twMacro } from './macro/tw'

export const cls = createMacro(clsMacro)
export const tw = createMacro(twMacro)
export default cls
