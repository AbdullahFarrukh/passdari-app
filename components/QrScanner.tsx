"use client";

import { useState } from "react";
import { useZxing } from "react-zxing";

// A dark viewport with a scan frame, like a real camera app — not a bare, borderless <video>.
export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const [paused, setPaused] = useState(false);

  const { ref } = useZxing({
    paused,
    onDecodeResult(result) {
      setPaused(true);
      onScan(result.rawValue);
    },
  });

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#1E1E1A]">
      <video ref={ref} muted playsInline className="size-full object-cover opacity-90" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative size-[55%] max-w-48">
          <span className="absolute left-0 top-0 size-7 border-l-[5px] border-t-[5px] border-paper" />
          <span className="absolute right-0 top-0 size-7 border-r-[5px] border-t-[5px] border-paper" />
          <span className="absolute bottom-0 left-0 size-7 border-b-[5px] border-l-[5px] border-paper" />
          <span className="absolute bottom-0 right-0 size-7 border-b-[5px] border-r-[5px] border-paper" />
          <span className="absolute inset-x-2 top-1/2 h-[3px] -translate-y-1/2 bg-paper opacity-85" />
        </div>
      </div>
      <p className="pointer-events-none absolute inset-x-0 bottom-2.5 text-center font-mono text-[10.5px] uppercase tracking-[.08em] text-white">
        Point the camera at the QR code
      </p>
    </div>
  );
}
