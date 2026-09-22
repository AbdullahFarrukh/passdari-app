// Decorative, non-scannable bar widths — visual texture only, no data encoded.
export const BARCODE_A = [2, 4, 1, 1, 1, 2, 1, 4, 2, 1, 4, 2, 3, 2, 2, 2, 4, 3, 4, 1, 3, 2, 4, 2, 1, 1, 2, 4, 4, 2, 3, 2, 4, 2, 1, 3, 2];
export const BARCODE_B = [4, 2, 4, 1, 1, 1, 3, 3, 2, 1, 4, 3, 1, 1, 4, 2, 3, 2, 3, 3, 4, 1, 1, 4, 4, 4, 1, 3, 4, 3, 2, 1, 3, 1, 2, 4, 3, 2, 3, 1];

export function Barcode({ bars, width, height }: { bars: number[]; width: number; height: number }) {
  const gap = 3;
  let x = 0;
  const rects = bars.map((w, i) => {
    const rect = <rect key={i} x={x} y={0} width={w} height={height} fill="#111111" />;
    x += w + gap;
    return rect;
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="block">
      {rects}
    </svg>
  );
}
