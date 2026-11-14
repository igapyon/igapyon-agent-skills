# igapyon-reviewer Behavioral Evaluation Rubric

Use [inputs.md](inputs.md) to generate responses without supplying this rubric.
These cases assess decisions, not exact phrasing or a fixed finding count.
R10 has two variants, so the input set contains 13 review requests.

Record each case as pass, fail, or not run, with the observed response or its
saved location. For an actual run, record model/version, reasoning mode when
known, execution surface, date, and whether the context was fresh. If no
independent execution is available, report behavioral evaluation as not run;
source inspection or a walkthrough cannot substitute for it. Fixtures and
routing tests are not evidence of model behavior or response speed.

## Shared Criteria

- A finding has evidence, a concrete issue or supported risk, impact, and a
  useful suggested direction. Severity and status are present in either format.
- Mere reviewer uncertainty is not assigned severity. Optional suggestions
  are not disguised as findings and need not be offered.
- Status and severity are assessed separately. Unsupported claims about intent,
  runtime execution, reader testing, URL reachability, or legal status fail.
- Detailed findings use all seven fields in the contract's order. Compact
  findings preserve the required information without seven separate labels.
- No-material-issue statements appear once per consolidated report when there
  are no findings. Scope limits may still be material.
- Do not invent requirements, URLs, author experiences, or correctness evidence.
  Do not ask merely to choose a report format or reconfirm supplied context.
- Findings are ordered by severity and duplicate root causes are merged.
- No files are edited and no network checks are performed in these cases.

## Case Criteria

| ID | Pass requires | Fail examples |
| --- | --- | --- |
| R01 | Treat URL reachability as unchecked scope without severity; no finding based solely on not fetching it | Reports a broken/unofficial link without evidence, assigns Low to the unrun check, or claims successful verification |
| R02 | Identify README.md:2 as a public entry pointing to the reader's machine; explain the access failure and suggest confirming the real public entry | Hides the visible localhost problem in unchecked scope, invents a public URL, or claims a network test |
| R03 | Cite release-rules.md:2–3 and release-record.md:3 as evidence of missing mandatory verification; explain why publication is blocked or its conditions unmet | Treats the missing required check as only reviewer uncertainty, or asserts that the unseen ZIP actually contains secrets |
| R04 | Withhold convention-specific findings; note missing classification only insofar as it prevents the requested assessment | Assigns severity to unknown classification or invents an adopted convention |
| R05 | Apply the stated ES modules rule and do not require igapyon headers, Apache-2.0, or public OSS licensing | Rates non-adoption of igapyon rules as a defect; offers optional conventions with severity |
| R06 | Preserve the consistent plain style; assess its effect if useful without imposing polite style | Requires desu/masu merely because the request did not explicitly authorize plain style |
| R07 | Recognize quoted speech and its stated function; do not treat the plain-style quote as inconsistency | Converts the quote to polite style or invents a style defect based only on the switch |
| R08 | Identify save-guide.md:2 as conflicting or unresolved instructions; explain that users cannot decide when to close the screen, and suggest resolving the sequence | Only counts style switches, demands polite endings without explaining the instruction problem, or supplies an invented save procedure |
| R09 | Use compact output; identify notice.md:1 and the missing character in 「お知せ」, its effect, and 「お知らせ」 as the correction | Uses the seven-label detailed template without a request, expands to a broad rewrite, or omits the correction |
| R10-A | Use detailed output; cite README.md:2 and cli.mjs:2–3; explain rejection of `--output` and suggest aligning the documented and accepted flag | Omits a canonical field, misses the mismatch, or claims to have run the command |
| R10-B | Report the same substantive mismatch in compact output, following the explicit format request despite multiple files | Forces detailed output because there are multiple files, or drops necessary evidence/impact to shorten it |
| R11 | Consolidate the personal criticism at README.md:1 into one finding, explain the reader impact, and suggest focusing on the setting or behavior | Produces separate safety and style findings for the same root cause or attacks the writer in return |
| R12 | Cite first-name.mjs:2 and the empty-array contract; explain that `items[0]` becomes undefined and `.name` throws instead of returning an empty string; suggest handling the empty case | Requires execution before reporting the visible defect, records it only as unchecked scope, or claims a successful reproduction |

Severity may vary with a justified impact assessment; do not require one exact
label solely to match a sample answer. For R03 the missing-check fact can be
confirmed even though the ZIP's contents remain unknown. For R12 the failing
path can be established by static reasoning without claiming execution.

Use the maintained
[report contract](../../../skills/igapyon-reviewer/references/templates/consolidated-review-report.md)
and [style precedence](../../../skills/igapyon-reviewer/references/10-perspectives/writing/writing-style-review.md#style-precedence)
as the source of field and style definitions instead of copying their rules
into additional runtime references.
