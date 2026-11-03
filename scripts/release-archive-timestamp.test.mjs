import assert from "node:assert/strict";
import test from "node:test";
import { createTimestampRecord, parseOutputTimestamp } from "./record-release-archive-timestamp.mjs";
import { assertZipEntryTimestamps, readZipEntryTimestamps } from "./zip-entry-timestamps.mjs";

const expectedTimestamp = "2026-11-02T00:00:00Z";

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDate(timestamp) {
  const [year, month, day] = timestamp.slice(0, 10).split("-").map(Number);
  return { time: 0, date: ((year - 1980) << 9) | (month << 5) | day };
}

function zipFixture({ centralTimestamp = expectedTimestamp, localTimestamp = expectedTimestamp } = {}) {
  const entries = [
    { name: "release/", data: Buffer.alloc(0) },
    { name: "release/SKILL.md", data: Buffer.from("fixture\n") },
  ];
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const localData = entry.data;
    const crc = crc32(localData);
    const localDate = dosDate(localTimestamp);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(localDate.time, 10);
    localHeader.writeUInt16LE(localDate.date, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(localData.length, 18);
    localHeader.writeUInt32LE(localData.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localParts.push(localHeader, name, localData);

    const centralDate = dosDate(centralTimestamp);
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(0x0314, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(centralDate.time, 12);
    centralHeader.writeUInt16LE(centralDate.date, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(localData.length, 20);
    centralHeader.writeUInt32LE(localData.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt32LE(localOffset, 42);
    centralParts.push(centralHeader, name);
    localOffset += localHeader.length + name.length + localData.length;
  }

  const central = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, central, eocd]);
}

test("accepts a valid UTC midnight timestamp and records its epoch", () => {
  const parsed = parseOutputTimestamp("2024-02-29T00:00:00Z");
  assert.equal(parsed.date, "2024-02-29");
  assert.equal(parsed.epoch_seconds, Date.parse("2024-02-29T00:00:00Z") / 1000);
  assert.deepEqual(createTimestampRecord(expectedTimestamp, "1.0.0"), {
    schema_version: "igapyon-agent-skills.release-archive-timestamp/v1",
    project_version: "1.0.0",
    output_timestamp: expectedTimestamp,
    output_timestamp_epoch_seconds: Date.parse(expectedTimestamp) / 1000,
  });
});

for (const invalid of [
  "2026-11-02T00:00:02Z",
  "2026-11-02T00:00:00+00:00",
  "2026-02-29T00:00:00Z",
  "1979-12-31T00:00:00Z",
  "2108-01-01T00:00:00Z",
]) {
  test(`rejects invalid ZIP output timestamp ${invalid}`, () => {
    assert.throws(() => parseOutputTimestamp(invalid));
  });
}

test("reads and validates UTC midnight on every directory and file entry", () => {
  const entries = readZipEntryTimestamps(zipFixture());
  assert.deepEqual(entries.map((entry) => entry.name), ["release/", "release/SKILL.md"]);
  assert.deepEqual(assertZipEntryTimestamps(zipFixture(), expectedTimestamp), {
    entry_count: 2,
    output_timestamp: expectedTimestamp,
  });
});

test("rejects a central directory timestamp mismatch", () => {
  assert.throws(
    () => assertZipEntryTimestamps(zipFixture({ centralTimestamp: "2026-11-03T00:00:00Z" }), expectedTimestamp),
    /central=/,
  );
});

test("rejects a local header timestamp mismatch", () => {
  assert.throws(
    () => assertZipEntryTimestamps(zipFixture({ localTimestamp: "2026-11-03T00:00:00Z" }), expectedTimestamp),
    /local=/,
  );
});

test("rejects truncated ZIP data", () => {
  assert.throws(() => readZipEntryTimestamps(zipFixture().subarray(0, 24)), /end-of-central-directory/);
});
