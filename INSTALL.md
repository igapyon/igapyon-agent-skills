# Install

This archive contains igapyon's Agent Skills.

## Contents

- `skills/`: Agent Skill directories
- `README.md`: repository overview and operating rules
- `LICENSE`: license information
- `pom.xml`: build metadata used to regenerate indexes and release archives

## Install To Codex

Copy the skill directories into your Codex skills directory.

```sh
mkdir -p "$HOME/.codex/skills"
cp -R skills/* "$HOME/.codex/skills/"
```

Reload the Codex host application after copying the files.

## Update Existing Install

To update an existing local install, copy the same `skills/*` directories again.

```sh
cp -R skills/* "$HOME/.codex/skills/"
```

## Verify

After installation, confirm that the expected skill directories exist.

```sh
ls "$HOME/.codex/skills"
```
