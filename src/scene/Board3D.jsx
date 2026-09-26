/* The town, on a table, in 3D. The Manus board lies on a thick game board; each
   of the eleven places is a glowing pad you tap; every worker a player sends out
   is a little meeple that drops onto its pad with a bounce.

   On a portrait phone the whole board turns ninety degrees, so a landscape town
   fills a tall screen instead of shrinking to a strip. */
import React, { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Html, ContactShadows, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { ZONES } from '../data.js'
import { freeSlots } from '../engine.js'

export const BW = 12
export const BH = 8
export const PLAYER_COLOURS = ['#E8453C', '#2F7BE8', '#2EAD5B', '#F2B705']
const PAD_COLOURS = {
  skill: '#3E8EF7', grad: '#F2B705', search: '#2EAD5B', match: '#2EAD5B', compete: '#2EAD5B',
  employ: '#2EAD5B', exp: '#F28C28', prod: '#8E5CF7', risk: '#EF5DA8', career: '#1B2B4B', rest: '#8A94A6',
}
const base = import.meta.env.BASE_URL

export const zoneWorld = z => [(z.x / 100 - 0.5) * BW, 0, (z.y / 100 - 0.5) * BH]

function Table() {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.36, 0]}>
      <circleGeometry args={[40, 64]} />
      <meshStandardMaterial color="#F6E7C8" roughness={0.95} />
    </mesh>
  )
}

function BoardSlab({ src }) {
  const tex = useLoader(THREE.TextureLoader, src)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return (
    <group>
      <RoundedBox args={[BW + 0.5, 0.3, BH + 0.5]} radius={0.14} smoothness={4}
        position={[0, -0.16, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#1F3A68" roughness={0.6} />
      </RoundedBox>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <planeGeometry args={[BW, BH]} />
        <meshStandardMaterial map={tex} roughness={0.8} />
      </mesh>
    </group>
  )
}

function Pad({ zone, game, enabled, onPick, portraitTag }) {
  const ring = useRef()
  const [hover, setHover] = useState(false)
  const left = freeSlots(game, zone)
  const open = enabled && left > 0
  const col = PAD_COLOURS[zone.id]
  const [x, , z] = zoneWorld(zone)

  useFrame(({ clock }) => {
    if (!ring.current) return
    const t = clock.getElapsedTime()
    const s = open ? 1 + Math.sin(t * 3 + x) * 0.08 : 1
    ring.current.scale.set(s, 1, s)
    ring.current.material.opacity = open ? 0.55 + Math.sin(t * 3 + x) * 0.25 : 0.12
  })

  return (
    <group position={[x, 0, z]}>
      <mesh
        position={[0, 0.06, 0]} castShadow
        onClick={e => { e.stopPropagation(); if (open) onPick(zone) }}
        onPointerOver={e => { e.stopPropagation(); setHover(true); document.body.style.cursor = open ? 'pointer' : 'default' }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = 'default' }}
      >
        <cylinderGeometry args={[0.34, 0.38, 0.12, 40]} />
        <meshStandardMaterial color={open ? col : '#B9C0CC'} roughness={0.35} metalness={0.05}
          emissive={col} emissiveIntensity={open ? (hover ? 0.55 : 0.25) : 0} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.42, 0.52, 48]} />
        <meshBasicMaterial color={col} transparent opacity={0.5} />
      </mesh>
      <Html position={[0, 0.2, 0.5]} center distanceFactor={portraitTag ? 10 : 9} zIndexRange={[10, 0]}
        style={{ pointerEvents: 'none' }}>
        <div className={'pad-tag' + (open ? '' : ' off')} style={{ '--c': col }}>
          {zone.name}{zone.cap < 9 && <b>{left}</b>}
        </div>
      </Html>
    </group>
  )
}

function Meeple({ colour, target, delay = 0 }) {
  const g = useRef()
  const born = useRef(null)
  useFrame(({ clock }) => {
    if (!g.current) return
    const now = clock.getElapsedTime()
    if (born.current === null) born.current = now + delay
    const u = Math.min(1, Math.max(0, (now - born.current) / 0.55))
    // drop from the sky with a bounce, then a soft idle breathe
    const bounce = u < 1 ? (1 - u) * 2.6 + Math.abs(Math.sin(u * Math.PI * 2.2)) * (1 - u) * 0.6 : 0
    g.current.position.set(target[0], target[1] + bounce, target[2])
    const breathe = u >= 1 ? 1 + Math.sin(now * 2.4 + target[0]) * 0.03 : 1
    g.current.scale.set(1, breathe, 1)
  })
  return (
    <group ref={g} position={[target[0], 3, target[2]]}>
      <mesh castShadow position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 0.34, 20]} />
        <meshStandardMaterial color={colour} roughness={0.45} />
      </mesh>
      <mesh castShadow position={[0, 0.52, 0]}>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshStandardMaterial color={colour} roughness={0.4} />
      </mesh>
    </group>
  )
}

function Meeples({ game }) {
  const list = []
  for (const z of ZONES) {
    const ids = game.placements[z.id] || []
    const [x, , zz] = zoneWorld(z)
    ids.forEach((pid, k) => {
      const ang = (k / Math.max(ids.length, 1)) * Math.PI * 2 + 0.6
      const r = ids.length > 1 ? 0.24 : 0
      list.push(
        <Meeple key={`${z.id}-${k}-${pid}-${game.round}`} colour={PLAYER_COLOURS[pid]}
          target={[x + Math.cos(ang) * r, 0.12, zz + Math.sin(ang) * r]} delay={k * 0.08} />
      )
    })
  }
  return <>{list}</>
}

function Rig({ portrait }) {
  const { camera, size } = useThree()
  useFrame(({ clock }) => {
    // fit the board's footprint on screen, looking down at about 55 degrees
    const w = portrait ? BH : BW
    const d = portrait ? BW : BH
    const aspect = size.width / size.height
    const fov = 38
    const vFit = (d * (portrait ? 0.5 : 0.6)) / Math.tan((fov / 2) * Math.PI / 180)
    const hFit = (w * (portrait ? 0.5 : 0.56)) / (Math.tan((fov / 2) * Math.PI / 180) * aspect)
    const dist = Math.max(vFit, hFit)
    const t = clock.getElapsedTime()
    const sway = Math.sin(t * 0.25) * 0.35
    camera.fov = fov
    camera.position.set(sway, dist * (portrait ? 0.9 : 0.82), dist * (portrait ? 0.42 : 0.58))
    camera.lookAt(0, 0, portrait ? 0.2 : 0.35)
    camera.updateProjectionMatrix()
  })
  return null
}

export default function Board3D({ game, enabled, onPick, boardSrc }) {
  const [portrait, setPortrait] = useState(
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false)
  React.useEffect(() => {
    const on = () => setPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  const src = boardSrc || `${base}art/board.jpg`
  return (
    <div className="stage3d">
      <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}
        camera={{ fov: 38, position: [0, 12, 8] }}>
        <Rig portrait={portrait} />
        <hemisphereLight args={['#fffaf0', '#b7c9e8', 0.9]} />
        <directionalLight castShadow position={[5, 14, 6]} intensity={2.1} color="#fff4de"
          shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}>
          <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10, 1, 40]} />
        </directionalLight>
        <Suspense fallback={null}>
          <group rotation={[0, portrait ? Math.PI / 2 : 0, 0]}>
            <BoardSlab src={src} />
            {ZONES.map(z => <Pad key={z.id} zone={z} game={game} enabled={enabled} onPick={onPick} portraitTag={portrait} />)}
            <Meeples game={game} />
          </group>
          <Table />
          <ContactShadows position={[0, -0.33, 0]} opacity={0.35} scale={30} blur={2.4} far={4} />
        </Suspense>
      </Canvas>
    </div>
  )
}
