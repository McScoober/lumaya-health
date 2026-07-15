// Recurring mascot (TRD 13.2.6) — "Luma", a soft moon character.
// Flat, friendly, non-clinical. Decorative → aria-hidden (13.3).

export default function Mascot({ size = 96, mood = 'happy' }) {
  const eyes =
    mood === 'sleepy' ? (
      <>
        <path d="M40 52 q6 5 12 0" stroke="#6B1E3C" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M62 52 q6 5 12 0" stroke="#6B1E3C" strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle cx="46" cy="54" r="4" fill="#6B1E3C" />
        <circle cx="70" cy="54" r="4" fill="#6B1E3C" />
      </>
    )
  const mouth =
    mood === 'sad' ? (
      <path d="M50 70 q8 -6 16 0" stroke="#6B1E3C" strokeWidth="3" fill="none" strokeLinecap="round" />
    ) : (
      <path d="M49 66 q9 8 18 0" stroke="#6B1E3C" strokeWidth="3" fill="none" strokeLinecap="round" />
    )

  return (
    <svg
      className="mascot"
      width={size}
      height={size}
      viewBox="0 0 116 116"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="lumaBody" cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#FDEFF4" />
          <stop offset="100%" stopColor="#F6CFDD" />
        </radialGradient>
      </defs>
      {/* soft glow */}
      <circle cx="58" cy="58" r="52" fill="var(--accent-soft)" opacity="0.55" />
      {/* crescent moon body */}
      <path
        d="M78 20 a44 44 0 1 0 18 62 a34 34 0 1 1 -18 -62 Z"
        fill="url(#lumaBody)"
        stroke="var(--accent)"
        strokeWidth="2.5"
      />
      {/* cheeks */}
      <circle cx="40" cy="62" r="6" fill="#F6A9C0" opacity="0.6" />
      <circle cx="76" cy="62" r="6" fill="#F6A9C0" opacity="0.6" />
      {eyes}
      {mouth}
      {/* little star companion */}
      <path d="M96 30 l2.2 4.6 l5 0.6 l-3.6 3.4 l0.9 5 l-4.5 -2.4 l-4.5 2.4 l0.9 -5 l-3.6 -3.4 l5 -0.6 Z" fill="var(--accent)" opacity="0.85" />
    </svg>
  )
}
