"use client";

import { useState } from "react";
import { useZxing } from "react-zxing";

export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const [paused, setPaused] = useState(false);

  const { ref } = useZxing({
    paused,
    onDecodeResult(result) {
      setPaused(true);
      onScan(result.rawValue);
    },
  });

  return <video ref={ref} muted playsInline className="w-full max-w-sm rounded-lg" />;
}