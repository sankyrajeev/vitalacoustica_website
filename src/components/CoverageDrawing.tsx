// Plan view, to scale: a stereo pair of V10P tops either side of a 10 m stage,
// each toed in towards the centre line with its 110° nominal horizontal dispersion.
// 1 unit = 10 cm. Drawn as a technical sheet, so it uses the light editorial surface.

const SPREAD = 110 // degrees, V10P nominal horizontal
const TOE = 14 // toe-in towards centre, degrees
const REACH = 240 // 24 m drawn throw

function wedge(x: number, y: number, aim: number) {
  const half = SPREAD / 2
  const a1 = ((aim - half) * Math.PI) / 180
  const a2 = ((aim + half) * Math.PI) / 180
  const p = (a: number) => `${x + Math.sin(a) * REACH},${y + Math.cos(a) * REACH}`
  return `M${x},${y} L${p(a1)} A${REACH},${REACH} 0 0 0 ${p(a2)} Z`
}

export function CoverageDrawing() {
  const left = { x: 70, y: 40 }
  const right = { x: 190, y: 40 }
  return (
    <svg className="drawing" viewBox="-40 -10 340 300" role="img" aria-labelledby="cov-title cov-desc">
      <title id="cov-title">Coverage plan for a stereo pair of V10P loudspeakers</title>
      <desc id="cov-desc">
        Two loudspeakers 12 metres apart, each angled 14 degrees inwards, with 110 degree coverage wedges overlapping over the
        audience area.
      </desc>
      <defs>
        <clipPath id="room">
          <rect x="-20" y="0" width="300" height="280" />
        </clipPath>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" className="drawing__hatch" />
        </pattern>
      </defs>
      {/* room outline and 2 m grid */}
      <rect x="-20" y="0" width="300" height="280" className="drawing__room" />
      {Array.from({ length: 14 }, (_, i) => (
        <line key={`h${i}`} x1="-20" x2="280" y1={i * 20} y2={i * 20} className="drawing__grid" />
      ))}
      {Array.from({ length: 15 }, (_, i) => (
        <line key={`v${i}`} y1="0" y2="280" x1={-20 + i * 20} x2={-20 + i * 20} className="drawing__grid" />
      ))}
      <g clipPath="url(#room)">
        <path d={wedge(left.x, left.y, TOE)} className="drawing__wedge" />
        <path d={wedge(right.x, right.y, -TOE)} className="drawing__wedge" />
      </g>
      {/* stage */}
      <rect x="80" y="0" width="100" height="36" fill="url(#hatch)" className="drawing__stage" />
      <text x="130" y="22" className="drawing__text" textAnchor="middle">
        STAGE 10 m
      </text>
      {/* loudspeakers */}
      {[left, right].map((s, i) => (
        <g key={i} transform={`translate(${s.x} ${s.y}) rotate(${i ? TOE : -TOE})`}>
          <rect x="-3" y="-4.6" width="6" height="4.6" className="drawing__box" />
        </g>
      ))}
      <line x1="130" y1="40" x2="130" y2="280" className="drawing__axis" />
      <text x="134" y="270" className="drawing__text">
        CL
      </text>
      <text x={left.x - 46} y={left.y + 6} className="drawing__text">
        V10P · 110°
      </text>
      {/* dimension */}
      <line x1={left.x} x2={right.x} y1="56" y2="56" className="drawing__dim" />
      <text x="130" y="66" className="drawing__text" textAnchor="middle">
        12 m
      </text>
      <text x="-14" y="276" className="drawing__text">
        GRID 2 m
      </text>
    </svg>
  )
}
