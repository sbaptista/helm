// The Helm ship's-wheel mark (the app icon), drawn as SVG so it stays sharp
// in print. Geometry matches public/icons/helm-*.png and the auth screen's
// wheel; colours are parameters because the app icon is light on navy and
// print draws it dark on white paper.

type HelmWheelProps = {
  /** CSS size, e.g. 40, '18pt', '1.5in'. */
  size?: number | string;
  /** Rim, spokes, handles and hub. */
  wheelColor?: string;
  /** Outer ring and hub accents. */
  accentColor?: string;
  /** Hub centre. */
  centerColor?: string;
  /** Stroke multiplier; above 1 thickens lines for very small sizes. */
  weight?: number;
};

const SPOKES: Array<[number, number, number, number]> = [
  [367, 260, 431, 260], [359, 279, 404, 324], [340, 287, 340, 351], [321, 279, 276, 324],
  [313, 260, 249, 260], [321, 241, 276, 196], [340, 233, 340, 169], [359, 241, 404, 196],
];
const HANDLES: Array<[number, number]> = [
  [449, 260], [417, 337], [340, 369], [263, 337], [231, 260], [263, 183], [340, 151], [417, 183],
];

export function HelmWheel({
  size = 40,
  wheelColor = '#0D1E35',
  accentColor = '#B8892A',
  centerColor = '#0D1E35',
  weight = 1,
}: HelmWheelProps) {
  return (
    <svg width={size} height={size} viewBox="190 110 300 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      <circle cx="340" cy="260" r="104" fill="none" stroke={accentColor} strokeWidth={1.5 * weight} opacity="0.55" />
      <circle cx="340" cy="260" r="99" fill="none" stroke={wheelColor} strokeWidth={9 * weight} />
      {SPOKES.map(([x1, y1, x2, y2]) => (
        <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={wheelColor} strokeWidth={7.5 * weight} strokeLinecap="round" />
      ))}
      {HANDLES.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={9 * Math.sqrt(weight)} fill={wheelColor} />
      ))}
      <circle cx="340" cy="260" r="26" fill={wheelColor} />
      <circle cx="340" cy="260" r="18" fill={accentColor} />
      <circle cx="340" cy="260" r="10" fill={centerColor} />
      <circle cx="340" cy="260" r="6" fill={accentColor} />
    </svg>
  );
}
