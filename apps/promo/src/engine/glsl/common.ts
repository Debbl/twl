import { LIN } from '../palette.ts'

const v3 = (c: readonly number[]) =>
  `vec3(${c.map((x) => x.toFixed(5)).join(',')})`

/** GLSL ES 3.0 shared by every FSPass: palette (linear), hashes, noise, colour. */
export const GLSL_COMMON = /* glsl */ `
#define PI 3.14159265359
#define TAU 6.28318530718
const vec3 C_INK = ${v3(LIN.ink)};
const vec3 C_INK2 = ${v3(LIN.ink2)};
const vec3 C_GRAPHITE = ${v3(LIN.graphite)};
const vec3 C_ASH = ${v3(LIN.ash)};
const vec3 C_BONE = ${v3(LIN.bone)};
const vec3 C_SIGNAL = ${v3(LIN.signal)};

float sat(float x) { return clamp(x, 0.0, 1.0); }
vec3 sat(vec3 x) { return clamp(x, 0.0, 1.0); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = rot2(0.6) * p * 2.03 + 11.7; a *= 0.5; } return s; }

vec3 toSRGB(vec3 c) { return mix(12.92 * c, 1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
`
