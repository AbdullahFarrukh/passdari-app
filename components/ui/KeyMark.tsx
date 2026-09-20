// A small picture made from a wallet address, so "your key" is something you can recognise at a glance
// (the same address always gives the same picture). Purely decorative: the address itself is always shown next to it.
const COLOURS = ["#2E3F6E", "#B23A2E", "#3B6248", "#2A2724"];

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function KeyMark({ address, size = 40 }: { address: string; size?: number }) {
  let hash = 2166136261;
  for (const ch of address) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0;
  const random = seededRandom(hash);
  const colour = COLOURS[Math.floor(random() * COLOURS.length)];

  // 5 x 5 grid, mirrored left to right, so it always looks intentional.
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if (random() > 0.5) {
        cells.push({ x, y });
        if (x !== 2) cells.push({ x: 4 - x, y });
      }
    }
  }
  return (
    <svg width={size} height={size} viewBox="0 0 5 5" role="img" aria-label="Picture made from your wallet address"
      className="shrink-0 rounded-lg border border-line-strong bg-paper-2" shapeRendering="crispEdges">
      {cells.map(({ x, y }) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={colour} />)}
    </svg>
  );
}
