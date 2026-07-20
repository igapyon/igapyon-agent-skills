# GitHub Release Tag Handoff

Use this workflow when miku-scm reports a recommended tag after push or merge, or when the human asks what to do with that tag.

## Default miku-soft Operation

Treat GitHub's Release creation screen as the normal place where the human creates or selects the release tag. The assistant supplies the recommended exact tag name, but does not create the tag or publish the Release.

After a PR is merged:

1. Resolve the committed version from the refreshed base branch.
2. Derive the exact recommended tag using [version-tag-release-audit.md](version-tag-release-audit.md).
3. Report `推奨タグ名: <tag>`.
4. Tell the human to use GitHub's Release creation screen and select `Create new tag` when the tag does not yet exist, targeting the merged release commit or repository-defined release branch.
5. State clearly that no tag or Release was created by the assistant.

Do not describe local `git tag`, `git push origin <tag>`, or `git push --tags` as the normal next operation. A feature-branch push and a release-tag publication are separate operations; never say merely `pushしていない` when the unresolved item is specifically the tag.

## Existing Tags

Creating a new tag and moving, replacing, or deleting an existing tag are materially different operations.

- If the recommended exact tag is absent, hand off creation through GitHub's Release UI.
- If it already exists at the expected commit, report it as existing and do not recreate it.
- If it exists at a different commit, report the mismatch and stop. Do not suggest silently rewriting it in GitHub or locally.
- If the human says `タグを書き換える` and it is unclear whether they mean writing a new tag name or moving an existing tag, ask which operation they intend before giving mutation guidance.

## Relation to the Next Work Branch

The recommended-tag check after merge is advisory. A missing tag does not block creation of the next work branch. Complete the documented next-branch workflow, then report the missing tag as a separate GitHub UI handoff.

Do not imply that tag creation must occur before the next work branch unless the repository explicitly documents that ordering.

## Boundaries

This workflow is a human handoff, not a tag-mutation workflow. It does not authorize local tag creation, tag push, moving or deleting an existing tag, creating or publishing a GitHub Release, opening a browser, or submitting a GitHub form.

If the human explicitly requests an automated local or remote tag mutation, require a separately documented mutation workflow and its immediate authorization gate. Do not reinterpret a merge report, a recommended tag, or an `ok push` for a feature branch as tag-mutation approval.

## Official Reference

- [Managing releases in a repository](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
