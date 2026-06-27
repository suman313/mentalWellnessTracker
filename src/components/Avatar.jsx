// Mira — an animated SVG companion that feels alive.
//
// Pure SVG + CSS (no libraries). It gently floats and blinks at rest, shows a
// thought bubble while "thinking", animates its mouth while "talking", and
// shifts its expression to mirror the student's mood — so it feels like a
// friend who's actually present and notices how you feel.

// Map the student's 1–10 mood to a facial expression.
function expressionFor(mood) {
  if (typeof mood !== 'number') return 'warm'
  if (mood <= 3) return 'caring' // soft, concerned, supportive
  if (mood <= 6) return 'warm' // gentle smile
  return 'happy' // bright smile
}

// Mouth path per expression (centered around x=100).
const MOUTHS = {
  caring: 'M78 130 Q100 140 122 130', // small, gentle, supportive
  warm: 'M76 128 Q100 146 124 128', // soft smile
  happy: 'M70 126 Q100 162 130 126', // big smile
}

// Eyebrow paths per expression.
const BROWS = {
  caring: { left: 'M68 74 Q80 70 90 74', right: 'M110 74 Q120 70 132 74' }, // raised inner (concern)
  warm: { left: 'M70 72 Q80 70 90 72', right: 'M110 72 Q120 70 130 72' },
  happy: { left: 'M70 70 Q80 66 90 70', right: 'M110 70 Q120 66 130 70' },
}

export default function Avatar({ state = 'idle', mood }) {
  const expr = expressionFor(mood)
  const talking = state === 'talking'
  const thinking = state === 'thinking'

  return (
    <div className="avatar-wrap">
      {thinking && (
        <div className="avatar-thought" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}

      <svg
        className="avatar-svg"
        viewBox="0 0 200 200"
        role="img"
        aria-label="Mira, your wellness companion"
      >
        <defs>
          <radialGradient id="miraFace" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#1de9b6" />
            <stop offset="100%" stopColor="#00b248" />
          </radialGradient>
          <radialGradient id="miraGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00c853" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#00c853" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft glow halo */}
        <circle cx="100" cy="100" r="92" fill="url(#miraGlow)" />

        <g className="avatar-body">
          {/* Head */}
          <circle cx="100" cy="100" r="70" fill="url(#miraFace)" />

          {/* Cheeks */}
          <circle cx="64" cy="118" r="11" fill="#ff8a80" opacity="0.55" />
          <circle cx="136" cy="118" r="11" fill="#ff8a80" opacity="0.55" />

          {/* Eyebrows */}
          <path
            d={BROWS[expr].left}
            stroke="#04210f"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={BROWS[expr].right}
            stroke="#04210f"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />

          {/* Eyes (blink) */}
          <g className="avatar-eyes">
            <circle cx="80" cy="92" r="9" fill="#04210f" />
            <circle cx="120" cy="92" r="9" fill="#04210f" />
            {/* highlights */}
            <circle cx="83" cy="89" r="3" fill="#ffffff" />
            <circle cx="123" cy="89" r="3" fill="#ffffff" />
          </g>

          {/* Mouth */}
          {talking ? (
            <g className="avatar-mouth-talk">
              <ellipse cx="100" cy="132" rx="15" ry="11" fill="#04210f" />
            </g>
          ) : (
            <path
              d={MOUTHS[expr]}
              stroke="#04210f"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </g>
      </svg>

      <div className="avatar-name">Mira</div>
    </div>
  )
}
