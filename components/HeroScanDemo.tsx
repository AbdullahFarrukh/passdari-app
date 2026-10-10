"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// The home hero's moving piece: the same example card ExampleCard always showed (Blue Door Cafe, 7 of
// 10 stamps), now looping through the motion of claiming its 8th. Entirely decorative — aria-hidden,
// exactly like the static card it replaces — the real claim flow is ClaimPanel, on /customer.
//
// Positions the stamp, the ink ripple and the ink specks by measuring the target square itself (not by
// guessing pixel offsets), so it stays correct at any width without a second, hand-tuned layout for
// narrow screens.
//
// Built from tokens (bg-surface, text-ink, --accent-cyan) rather than one fixed dark palette, so the
// same component works under either theme. The one deliberate exception is the QR code itself: it stays
// a fixed white screen with dark modules in both themes, matching the real, functional QR code
// NewSaleForm generates elsewhere in the app — a QR code reads as "a QR code" because of that contrast
// pattern, not because it happens to match the page around it.

const STAMPS_REQUIRED = 10;
const STAMPS_START = 7;
const TARGET_INDEX = STAMPS_START; // the 8th square: first cell of the second row in a 5-wide grid

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

// A QR-looking block — decorative only, not a real encoder, the same honest shorthand the canvas study
// used. Seeded so it renders the same pattern every time rather than reshuffling on each mount.
function buildQrCells(): boolean[][] {
  const n = 21;
  const grid: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  function finder(or_: number, oc: number) {
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
      const edge = i === 0 || i === 6 || j === 0 || j === 6;
      const core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
      grid[or_ + i][oc + j] = edge || core;
    }
  }
  finder(0, 0); finder(0, 14); finder(14, 0);
  let seed = 20261010;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if ((r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8)) continue;
    if (r === 6) { grid[r][c] = c % 2 === 0; continue; }
    if (c === 6) { grid[r][c] = r % 2 === 0; continue; }
    grid[r][c] = rnd() > 0.52;
  }
  return grid;
}
const QR_CELLS = buildQrCells();

function QrMock() {
  return (
    <svg viewBox="0 0 21 21" shapeRendering="crispEdges" className="block h-full w-full">
      {QR_CELLS.flatMap((row, r) => row.map((on, c) => on && (
        <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#111111" />
      )))}
    </svg>
  );
}

type Phase = "idle" | "scanning" | "read" | "stamping" | "done";

// Read once, outside any effect, so the component's very first render — server-rendered HTML included —
// already shows the right resting state under reduced motion, rather than painting "idle" and then
// jumping to "done" a moment after mount. `window` doesn't exist during the server render, hence the
// guard; a lazy useState initializer only runs once per mount, so the cost of calling it is one-time.
function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HeroScanDemo() {
  const stageRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLSpanElement>(null);
  // Read once at mount and not re-subscribed afterwards: this demo is decorative, so if someone changes
  // the OS setting while the tab is already open, it finishes its current loop rather than jumping mid-
  // cycle. Reloading (or just the next natural visit) picks the new preference up.
  const [reduced] = useState(prefersReducedMotion);
  const [phase, setPhase] = useState<Phase>(() => (reduced ? "done" : "idle"));
  const [stampedTarget, setStampedTarget] = useState(reduced);
  const [count, setCount] = useState(reduced ? STAMPS_START + 1 : STAMPS_START);
  const [aim, setAim] = useState({ x: "50%", y: "50%" });

  // Measure the target square relative to the stage, so the stamp lands exactly on it at any width.
  function measure() {
    const stage = stageRef.current, target = targetRef.current;
    if (!stage || !target) return;
    const s = stage.getBoundingClientRect(), t = target.getBoundingClientRect();
    setAim({
      x: `${t.left - s.left + t.width / 2}px`,
      y: `${t.top - s.top + t.height / 2}px`,
    });
  }

  useEffect(() => {
    measure();
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 120); };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); clearTimeout(resizeTimer); };
  }, []);

  // The loop. Skipped entirely under reduced motion — the initial state above already shows the
  // finished card, so there is nothing to animate and nothing to clean up. Every timeout here is
  // tracked and cleared on unmount, because this runs inside a real page someone can navigate away
  // from mid-cycle, unlike a static demo page that never unmounts.
  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) => { const t = setTimeout(() => { if (!cancelled) fn(); }, ms); timers.push(t); };

    function tick() {
      if (cancelled) return;
      setPhase("idle"); setStampedTarget(false); setCount(STAMPS_START);
      after(900, () => {
        setPhase("scanning");
        after(2000, () => {
          setPhase("read");
          after(420, () => {
            measure();
            setPhase("stamping");
            after(470, () => {
              setStampedTarget(true);
              setCount(STAMPS_START + 1);
              after(430, () => {
                setPhase("done");
                after(2600, tick);
              });
            });
          });
        });
      });
    }
    tick();
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [reduced]);

  const statusText: Record<Phase, string> = {
    idle: "Ready to scan", scanning: "Scanning…", read: "Code read",
    stamping: "Code read", done: "+1 stamp · on-chain",
  };
  const statusColor = phase === "done" ? "var(--verified)" : phase === "idle" ? "var(--muted)" : "var(--accent-cyan)";
  const style = { "--hx": aim.x, "--hy": aim.y } as CSSProperties;

  return (
    <div ref={stageRef} className="relative mx-auto w-full max-w-sm" aria-hidden="true">
      <div className="relative rounded-2xl border border-line bg-surface shadow-[var(--card-shadow)]">
        <div className={`relative px-6 pb-3.5 pt-5 ${phase === "stamping" ? "hero-card-thud" : ""}`}>
          <p className="text-center font-mono text-[10.5px] tracking-[.15em] text-muted">PASSDARI · LOYALTY CARD</p>
          <p className="mt-2 text-center font-display text-4xl font-extrabold uppercase leading-none text-ink">Blue Door Cafe</p>
          <p className="mt-1.5 text-center font-mono text-[11px] uppercase text-[var(--accent-cyan)]">Free coffee</p>

          <div className="mt-4 border-t border-dashed border-line pt-4">
            <div className="flex items-baseline gap-2 font-mono text-[11px] uppercase text-muted">
              <span>Stamps</span>
              <span className="-translate-y-0.5 min-w-3 flex-1 border-b border-dotted border-line-strong" />
              <span className="font-bold tabular-nums text-ink">{count} / {STAMPS_REQUIRED}</span>
            </div>
            <div className="my-3 grid grid-cols-5 gap-1.5">
              {Array.from({ length: STAMPS_REQUIRED }).map((_, i) => {
                const isTarget = i === TARGET_INDEX;
                const filled = i < STAMPS_START || (isTarget && stampedTarget);
                return (
                  <span
                    key={i}
                    ref={isTarget ? targetRef : undefined}
                    className={
                      filled
                        ? `flex aspect-square items-center justify-center rounded-[3px] bg-stamp-blue text-white shadow-[0_0_12px_rgba(61,92,255,.45)] ${isTarget && stampedTarget ? "print-in" : ""}`
                        : "aspect-square rounded-[3px] border border-dashed border-line-strong"
                    }
                  >
                    {filled && <span className="w-[55%]">{CHECK}</span>}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="relative flex justify-center py-3.5">
            {/* Fixed white screen with dark modules, in both themes — the same reasoning as the real QR
                code elsewhere in the app: it reads as "a QR code" because of that contrast, not because
                it matches the surrounding card. */}
            <div className="relative h-[104px] w-[104px] rounded-md border border-line bg-white p-[7px]">
              <QrMock />
              <div className={`pointer-events-none absolute inset-0 rounded-md bg-stamp-blue ${phase === "read" ? "hero-qr-flash" : "opacity-0"}`} />
              {(["tl", "tr", "bl", "br"] as const).map((corner) => (
                <span
                  key={corner}
                  className={[
                    "absolute h-[17px] w-[17px] border-[2px] border-stamp-blue",
                    corner === "tl" && "-left-[5px] -top-[5px] rounded-tl-[4px] border-b-0 border-r-0",
                    corner === "tr" && "-right-[5px] -top-[5px] rounded-tr-[4px] border-b-0 border-l-0",
                    corner === "bl" && "-bottom-[5px] -left-[5px] rounded-bl-[4px] border-t-0 border-r-0",
                    corner === "br" && "-bottom-[5px] -right-[5px] rounded-br-[4px] border-t-0 border-l-0",
                    phase === "scanning" && "hero-bracket-pulse",
                    (phase === "read" || phase === "stamping") && "hero-bracket-snap",
                    phase === "idle" || phase === "done" ? "opacity-35" : "opacity-100",
                  ].filter(Boolean).join(" ")}
                />
              ))}
              {phase === "scanning" && (
                <div className="hero-scan-sweep absolute left-[-4px] right-[-4px] top-[2px] h-[2px] rounded-full bg-gradient-to-r from-transparent via-stamp-blue to-transparent shadow-[0_0_14px_rgba(27,57,255,.7)]" />
              )}
            </div>
          </div>

          <p className="flex min-h-4 items-center justify-center gap-1.5 text-center font-mono text-[9.5px] uppercase tracking-[.1em]" style={{ color: statusColor }}>
            <span
              className="size-[5px] rounded-full"
              style={{
                background: statusColor,
                boxShadow: phase === "idle" ? "none" : `0 0 7px ${statusColor}`,
              }}
            />
            {statusText[phase]}
          </p>
        </div>
      </div>

      {/* The stamp, the ink ripple and the specks — positioned over the target square via --hx/--hy. */}
      <div
        style={style}
        className={`absolute left-0 top-0 z-10 h-[50px] w-[84px] opacity-0 ${phase === "stamping" ? "hero-stamp-drop" : ""}`}
      >
        <span className="absolute left-1/2 top-[-19px] h-[23px] w-[12px] -translate-x-1/2 rounded-t-[4px] rounded-b-[2px] bg-ink/60" />
        <span className="absolute inset-0 flex items-center justify-center rounded-md border-2 border-[var(--accent-cyan)] bg-stamp-blue font-display text-[13px] font-black uppercase tracking-wide text-white shadow-[0_0_24px_rgba(61,92,255,.6)]">
          Paid
        </span>
      </div>
      <div
        style={style}
        className={`pointer-events-none absolute left-0 top-0 z-[6] h-4 w-4 rounded-full opacity-0 ${phase === "stamping" ? "hero-ink-ripple" : ""}`}
        aria-hidden="true"
      >
        <span className="block h-full w-full rounded-full" style={{ background: "radial-gradient(circle, rgba(94,231,255,.6) 0%, rgba(61,92,255,.26) 45%, rgba(61,92,255,0) 72%)" }} />
      </div>
      {([-30, 26, -18, 32, 3] as const).map((dx, i) => {
        const dy = [-18, -22, 20, 13, -30][i];
        return (
          <span
            key={i}
            style={{ ...style, "--dx": `${dx}px`, "--dy": `${dy}px` } as CSSProperties}
            className={`pointer-events-none absolute left-0 top-0 z-[7] size-1 rounded-full bg-[var(--accent-cyan)] opacity-0 ${phase === "stamping" ? "hero-speck-fly" : ""}`}
          />
        );
      })}
    </div>
  );
}
