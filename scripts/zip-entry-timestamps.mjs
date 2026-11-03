import { parseOutputTimestamp } from "./record-release-archive-timestamp.mjs";

const EOCD_SIGNATURE = 0x06054b50;
const ZIP64_EOCD_SIGNATURE = 0x06064b50;
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const EOCD_MIN_SIZE = 22;
const MAX_COMMENT_LENGTH = 0xffff;

function safeNumber(value, label) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${label} exceeds the supported ZIP size`);
  }
  return Number(value);
}

function findEocd(buffer) {
  const start = Math.max(0, buffer.length - EOCD_MIN_SIZE - MAX_COMMENT_LENGTH);
  for (let offset = buffer.length - EOCD_MIN_SIZE; offset >= start; offset--) {
    if (buffer.readUInt32LE(offset) !== EOCD_SIGNATURE) continue;
    const commentLength = buffer.readUInt16LE(offset + 20);
    if (offset + EOCD_MIN_SIZE + commentLength === buffer.length) return offset;
  }
  throw new Error("ZIP end-of-central-directory record was not found");
}

function centralDirectoryBounds(buffer, eocdOffset) {
  const diskNumber = buffer.readUInt16LE(eocdOffset + 4);
  const centralDisk = buffer.readUInt16LE(eocdOffset + 6);
  const entriesOnDisk = buffer.readUInt16LE(eocdOffset + 8);
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralSize32 = buffer.readUInt32LE(eocdOffset + 12);
  const centralOffset32 = buffer.readUInt32LE(eocdOffset + 16);

  if (diskNumber !== 0 || centralDisk !== 0) {
    throw new Error("Multi-disk ZIP archives are not supported");
  }

  if (
    entriesOnDisk !== 0xffff && totalEntries !== 0xffff &&
    centralSize32 !== 0xffffffff && centralOffset32 !== 0xffffffff
  ) {
    if (entriesOnDisk !== totalEntries) throw new Error("ZIP entry counts do not match");
    return { totalEntries, centralSize: centralSize32, centralOffset: centralOffset32 };
  }

  const locatorOffset = eocdOffset - 20;
  if (locatorOffset < 0 || buffer.readUInt32LE(locatorOffset) !== ZIP64_LOCATOR_SIGNATURE) {
    throw new Error("ZIP64 locator was not found");
  }
  if (buffer.readUInt32LE(locatorOffset + 4) !== 0 || buffer.readUInt32LE(locatorOffset + 16) !== 1) {
    throw new Error("Multi-disk ZIP64 archives are not supported");
  }
  const zip64Offset = safeNumber(buffer.readBigUInt64LE(locatorOffset + 8), "ZIP64 directory offset");
  if (zip64Offset + 56 > buffer.length || buffer.readUInt32LE(zip64Offset) !== ZIP64_EOCD_SIGNATURE) {
    throw new Error("ZIP64 end-of-central-directory record is invalid");
  }

  const zip64Disk = buffer.readUInt32LE(zip64Offset + 16);
  const zip64CentralDisk = buffer.readUInt32LE(zip64Offset + 20);
  const zip64EntriesOnDisk = buffer.readBigUInt64LE(zip64Offset + 24);
  const zip64TotalEntries = buffer.readBigUInt64LE(zip64Offset + 32);
  if (zip64Disk !== 0 || zip64CentralDisk !== 0 || zip64EntriesOnDisk !== zip64TotalEntries) {
    throw new Error("Multi-disk or inconsistent ZIP64 archive is not supported");
  }

  return {
    totalEntries: safeNumber(zip64TotalEntries, "ZIP64 entry count"),
    centralSize: safeNumber(buffer.readBigUInt64LE(zip64Offset + 40), "ZIP64 central directory size"),
    centralOffset: safeNumber(buffer.readBigUInt64LE(zip64Offset + 48), "ZIP64 central directory offset"),
  };
}

function readZip64LocalOffset(extra, values) {
  let offset = 0;
  while (offset + 4 <= extra.length) {
    const id = extra.readUInt16LE(offset);
    const length = extra.readUInt16LE(offset + 2);
    const start = offset + 4;
    const end = start + length;
    if (end > extra.length) throw new Error("Malformed ZIP extra field");
    if (id === 0x0001) {
      let cursor = start;
      if (values.uncompressedSize === 0xffffffff) cursor += 8;
      if (values.compressedSize === 0xffffffff) cursor += 8;
      if (values.localOffset === 0xffffffff) {
        if (cursor + 8 > end) throw new Error("ZIP64 local-header offset is missing");
        return safeNumber(extra.readBigUInt64LE(cursor), "ZIP64 local-header offset");
      }
      if (values.diskStart === 0xffff) {
        if (cursor + 4 > end) throw new Error("ZIP64 disk number is missing");
        if (extra.readUInt32LE(cursor) !== 0) throw new Error("Multi-disk ZIP64 archives are not supported");
      }
    }
    offset = end;
  }
  if (values.localOffset === 0xffffffff) throw new Error("ZIP64 local-header offset is missing");
  if (values.diskStart !== 0) throw new Error("Multi-disk ZIP archives are not supported");
  return values.localOffset;
}

function dosTimestamp(buffer, offset) {
  const time = buffer.readUInt16LE(offset);
  const date = buffer.readUInt16LE(offset + 2);
  return { time, date };
}

function formatDosTimestamp({ time, date }) {
  const year = 1980 + ((date >>> 9) & 0x7f);
  const month = (date >>> 5) & 0x0f;
  const day = date & 0x1f;
  const hour = (time >>> 11) & 0x1f;
  const minute = (time >>> 5) & 0x3f;
  const second = (time & 0x1f) * 2;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

function packDosTimestamp(timestamp) {
  const [year, month, day] = timestamp.date.split("-").map(Number);
  return {
    date: ((year - 1980) << 9) | (month << 5) | day,
    time: 0,
  };
}

export function readZipEntryTimestamps(buffer) {
  if (!Buffer.isBuffer(buffer)) throw new Error("ZIP data must be a Buffer");
  const eocdOffset = findEocd(buffer);
  const { totalEntries, centralSize, centralOffset } = centralDirectoryBounds(buffer, eocdOffset);
  const centralEnd = centralOffset + centralSize;
  if (centralEnd > eocdOffset || centralEnd > buffer.length) {
    throw new Error("ZIP central directory extends beyond the archive bounds");
  }

  const entries = [];
  let cursor = centralOffset;
  for (let index = 0; index < totalEntries; index++) {
    if (cursor + 46 > centralEnd || buffer.readUInt32LE(cursor) !== CENTRAL_SIGNATURE) {
      throw new Error(`ZIP central directory entry ${index + 1} is invalid`);
    }
    const flags = buffer.readUInt16LE(cursor + 8);
    const centralTimestamp = dosTimestamp(buffer, cursor + 12);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const diskStart = buffer.readUInt16LE(cursor + 34);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const nameStart = cursor + 46;
    const extraStart = nameStart + nameLength;
    const entryEnd = extraStart + extraLength + commentLength;
    if (entryEnd > centralEnd) throw new Error(`ZIP central directory entry ${index + 1} is truncated`);

    const name = (flags & 0x0800) !== 0
      ? new TextDecoder("utf-8").decode(buffer.subarray(nameStart, extraStart))
      : buffer.toString("latin1", nameStart, extraStart);
    const extra = buffer.subarray(extraStart, extraStart + extraLength);
    const localHeaderOffset = readZip64LocalOffset(extra, {
      uncompressedSize: buffer.readUInt32LE(cursor + 24),
      compressedSize: buffer.readUInt32LE(cursor + 20),
      localOffset,
      diskStart,
    });

    if (localHeaderOffset + 30 > buffer.length || buffer.readUInt32LE(localHeaderOffset) !== LOCAL_SIGNATURE) {
      throw new Error(`ZIP local header is invalid for ${name}`);
    }
    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    if (localHeaderOffset + 30 + localNameLength + localExtraLength > buffer.length) {
      throw new Error(`ZIP local header is truncated for ${name}`);
    }
    const localTimestamp = dosTimestamp(buffer, localHeaderOffset + 10);

    entries.push({ name, central: centralTimestamp, local: localTimestamp });
    cursor = entryEnd;
  }
  if (cursor !== centralEnd) throw new Error("ZIP central directory size does not match its entries");
  return entries;
}

export function assertZipEntryTimestamps(buffer, expectedTimestamp) {
  const expected = packDosTimestamp(parseOutputTimestamp(expectedTimestamp));
  const entries = readZipEntryTimestamps(buffer);
  const mismatches = [];
  for (const entry of entries) {
    if (entry.central.date !== expected.date || entry.central.time !== expected.time) {
      mismatches.push(`${entry.name}: central=${formatDosTimestamp(entry.central)}`);
    }
    if (entry.local.date !== expected.date || entry.local.time !== expected.time) {
      mismatches.push(`${entry.name}: local=${formatDosTimestamp(entry.local)}`);
    }
  }
  if (mismatches.length > 0) {
    const shown = mismatches.slice(0, 12).join("\n");
    const remainder = mismatches.length > 12 ? `\n... and ${mismatches.length - 12} more mismatch(es)` : "";
    throw new Error(`ZIP entries do not all use ${expectedTimestamp}:\n${shown}${remainder}`);
  }
  return { entry_count: entries.length, output_timestamp: expectedTimestamp };
}
