#!/usr/bin/env node

import { inflateSync } from "node:zlib";

const pngSignature = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const channelsByColorType = new Map([
  [0, 1],
  [2, 3],
  [3, 1],
  [4, 2],
  [6, 4],
]);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function fail(message) {
  throw new Error(`Invalid PNG: ${message}`);
}

export function validatePngBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < pngSignature.length) {
    fail("file is empty or shorter than the PNG signature");
  }
  if (!buffer.subarray(0, pngSignature.length).equals(pngSignature)) {
    fail("PNG signature is missing");
  }

  let offset = pngSignature.length;
  let ihdr = null;
  let idat = [];
  let sawPlte = false;
  let sawIend = false;
  let chunkCount = 0;
  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) fail("truncated chunk header");
    const length = buffer.readUInt32BE(offset);
    offset += 4;
    const type = buffer.subarray(offset, offset + 4).toString("ascii");
    offset += 4;
    if (offset + length + 4 > buffer.length) fail(`truncated ${type} chunk`);
    const data = buffer.subarray(offset, offset + length);
    offset += length;
    const expectedCrc = buffer.readUInt32BE(offset);
    offset += 4;
    const actualCrc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
    if (expectedCrc !== actualCrc) fail(`${type} CRC does not match`);
    if (chunkCount === 0 && type !== "IHDR") fail("IHDR must be the first chunk");
    chunkCount += 1;

    if (type === "IHDR") {
      if (ihdr || length !== 13) fail("IHDR must occur once and be 13 bytes");
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === "IDAT") {
      if (!ihdr) fail("IDAT appears before IHDR");
      idat.push(data);
    } else if (type === "PLTE") {
      if (length === 0 || length % 3 !== 0) fail("PLTE length must be a non-zero multiple of 3");
      sawPlte = true;
    } else if (type === "IEND") {
      if (length !== 0) fail("IEND must be empty");
      if (idat.length === 0) fail("IEND appears before IDAT");
      sawIend = true;
      break;
    }
  }

  if (!ihdr) fail("IHDR is missing");
  if (!sawIend) fail("IEND is missing");
  if (offset !== buffer.length) fail("data exists after IEND");
  if (ihdr.width === 0 || ihdr.height === 0) fail("image dimensions must be non-zero");
  if (ihdr.compression !== 0 || ihdr.filter !== 0 || ihdr.interlace !== 0) {
    fail("unsupported compression, filter, or interlace method");
  }
  const channels = channelsByColorType.get(ihdr.colorType);
  if (!channels) fail(`unsupported color type ${ihdr.colorType}`);
  if (ihdr.colorType === 3 && !sawPlte) fail("indexed-color PNG is missing PLTE");
  const legalBitDepths = ihdr.colorType === 2 || ihdr.colorType === 4
    ? [8, 16]
    : ihdr.colorType === 3
      ? [1, 2, 4, 8]
      : [1, 2, 4, 8, 16];
  if (!legalBitDepths.includes(ihdr.bitDepth)) fail(`unsupported bit depth ${ihdr.bitDepth}`);
  if (idat.length === 0) fail("IDAT is missing");

  let inflated;
  try {
    inflated = inflateSync(Buffer.concat(idat));
  } catch (error) {
    fail(`IDAT cannot be decompressed: ${error.message}`);
  }
  const bitsPerPixel = channels * ihdr.bitDepth;
  const rowBytes = Math.ceil((ihdr.width * bitsPerPixel) / 8);
  const expectedBytes = (rowBytes + 1) * ihdr.height;
  if (inflated.length !== expectedBytes) {
    fail(`decoded scanline length ${inflated.length} does not equal ${expectedBytes}`);
  }
  for (let row = 0; row < ihdr.height; row += 1) {
    const filter = inflated[row * (rowBytes + 1)];
    if (filter > 4) fail(`unsupported scanline filter ${filter}`);
  }

  return { width: ihdr.width, height: ihdr.height, colorType: ihdr.colorType, bitDepth: ihdr.bitDepth };
}

export { pngSignature };
