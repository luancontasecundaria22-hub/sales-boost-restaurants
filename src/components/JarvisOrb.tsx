import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking'

const STATE_CONFIG: Record<VoiceState, { speed: number; opacity: number; glow: number; wireOpacity: number }> = {
  idle:      { speed: 0.0025, opacity: 0.55, glow: 0.0,  wireOpacity: 0.04 },
  listening: { speed: 0.007,  opacity: 0.85, glow: 0.25, wireOpacity: 0.12 },
  thinking:  { speed: 0.012,  opacity: 0.65, glow: 0.12, wireOpacity: 0.07 },
  speaking:  { speed: 0.018,  opacity: 1.0,  glow: 0.45, wireOpacity: 0.18 },
}

interface Props {
  state: VoiceState
  size?: number
}

export default function JarvisOrb({ state, size = 380 }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef(state)

  // Keep stateRef current so the animation loop can read it
  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    if (!mountRef.current) return

    // ── Scene ──────────────────────────────────────────────────
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
    camera.position.z = 2.6

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(size, size)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    mountRef.current.appendChild(renderer.domElement)

    // ── Particles on sphere surface (Fibonacci distribution) ───
    const COUNT = 900
    const positions = new Float32Array(COUNT * 3)
    const golden = Math.PI * (1 + Math.sqrt(5))
    for (let i = 0; i < COUNT; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / COUNT)
      const theta = golden * i
      positions[i * 3]     = Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = Math.cos(phi)
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta)
    }
    const particleGeo = new THREE.BufferGeometry()
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particleMat = new THREE.PointsMaterial({
      color: 0xFF6D29,
      size: 0.022,
      transparent: true,
      opacity: STATE_CONFIG.idle.opacity,
      sizeAttenuation: true,
    })
    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

    // ── Wireframe skeleton sphere ──────────────────────────────
    const wireGeo = new THREE.SphereGeometry(1, 18, 14)
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xFF6D29,
      wireframe: true,
      transparent: true,
      opacity: STATE_CONFIG.idle.wireOpacity,
    })
    const wire = new THREE.Mesh(wireGeo, wireMat)
    scene.add(wire)

    // ── Glowing inner core ─────────────────────────────────────
    const coreGeo = new THREE.SphereGeometry(0.38, 32, 32)
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xFF6D29,
      transparent: true,
      opacity: 0.0,
    })
    const core = new THREE.Mesh(coreGeo, coreMat)
    scene.add(core)

    // ── Animation loop ─────────────────────────────────────────
    let animId: number
    let currentOpacity   = STATE_CONFIG.idle.opacity
    let currentWireOp    = STATE_CONFIG.idle.wireOpacity
    let currentGlow      = STATE_CONFIG.idle.glow

    const animate = () => {
      animId = requestAnimationFrame(animate)

      const cfg = STATE_CONFIG[stateRef.current]

      // Smooth lerp toward target values
      currentOpacity = THREE.MathUtils.lerp(currentOpacity, cfg.opacity, 0.04)
      currentWireOp  = THREE.MathUtils.lerp(currentWireOp,  cfg.wireOpacity, 0.04)
      currentGlow    = THREE.MathUtils.lerp(currentGlow,    cfg.glow, 0.04)

      particleMat.opacity = currentOpacity
      wireMat.opacity     = currentWireOp
      coreMat.opacity     = currentGlow

      // Slight axis tilt for a natural tumble
      particles.rotation.y += cfg.speed
      particles.rotation.x += cfg.speed * 0.38
      wire.rotation.y       = particles.rotation.y
      wire.rotation.x       = particles.rotation.x

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      renderer.dispose()
      particleGeo.dispose()
      particleMat.dispose()
      wireGeo.dispose()
      wireMat.dispose()
      coreGeo.dispose()
      coreMat.dispose()
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement)
      }
    }
  }, [size])

  return (
    <div
      ref={mountRef}
      style={{
        width: size,
        height: size,
        filter: state === 'speaking'
          ? 'drop-shadow(0 0 28px rgba(255,109,41,0.55))'
          : state === 'listening'
            ? 'drop-shadow(0 0 18px rgba(255,109,41,0.35))'
            : 'drop-shadow(0 0 8px rgba(255,109,41,0.12))',
        transition: 'filter 0.6s ease',
      }}
    />
  )
}
