import { VERSION } from '@/lib/version'

type Props = {
  className?: string
  style?: React.CSSProperties
}

export default function HelmVersionLabel({ className, style }: Props) {
  return <span className={className} style={style}>v{VERSION}</span>
}
