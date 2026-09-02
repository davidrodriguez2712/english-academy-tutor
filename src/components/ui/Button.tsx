'use client'
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
}
export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  const base = 'rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed'
  const styles =
    variant === 'primary'
      ? { background: 'var(--primary)', color: 'var(--primary-contrast)' }
      : { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }
  return <button className={`${base} ${className}`} style={styles} {...rest} />
}
