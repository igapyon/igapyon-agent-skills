import assert from "node:assert/strict";
import test from "node:test";
import { parse as parseBundled, stringify as stringifyBundled } from "../skills/igapyon-miku-daybook/assets/daybook/scripts/vendor/yaml-runtime.mjs";
import { parse as parseReference, stringify as stringifyReference } from "yaml";

const documents = [
  `type: task\nid: task-202611-00001\nstatus: todo\ncreated: 2026-11-06\npriority: 7\n`,
  `quoted: "2026-11-06"\nnumber: 42\nboolean: true\nempty: null\nstring: ""\n`,
  `text: |\n  複数行の本文\n  コロン: # コメントではない\n`,
  `anchor: &shared "共有値"\ncopy: *shared\n`,
  `日本語: '引用符: "あり"'\npath: "a/b.md"\n`,
  `sequence:\n  - alpha\n  - beta\nmapping: { enabled: true, count: 2 }\n`,
];

test("the bundled yaml ESM matches the pinned yaml package parser", () => {
  for (const document of documents) {
    assert.deepEqual(parseBundled(document), parseReference(document));
  }
  for (const document of ["a: [\n", "a: 1\na: 2\n"]) {
    assert.throws(() => parseBundled(document));
    assert.throws(() => parseReference(document));
  }
});

test("the bundled yaml ESM matches front-matter serialization and reparses output", () => {
  const values = {
    type: "task",
    id: "task-202611-00042",
    status: "todo",
    priority: 7,
    planned_action: "コロン: # 引用が必要",
    content: "一行目\n二行目",
    labels: ["日本語", "unicode-✓"],
    nested: { enabled: true, empty: null },
  };
  const reference = stringifyReference(values, { lineWidth: 0 });
  const bundled = stringifyBundled(values, { lineWidth: 0 });
  assert.equal(bundled, reference);
  assert.deepEqual(parseBundled(bundled), parseReference(reference));
});

test("binary tags retain Node Buffer values and UTF-8 decoding", () => {
  for (const document of [
    "planned_action: !!binary SGVsbG8=\n",
    "planned_action: !!binary |\n  44GT44KT44Gr44Gh44Gv\n",
  ]) {
    const expected = parseReference(document);
    const actual = parseBundled(document);
    assert.deepEqual(actual, expected);
    assert.ok(Buffer.isBuffer(actual.planned_action));
    assert.equal(String(actual.planned_action), String(expected.planned_action));
  }
});

test("binary serialization and round-trip match the Node package", () => {
  const values = { content: Buffer.from("Hello 日本語", "utf8") };
  const options = { schema: "yaml-1.1", lineWidth: 0 };
  const expected = stringifyReference(values, options);
  const actual = stringifyBundled(values, options);
  assert.equal(actual, expected);
  assert.deepEqual(parseBundled(actual), values);
});
