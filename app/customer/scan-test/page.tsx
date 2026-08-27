"use client";

import { useState } from "react";
import { QrScanner } from "@/components/QrScanner";

export default function ScanTestPage() {
  const [lastScan, setLastScan] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <p className="text-sm font-semibold">Camera scan test</p>
      <QrScanner onScan={setLastScan} />
      {lastScan && (
        <p className="text-sm break-all">
          Scanned: <span className="font-mono">{lastScan}</span>
        </p>
      )}
    </div>
  );
}