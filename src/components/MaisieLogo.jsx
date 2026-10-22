export default function MaisieLogo({ size = 96, variant = 'mark', width, className, style }) {
  const isWordmark = variant === 'wordmark'

  return (
    <img
      src={isWordmark ? '/brand/maisie-health-logo.png' : '/brand/maisie-flower.png'}
      alt={isWordmark ? 'Maisie Health' : ''}
      aria-hidden={isWordmark ? undefined : 'true'}
      className={className}
      style={{
        display: 'block',
        width: isWordmark ? (width || 280) : size,
        height: isWordmark ? 'auto' : size,
        objectFit: 'contain',
        ...style,
      }}
    />
  )
}
