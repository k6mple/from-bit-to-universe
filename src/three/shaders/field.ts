/**
 * The master particle material.
 *
 * One draw call renders every structure in the piece. The eight shape
 * attributes are baked at boot; the vertex shader blends between two of them
 * with a per-particle stagger and an outward arc, so matter visibly *flies*
 * into a new formation instead of cross-fading. Everything else — dispersion,
 * orbital motion, pointer parallax, the network activation blast, the thought
 * wave — is layered on top as displacement and emission.
 *
 * Branching on `uFrom`/`uTo` is uniform-only, so it costs nothing. Attribute
 * count is held at 12 to stay comfortably inside the WebGL2 floor of 16.
 */

export const FIELD_VERT = /* glsl */ `
uniform float uTime;
uniform float uFrom;
uniform float uTo;
uniform float uT;
uniform float uScatter;
uniform float uDrift;
uniform float uOrbAmt;
uniform float uSize;
uniform float uPixel;
uniform float uRefDist;
uniform float uOpacity;
uniform float uPointerAmt;
uniform vec2  uPointer;
uniform vec3  uColA;
uniform vec3  uColB;
uniform vec3  uColC;
uniform float uThinkX;
uniform float uThinkPower;
uniform vec3  uNetPos;
uniform float uNetWave;
uniform vec3  uHoverPos;
uniform float uHoverAmt;

attribute vec3 aS1;
attribute vec3 aS2;
attribute vec3 aS3;
attribute vec3 aS4;
attribute vec3 aS5;
attribute vec3 aS6;
attribute vec3 aS7;
attribute vec4 aE0;   // emphases for shapes 0..3
attribute vec4 aE1;   // emphases for shapes 4..7
attribute vec4 aMeta; // seed, size, hue, orbit radius
attribute vec2 aOrb;  // orbit speed, orbit phase

varying vec3 vCol;
varying float vA;

vec3 pickP(float i) {
  if (i < 0.5) return position;
  if (i < 1.5) return aS1;
  if (i < 2.5) return aS2;
  if (i < 3.5) return aS3;
  if (i < 4.5) return aS4;
  if (i < 5.5) return aS5;
  if (i < 6.5) return aS6;
  return aS7;
}

float pickE(float i) {
  if (i < 0.5) return aE0.x;
  if (i < 1.5) return aE0.y;
  if (i < 2.5) return aE0.z;
  if (i < 3.5) return aE0.w;
  if (i < 4.5) return aE1.x;
  if (i < 5.5) return aE1.y;
  if (i < 6.5) return aE1.z;
  return aE1.w;
}

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

void main() {
  float aSeed = aMeta.x;
  float aSize = aMeta.y;
  float aHue  = aMeta.z;

  vec3 p0 = pickP(uFrom);
  vec3 p1 = pickP(uTo);
  float e0 = pickE(uFrom);
  float e1 = pickE(uTo);

  // Per-particle stagger: matter does not move in lockstep.
  float s = clamp((uT - aSeed * 0.34) / 0.66, 0.0, 1.0);
  float t = s * s * (3.0 - 2.0 * s);

  vec3 p = mix(p0, p1, t);
  float emph = mix(e0, e1, t);

  // Flight path bulges outward — the shape is thrown, then caught.
  vec3 pv = p1 - p0;
  float pl = length(pv);
  vec3 outward = normalize(p0 + vec3(0.0001, 0.0007, 0.0013));
  p += outward * sin(t * 3.14159265) * min(pl, 26.0) * 0.2 * (0.3 + aSeed * 0.9);

  // Dispersion (hero exit, finale dissolve)
  p += outward * uScatter * (1.2 + aSeed * 34.0);
  p += vec3(
        sin(uTime * 0.63 + aSeed * 37.0),
        sin(uTime * 0.51 + aSeed * 23.0),
        cos(uTime * 0.44 + aSeed * 51.0)
      ) * uScatter * 4.5;

  // Orbital motion — shimmer everywhere, real carriers inside the crystal.
  p += vec3(
        cos(uTime * aOrb.x + aOrb.y),
        sin(uTime * aOrb.x * 1.27 + aOrb.y * 1.7),
        cos(uTime * aOrb.x * 0.83 + aOrb.y * 2.3)
      ) * aMeta.w * uOrbAmt;

  // Idle breathing
  float d = uDrift * (0.35 + aSeed);
  p += vec3(
        sin(uTime * 0.31 + aSeed * 17.0),
        cos(uTime * 0.27 + aSeed * 29.0),
        sin(uTime * 0.23 + aSeed * 41.0)
      ) * d;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);

  // Pointer parallax: near matter swings more than far matter.
  // True perspective scaling against a per-chapter reference distance.
  // A near-flat falloff looks fine on a distant galaxy and destroys every
  // interior shot: with no size separation, 150k points pile into fog.
  float depthK = clamp(uRefDist / max(uRefDist * 0.55, -mv.z), 0.45, 1.85);
  mv.xy += uPointer * (0.5 + aSeed * 1.1) * min(depthK, 1.6) * uPointerAmt;
  gl_Position = projectionMatrix * mv;

  // --- emission -----------------------------------------------------
  float glow = 0.0;
  float wave = exp(-pow((p.x - uThinkX) * 0.4, 2.0));
  glow += wave * uThinkPower * 2.6;

  float nd = length(p - uNetPos);
  glow += exp(-pow(nd * 0.42, 2.0)) * uNetWave * 2.2;

  // Die inspection: the block under the pointer lifts out of the floorplan.
  float hd = length(p - uHoverPos);
  float hov = exp(-pow(hd * 0.5, 2.0)) * uHoverAmt;
  glow += hov * 1.5;

  float flick = 0.62 + 0.38 * hash11(aSeed * 91.7);
  float a = (0.13 + emph * 0.95) * flick + glow;
  a += uScatter * 0.35;

  // Floor the mix so the dimmest matter still carries some of the light
  // colour instead of vanishing into the background.
  vec3 c = mix(uColA, uColB, clamp(0.18 + aHue * 0.8 + glow * 0.4 + emph * 0.12, 0.0, 1.0));
  c = mix(c, uColC, clamp(pow(emph, 1.7) * 0.8 + glow * 0.45, 0.0, 1.0));

  vCol = c * (1.0 + emph * 1.25 + glow * 2.2);
  vA = a * uOpacity;

  float sz = aSize * (1.0 + emph * 0.7 + glow * 0.9);
  gl_PointSize = min(sz * uSize * uPixel * depthK, 26.0 * uPixel);
}
`

export const FIELD_FRAG = /* glsl */ `
varying vec3 vCol;
varying float vA;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float r2 = dot(uv, uv) * 4.0;
  if (r2 > 1.0) discard;
  float core = 1.0 - r2;
  // A hot centre inside a soft halo: reads as light, not as a sprite.
  float a = core * core * core * core;
  gl_FragColor = vec4(vCol, a * vA);
}
`

/* ------------------------------------------------------------------ *
 *  Traces / links — light that has somewhere to be
 * ------------------------------------------------------------------ */

export const LINE_VERT = /* glsl */ `
uniform vec3  uNodePos;
uniform float uNodeWave;

attribute float aT;
attribute float aSeed;

varying float vT;
varying float vSeed;
varying float vHot;

void main() {
  vT = aT;
  vSeed = aSeed;
  // How close this vertex is to the node the visitor just pressed.
  vHot = exp(-length(position - uNodePos) * 0.16) * uNodeWave;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const LINE_FRAG = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform float uSpeed;
uniform float uWidth;
uniform vec3  uColA;
uniform vec3  uColB;
uniform float uActivate;

varying float vT;
varying float vSeed;
varying float vHot;

void main() {
  // Every trace carries a comet with a tail, each at its own tempo.
  float speed = uSpeed * (0.55 + fract(vSeed * 7.31) * 0.9);
  float head = fract(uTime * speed + vSeed);
  float behind = fract(head - vT);
  float comet = exp(-behind * uWidth);

  float idle = 0.045 + 0.05 * sin(vT * 22.0 + uTime * 1.7 + vSeed * 30.0);
  float a = (idle + comet * 1.35) * uOpacity;
  a *= 1.0 + uActivate * 1.6 + vHot * 2.2;

  vec3 c = mix(uColA, uColB, clamp(comet * 1.4 + uActivate * 0.4 + vHot * 0.6, 0.0, 1.0));
  gl_FragColor = vec4(c * (1.0 + comet * 2.4 + uActivate * 1.4 + vHot * 1.8), a);
}
`

/* ------------------------------------------------------------------ *
 *  The opening bit — a single point of light and nothing else
 * ------------------------------------------------------------------ */

export const BIT_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const BIT_FRAG = /* glsl */ `
uniform float uOpacity;
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;

void main() {
  vec2 uv = vUv - 0.5;
  float d = length(uv) * 2.0;
  if (d > 1.0) discard;
  float halo = pow(1.0 - d, 3.2);
  float core = pow(1.0 - d, 16.0);
  float pulse = 0.86 + 0.14 * sin(uTime * 0.9);
  float a = (halo * 0.62 + core * 1.8) * uOpacity * pulse;
  gl_FragColor = vec4(uColor * (0.8 + core * 2.6), a);
}
`
