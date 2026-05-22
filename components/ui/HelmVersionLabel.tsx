'use client'

import { useEffect, useState } from 'react'
import { VERSION } from '@/lib/version'

type Props = {
  className?: string
  style?: React.CSSProperties
}

export default function HelmVersionLabel({ className, style }: Props) {
  const [text, setText] = useState('')

  useEffect(() => {
    setText(`v${VERSION}`)
  }, [])

  return <span className={className} style={style}>{text}</span>
}
