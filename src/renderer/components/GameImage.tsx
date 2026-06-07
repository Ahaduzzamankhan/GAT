import React from 'react'
import { useGameImage } from '../hooks'

interface GameImageProps {
  imagePath: string | null
  name: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
  xl: 'w-24 h-24 text-xl'
}

export default function GameImage({ imagePath, name, className = '', size = 'md' }: GameImageProps) {
  const src = useGameImage(imagePath)
  const sizeClass = sizeMap[size]
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClass} object-cover rounded-lg ${className}`}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }

  return (
    <div className={`${sizeClass} rounded-lg bg-bg-tertiary border border-border-default flex items-center justify-center font-semibold text-text-secondary ${className}`}>
      {initials}
    </div>
  )
}
