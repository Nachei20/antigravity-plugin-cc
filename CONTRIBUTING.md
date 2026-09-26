# Contributing to Antigravity Plugin for Claude Code

Thank you for your interest in contributing to `antigravity-plugin-cc`! We welcome contributions, bug fixes, feature requests, and documentation enhancements from the community.

---

## Development Setup

### Prerequisites

* **Node.js**: Version 18.18.0 or newer.
* **Git**: Version 2.x+.
* **Google Antigravity CLI (`agy`)**: Installed and authenticated on your local machine (`agy.exe` on Windows or `agy` on macOS/Linux).
* **Claude Code CLI**: Installed if testing live integration.

### Quick Start

1. **Fork and Clone** the repository:
   ```bash
   git clone https://github.com/<your-username>/antigravity-plugin-cc.git
   cd antigravity-plugin-cc
   ```

2. **Verify Setup**:
   ```bash
   # Run the companion setup diagnostics
   npm run test:setup
   ```

3. **Run the Test Suite**:
   ```bash
   # Executes the native Node.js integration tests
   npm test
   ```

---

## Project Structure

```text
antigravity-plugin-cc/
├── .claude-plugin/
│   └── marketplace.json          # Marketplace catalog (owner + plugin list)
├── plugins/antigravity/          # The plugin itself
│   ├── .claude-plugin/plugin.json  # Metadata only: name, version, author, license
│   ├── commands/                 # Slash commands (/antigravity:*), auto-discovered
│   ├── agents/                   # Subagents, auto-discovered
│   ├── skills/<name>/SKILL.md    # Skills, auto-discovered
│   ├── hooks/hooks.json          # Lifecycle hooks, auto-discovered
│   ├── scripts/lifecycle.mjs     # Hook entry point
│   └── bin/agy-companion.mjs     # Node.js runner (git diff + agy CLI); also the npm `bin` entry
├── scripts/                      # Test runner and version sync
├── tests/                        # Automated integration tests
└── README.md                     # Main documentation
```

---

## Adding a New Command

1. Create a new command definition under `plugins/antigravity/commands/<your-command>.md`.
2. Do **not** register it in `plugin.json`: Claude Code discovers `commands/`, `agents/`, `skills/` and `hooks/hooks.json` on its own, and a `"commands"` name→file map fails `claude plugin validate`.
3. Add any underlying CLI routing logic to `plugins/antigravity/bin/agy-companion.mjs`.
4. Document the command in `README.md`.
5. Add the command name to the list in `tests/manifests.test.mjs`, plus coverage in `tests/companion.test.mjs`.
6. Run `npm test` and `claude plugin validate .` to ensure all checks pass.

---

## Submitting a Pull Request

1. **Create a Feature Branch**:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/your-bug-description
   ```

2. **Commit Your Changes**:
   Use clear, conventional commit messages:
   ```bash
   git commit -m "feat: add support for streaming responses"
   ```

3. **Run Tests**:
   Ensure `npm test` passes completely:
   ```bash
   npm test
   ```

4. **Open a Pull Request**:
   Push your branch to your fork and open a PR against `main`. Fill out the PR template thoroughly. All CI checks must pass before merging.
