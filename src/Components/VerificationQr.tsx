import { useMemo } from 'react';
import encodeQR from 'qr';

type QrMatrix = Array<Array<boolean | number>>;

export function VerificationQr({ value, label = 'Document verification QR code' }: { value: string; label?: string }) {
  const matrix = useMemo(() => encodeQR(value, 'raw', { ecc: 'high' }) as QrMatrix, [value]);
  const quietZone = 4;
  const size = matrix.length + quietZone * 2;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      className="h-44 w-44 rounded-xl bg-white p-2"
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="white" />
      <g fill="black">
        {matrix.flatMap((row, y) => row.map((cell, x) => cell ? (
          <rect key={`${x}-${y}`} x={x + quietZone} y={y + quietZone} width="1" height="1" />
        ) : null))}
      </g>
    </svg>
  );
}
