import qrcode from 'qrcode-generator';

export function QR({ value, size = 132, label }: { value: string; size?: number; label?: string }) {
  const qr = qrcode(0, 'M');
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  const cells: string[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) cells.push(`M${c + 2} ${r + 2}h1v1h-1z`);
  return (
    <svg role="img" aria-label={label || 'QR code'} width={size} height={size} viewBox={`0 0 ${n + 4} ${n + 4}`} style={{ borderRadius: 10, background: '#fff', display: 'block', flex: 'none' }} shapeRendering="crispEdges">
      <path d={cells.join('')} fill="#111" />
    </svg>
  );
}
