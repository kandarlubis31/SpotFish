// GPX (GPS Exchange Format) export utility
// Generates a valid GPX 1.1 XML document from track points

export interface GpxPoint {
  lat: number;
  lng: number;
  timestamp: number; // epoch ms
  altitude?: number | null;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isoDate(ms: number): string {
  return new Date(ms).toISOString();
}

export function buildGpx(points: GpxPoint[], name = 'SpotFish! Track'): string {
  const trkpts = points
    .map(
      (p) =>
        `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}">` +
        (p.altitude != null ? `<ele>${p.altitude.toFixed(1)}</ele>` : '') +
        `<time>${isoDate(p.timestamp)}</time></trkpt>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SpotFish!" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(name)}</name>
    <time>${isoDate(Date.now())}</time>
  </metadata>
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

export function downloadGpx(points: GpxPoint[], filename?: string) {
  if (points.length < 2) {
    alert('Track terlalu pendek untuk diekspor (minimal 2 titik).');
    return;
  }
  const date = new Date();
  const fname =
    filename ||
    `spotfish-track-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
      date.getDate()
    ).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}.gpx`;

  const blob = new Blob([buildGpx(points)], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
