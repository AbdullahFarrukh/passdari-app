import type { SVGProps } from "react";

// Small line icons, drawn to match the 1.5 stroke used elsewhere. They inherit the text colour.
function Icon({ children, size = 16, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}
type P = { size?: number; className?: string };

export const ExternalLinkIcon = (p: P) => <Icon {...p}><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></Icon>;
export const CopyIcon = (p: P) => <Icon {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></Icon>;
export const CheckIcon = (p: P) => <Icon {...p}><path d="M20 6 9 17l-5-5" /></Icon>;
export const KeyIcon = (p: P) => <Icon {...p}><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9" /><path d="m16 7 3 3" /></Icon>;
export const ShieldIcon = (p: P) => <Icon {...p}><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3z" /><path d="m9 12 2 2 4-4" /></Icon>;
export const LockIcon = (p: P) => <Icon {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>;
export const ReceiptIcon = (p: P) => <Icon {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></Icon>;
export const StampIcon = (p: P) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M8 12v3h8v-3" /><path d="M5 20h14" /><path d="M7 15h10v5H7z" /></Icon>;
export const TicketIcon = (p: P) => <Icon {...p}><path d="M4 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h16v-2a2 2 0 0 1 0-4v0a2 2 0 0 0 0-4V6H4z" /><path d="M14 6v12" strokeDasharray="2 2" /></Icon>;
export const FlameIcon = (p: P) => <Icon {...p}><path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1.5.6-2.5 1.5-3.5C10 9 11 6 12 3z" /></Icon>;
export const StoreIcon = (p: P) => <Icon {...p}><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-6h6v6" /></Icon>;
export const WalletIcon = (p: P) => <Icon {...p}><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18" /><circle cx="7.5" cy="14.5" r="1" fill="currentColor" /><circle cx="11.5" cy="14.5" r="1" fill="currentColor" /></Icon>;
export const QrIcon = (p: P) => <Icon {...p}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01" /></Icon>;
export const ArrowRightIcon = (p: P) => <Icon {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Icon>;
export const CubeIcon = (p: P) => <Icon {...p}><path d="M12 3 4 7v10l8 4 8-4V7z" /><path d="M4 7l8 4 8-4M12 11v10" /></Icon>;
export const ClockIcon = (p: P) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>;
export const CloseIcon = (p: P) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const ChatIcon = (p: P) => <Icon {...p}><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" /></Icon>;
