import { QRCodeSVG } from "qrcode.react";
import type { Booking } from "@workspace/api-client-react";
import { buildTicketPayload } from "@/lib/ticket";

interface Props {
  booking: Booking;
  size?: number;
  className?: string;
}

export default function TicketQR({ booking, size = 160, className }: Props) {
  const value = buildTicketPayload(booking);
  return (
    <div className={`inline-block bg-white p-2.5 rounded-xl shadow-sm ${className ?? ""}`}>
      <QRCodeSVG value={value} size={size} level="M" fgColor="#0f172a" bgColor="#ffffff" />
    </div>
  );
}
