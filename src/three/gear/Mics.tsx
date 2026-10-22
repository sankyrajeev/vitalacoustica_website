import type { ThreeElements } from '@react-three/fiber'
import type { ReactNode } from 'react'
import { MeshStandardMaterial } from 'three'

// Microphones on tripod boom stands, at the deck's downstage corners: the Shure SM58 (vocal, ball
// grille) at stage left, the SM57 (instrument, slim flat grille) at stage right. Each boom reaches
// in over the deck towards where a performer would stand. Sizes follow Shure's published dimensions.

const stand = new MeshStandardMaterial({ color: '#161616', metalness: 0.55, roughness: 0.45 })
const body = new MeshStandardMaterial({ color: '#2b2c2f', metalness: 0.5, roughness: 0.5 })
const grille = new MeshStandardMaterial({ color: '#c6c8cb', metalness: 0.85, roughness: 0.38 })
const darkGrille = new MeshStandardMaterial({ color: '#1b1b1c', metalness: 0.6, roughness: 0.55 })

const POLE = 1.05 // floor to the boom's clutch
const LEG_TOP = 0.3
const LEG_SPREAD = 0.3
const BOOM = 0.62 // clutch to clip
const COUNTER = 0.18 // clutch to the counterweight end
const PITCH = 0.25 // the boom's rise, in radians
const MIC_TILT = -0.45 // the mic angled down from the boom towards the singer

function TripodBoom({ children }: { children: ReactNode }) {
  const leg = Math.hypot(LEG_SPREAD, LEG_TOP)
  const tilt = Math.atan2(LEG_SPREAD, LEG_TOP)
  return (
    <group>
      {/* legs, collar and pole */}
      {[0, 1, 2].map((i) => (
        <group key={i} rotation-y={(i * Math.PI * 2) / 3 + Math.PI / 6}>
          <mesh material={stand} position={[LEG_SPREAD / 2, LEG_TOP / 2, 0]} rotation-z={tilt}>
            <cylinderGeometry args={[0.009, 0.009, leg, 8]} />
          </mesh>
        </group>
      ))}
      <mesh material={stand} position={[0, LEG_TOP, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.05, 12]} />
      </mesh>
      <mesh material={stand} position={[0, POLE / 2, 0]}>
        <cylinderGeometry args={[0.011, 0.013, POLE, 10]} />
      </mesh>
      {/* the clutch, then the boom rising towards the performer */}
      <mesh material={stand} position={[0, POLE, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.024, 0.024, 0.045, 14]} />
      </mesh>
      <group position={[0, POLE, 0]} rotation-z={PITCH}>
        <mesh material={stand} position={[(BOOM - COUNTER) / 2, 0, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.008, 0.008, BOOM + COUNTER, 8]} />
        </mesh>
        <mesh material={stand} position={[-COUNTER, 0, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.018, 0.018, 0.05, 12]} />
        </mesh>
        {/* the clip, with the mic angled down from it */}
        <group position={[BOOM, 0, 0]} rotation-z={MIC_TILT - PITCH}>
          <mesh material={stand} position={[0.01, 0, 0]}>
            <boxGeometry args={[0.03, 0.025, 0.03]} />
          </mesh>
          {children}
        </group>
      </group>
    </group>
  )
}

/** Shure SM58: tapered handle, ball grille. Laid along +X, connector end first. */
function SM58() {
  return (
    <group position={[-0.07, 0, 0]}>
      <mesh material={body} position={[0.07, 0, 0]} rotation-z={-Math.PI / 2}>
        <cylinderGeometry args={[0.0255, 0.0175, 0.13, 18]} />
      </mesh>
      <mesh material={grille} position={[0.137, 0, 0]} rotation-z={-Math.PI / 2}>
        <cylinderGeometry args={[0.027, 0.0255, 0.006, 18]} />
      </mesh>
      <mesh material={grille} position={[0.163, 0, 0]}>
        <sphereGeometry args={[0.0255, 20, 14]} />
      </mesh>
    </group>
  )
}

/** Shure SM57: slim tapered handle, short flat-topped grille. Laid along +X, connector end first. */
function SM57() {
  return (
    <group position={[-0.07, 0, 0]}>
      <mesh material={body} position={[0.075, 0, 0]} rotation-z={-Math.PI / 2}>
        <cylinderGeometry args={[0.0165, 0.0145, 0.14, 16]} />
      </mesh>
      <mesh material={darkGrille} position={[0.163, 0, 0]} rotation-z={-Math.PI / 2}>
        <cylinderGeometry args={[0.0165, 0.017, 0.036, 16]} />
      </mesh>
      <mesh material={grille} position={[0.182, 0, 0]} rotation-z={-Math.PI / 2}>
        <cylinderGeometry args={[0.0145, 0.016, 0.003, 16]} />
      </mesh>
    </group>
  )
}

export function MicStand({ kind, ...props }: ThreeElements['group'] & { kind: 'sm58' | 'sm57' }) {
  return (
    <group {...props}>
      <TripodBoom>{kind === 'sm58' ? <SM58 /> : <SM57 />}</TripodBoom>
    </group>
  )
}
