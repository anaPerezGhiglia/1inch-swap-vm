# Foundry Migration Analysis: 1inch-swap-vm

## foundry.toml Settings

### [profile.default]
- `solc_version = "0.8.30"`
- `optimizer = true`
- `optimizer_runs = 700`
- `via_ir = true`
- `fs_permissions`: read-write on `./deployments` and `./config`

### [profile.default.optimizer_details]
- `yul = true`
- `yulDetails = { stackAllocation = true, optimizerSteps = "dhfoDgvulfnTUtnIf[xa[r]scLMcCTUtTOntnfDIul]jmul[jul] VcTOcul jmul" }`

### [profile.ci]
- Same compiler settings as default (`solc_version`, `optimizer`, `optimizer_runs = 700`, `via_ir`)
- Same `optimizer_details` as default
- No test-specific overrides — identical to default

### [fmt]
- Formatting config only — not relevant to Hardhat migration

## Remappings (remappings.txt)
- `forge-std/=node_modules/forge-std/src/`
- `@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/`
- `@1inch/solidity-utils/=node_modules/@1inch/solidity-utils/`
- `@1inch/aqua/=node_modules/@1inch/aqua/`

## Dependencies
All npm-based (no git submodules, no `lib/` directory):
- `@1inch/aqua`: `github:1inch/aqua#0.1.0`
- `@1inch/solidity-utils`: `6.9.7`
- `@openzeppelin/contracts`: `5.4.0`
- `forge-std`: `github:foundry-rs/forge-std#v1.11.0`

## Directory Structure
- Source: `src/` (instructions, interfaces, libs, opcodes, routers, SwapVM.sol)
- Test: `test/` (474 `function test*` declarations across unit, invariant, and gas tests)
- Script: `script/` (3 deployment scripts + utils) — all 3 `.s.sol` scripts use `vm.startBroadcast` (active Forge deployment scripting; no direct Hardhat equivalent)

## Inline Test Config
- No `forge-config:` directives found in any `.sol` files (re-verified against Hardhat 3.7.0 — function-level inline config is now broadly supported, but the project uses none)

## Absolute Imports
- None found — all imports use relative paths or package names

## Forge-Dependent package.json Scripts
| Script | Command | Hardhat equivalent? |
|--------|---------|-------------------|
| `test` | `forge test` | Yes |
| `build` | `forge build` | Yes |
| `lint` | `forge fmt --check` | No (Foundry-only) |
| `format` | `forge fmt` | No (Foundry-only) |
| `snapshot` | `forge snapshot --force --no-match-test "testFuzz_*"` | Yes (`npx hardhat test solidity --snapshot` / `--snapshot-check`) |

## Package Manager
- **`pnpm`** (locked in by the original migration; `pnpm-lock.yaml` present and most recently modified). A `yarn.lock` also exists but is not used — do not mix package managers. `pnpm.overrides` is used to force a single `@openzeppelin/contracts@5.4.0` across transitive deps.

## Gas Snapshots
- Project uses inline gas-snapshot cheatcodes (`vm.snapshotGasLastCall` / `vm.startSnapshotGas` / `vm.stopSnapshotGas`, 116 call sites) writing `snapshots/AMMGas.json` + `snapshots/LimitSwapGas.json`, **and** a committed whole-suite `.gas-snapshot` (705 entries, Forge format).
- The `snapshot` npm script is `forge snapshot --force --no-match-test "testFuzz_*"`.
