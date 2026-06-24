import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { motion } from 'framer-motion'
import * as THREE from 'three'

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking'

// ── GLSL Vertex Shader ─────────────────────────────────────────────────
const VERT = /* glsl */`
uniform float uTime;
uniform float uDistort;
varying vec3 vNormal;
varying vec3 vViewDir;
varying float vNoise;

float h(float n) { return fract(sin(n) * 43758.5453); }
float noise(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n = i.x + i.y * 57.0 + i.z * 113.0;
  return mix(
    mix(mix(h(n), h(n+1.0), f.x), mix(h(n+57.0), h(n+58.0), f.x), f.y),
    mix(mix(h(n+113.0), h(n+114.0), f.x), mix(h(n+170.0), h(n+171.0), f.x), f.y),
    f.z
  );
}

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec3 p = position * 1.7 + uTime * 0.13;
  float n = noise(p) * 0.50
          + noise(p * 2.4) * 0.25
          + noise(p * 5.2) * 0.12;
  vNoise = n;
  vec3 disp = position + normal * n * uDistort;
  vec4 mv = modelViewMatrix * vec4(disp, 1.0);
  vViewDir = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`

// ── GLSL Fragment Shader ───────────────────────────────────────────────
const FRAG = /* glsl */`
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uGlow;
uniform float uOpacity;
varying vec3 vNormal;
varying vec3 vViewDir;
varying float vNoise;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);
  float fr = pow(1.0 - max(dot(N, V), 0.0), 1.5);
  vec3 col = mix(uColorA, uColorB, fr * uGlow);
  col += uColorB * smoothstep(0.70, 1.0, vNoise) * 0.35;
  float a = uOpacity * (0.05 + fr * 0.95);
  gl_FragColor = vec4(col, a);
}
`

// ── Per-state targets ──────────────────────────────────────────────────
const STATES: Record<VoiceState, { distort: number; glow: number; opacity: number; rot: number }> = {
  idle:      { distort: 0.040, glow: 0.80, opacity: 0.70, rot: 0.0011 },
  listening: { distort: 0.088, glow: 1.20, opacity: 0.88, rot: 0.0028 },
  thinking:  { distort: 0.155, glow: 0.95, opacity: 0.82, rot: 0.0060 },
  speaking:  { distort: 0.230, glow: 1.55, opacity: 1.00, rot: 0.0088 },
}

// ── Main orb mesh with custom shader ──────────────────────────────────
function OrbMesh({ state }: { state: VoiceState }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const matRef  = useRef<THREE.ShaderMaterial>(null!)

  const uniforms = useMemo(() => ({
    uTime:    { value: 0 },
    uDistort: { value: 0.04 },
    uColorA:  { value: new THREE.Color('#080402') },
    uColorB:  { value: new THREE.Color('#FF6D29') },
    uGlow:    { value: 0.8 },
    uOpacity: { value: 0.7 },
  }), [])

  useFrame(({ clock }) => {
    const t   = clock.getElapsedTime()
    const cfg = STATES[state]
    const mat = matRef.current
    if (!mat) return

    mat.uniforms.uTime.value = t

    const L = (a: number, b: number) => THREE.MathUtils.lerp(a, b, 0.055)

    mat.uniforms.uDistort.value = L(mat.uniforms.uDistort.value, cfg.distort)
    mat.uniforms.uGlow.value    = L(mat.uniforms.uGlow.value,    cfg.glow)
    mat.uniforms.uOpacity.value = L(mat.uniforms.uOpacity.value, cfg.opacity)

    // State-specific organic scale animations
    const breathe = state === 'idle'      ? Math.sin(t * 0.88) * 0.016 : 0
    const pulse   = state === 'listening' ? Math.sin(t * 2.75) * 0.013 : 0
    const vibrate = state === 'speaking'  ? Math.sin(t * 8.6) * 0.011 + Math.sin(t * 13.2) * 0.005 : 0
    const wobble  = state === 'thinking'  ? Math.sin(t * 1.25) * 0.008 : 0

    const targetS = 1.0 + breathe + pulse + vibrate + wobble
    meshRef.current.scale.setScalar(L(meshRef.current.scale.x, targetS))
    meshRef.current.rotation.y += cfg.rot
    meshRef.current.rotation.x += cfg.rot * 0.34
  })

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 6]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ── Additive outer atmospheric shell ──────────────────────────────────
function OrbShell({ state }: { state: VoiceState }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null!)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!matRef.current) return
    const target = {
      idle:      0.022 + Math.sin(t * 0.88) * 0.006,
      listening: 0.085 + Math.sin(t * 2.75) * 0.026,
      thinking:  0.058 + Math.sin(t * 1.25) * 0.016,
      speaking:  0.145 + Math.abs(Math.sin(t * 7.8)) * 0.065,
    }[state]
    matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, target, 0.06)
  })
  return (
    <mesh scale={1.30}>
      <sphereGeometry args={[1, 24, 24]} />
      <meshBasicMaterial
        ref={matRef}
        color="#FF6D29"
        transparent
        opacity={0.022}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
      />
    </mesh>
  )
}

// ── Inner warm core glow ───────────────────────────────────────────────
function OrbCore({ state }: { state: VoiceState }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null!)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!matRef.current) return
    const target = {
      idle:      0.052 + Math.sin(t * 0.88) * 0.011,
      listening: 0.125 + Math.sin(t * 2.75) * 0.036,
      thinking:  0.090 + Math.sin(t * 1.4)  * 0.022,
      speaking:  0.195 + Math.abs(Math.sin(t * 6.8)) * 0.085,
    }[state]
    matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, target, 0.07)
  })
  return (
    <mesh scale={0.50}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial
        ref={matRef}
        color="#FF8040"
        transparent
        opacity={0.052}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

// ── CSS glow per state ─────────────────────────────────────────────────
const SHADOWS: Record<VoiceState, string> = {
  idle:      'drop-shadow(0 0 28px rgba(255,109,41,0.08))',
  listening: 'drop-shadow(0 0 56px rgba(255,109,41,0.26))',
  thinking:  'drop-shadow(0 0 44px rgba(255,109,41,0.15))',
  speaking:  'drop-shadow(0 0 80px rgba(255,109,41,0.45))',
}

// ── Main export ────────────────────────────────────────────────────────
export default function JarvisOrb({ state, size = 380 }: { state: VoiceState; size?: number }) {
  return (
    <motion.div
      style={{ width: size, height: size, flexShrink: 0 }}
      animate={{ filter: SHADOWS[state] }}
      transition={{ duration: 1.2, ease: 'easeInOut' }}
    >
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 52 }}
        gl={{ alpha: true, antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <OrbCore state={state} />
        <OrbMesh state={state} />
        <OrbShell state={state} />
      </Canvas>
    </motion.div>
  )
}
