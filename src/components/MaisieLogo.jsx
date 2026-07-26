export default function MaisieLogo({ size = 96 }) {
  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer petal ring */}
      <svg
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          animation: 'rot 22s linear infinite',
          transformOrigin: '50% 50%'
        }}
        viewBox="0 0 100 100"
      >
        <path d="M50 0 C60 20, 80 40, 100 50 C80 60, 60 80, 50 100 C40 80, 20 60, 0 50 C20 40, 40 20, 50 0 Z" fill="var(--pink-mid)" opacity="0.8" />
        <path d="M14.6 14.6 C32.6 10, 67.4 10, 85.4 14.6 C90 32.6, 90 67.4, 85.4 85.4 C67.4 90, 32.6 90, 14.6 85.4 C10 67.4, 10 32.6, 14.6 14.6 Z" fill="none" stroke="var(--pink-accent)" strokeWidth="1" opacity="0.3" transform="rotate(45 50 50)" />
      </svg>
      {/* Center breathing dot */}
      <div 
        style={{
          width: size * 0.25,
          height: size * 0.25,
          backgroundColor: 'var(--pink-accent)',
          borderRadius: '50%',
          animation: 'breathe 3s ease-in-out infinite',
          transformOrigin: '50% 50%',
          position: 'relative',
          zIndex: 2
        }} 
      />
    </div>
  )
}
