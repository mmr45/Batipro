// Écrit une archive ZIP sans compression (méthode « stored »).
// Suffisant pour des PDF, déjà compressés, et sans dépendance externe.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  nom: string;
  data: Uint8Array;
}

function dosDateTime(d: Date): [number, number] {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return [time, date];
}

export function zip(entries: ZipEntry[], now = new Date()): Uint8Array {
  const enc = new TextEncoder();
  const [time, date] = dosDateTime(now);
  const locaux: Uint8Array[] = [];
  const centraux: Uint8Array[] = [];
  let offset = 0;

  for (const e of entries) {
    const nom = enc.encode(e.nom);
    const crc = crc32(e.data);
    const size = e.data.length;

    const local = new Uint8Array(30 + nom.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true); // version
    lv.setUint16(6, 0x0800, true); // noms en UTF-8
    lv.setUint16(8, 0, true); // stored
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nom.length, true);
    lv.setUint16(28, 0, true);
    local.set(nom, 30);

    const central = new Uint8Array(46 + nom.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nom.length, true);
    cv.setUint32(42, offset, true);
    central.set(nom, 46);

    locaux.push(local, e.data);
    centraux.push(central);
    offset += local.length + size;
  }

  const tailleCentral = centraux.reduce((s, c) => s + c.length, 0);
  const fin = new Uint8Array(22);
  const fv = new DataView(fin.buffer);
  fv.setUint32(0, 0x06054b50, true);
  fv.setUint16(8, entries.length, true);
  fv.setUint16(10, entries.length, true);
  fv.setUint32(12, tailleCentral, true);
  fv.setUint32(16, offset, true);

  const parts = [...locaux, ...centraux, fin];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}
