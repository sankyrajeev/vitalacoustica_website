import { Float } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { ExtrudeGeometry, Group } from 'three'
import { VA_MARK_SIZE, vaMarkShapes } from '../brand/vaMark'
import { kickAt } from './beat'

// The VA monogram extruded into polished metal, floating centre stage.
export function VAMark3D({ width = 2.6, position = [0, 2.75, 1.6] as [number, number, number], timeScale = 1 }) {
  const group = useRef<Group>(null)
  const geometry = useMemo(() => {
    const g = new ExtrudeGeometry(vaMarkShapes(), {
      depth: 110,
      bevelEnabled: true,
      bevelThickness: 14,
      bevelSize: 7,
      bevelSegments: 3,
      curveSegments: 1,
    })
    g.center()
    return g
  }, [])
  const scale = width / VA_MARK_SIZE.width

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime * timeScale
    // subtle "breathing" with the kick
    const s = scale * (1 + 0.012 * kickAt(t, 7))
    group.current.scale.setScalar(s)
  })

  return (
    <Float speed={1.4} rotationIntensity={0.35} floatIntensity={0.4}>
      <group ref={group} position={position} scale={scale}>
        <mesh geometry={geometry} castShadow>
          <meshPhysicalMaterial
            color="#f4f4f4"
            metalness={1}
            roughness={0.16}
            clearcoat={1}
            clearcoatRoughness={0.1}
            envMapIntensity={1.4}
          />
        </mesh>
      </group>
    </Float>
  )
}
