# Foundry Migration Analysis: 1inch-swap-vm

## foundry.toml Settings

### [profile.default]
- `solc_version = "0.8.30"`
- `optimizer = true`
- `optimizer_runs = 10_000`
- `via_ir = true`
- `fs_permissions`: read-write on `./deployments` and `./config`

### [profile.default.optimizer_details]
- `yul = true`
- `yulDetails = { stackAllocation = true, optimizerSteps = "dhfoDgvulfnTUtnIf[xa[r]scLMcCTUtTOntnfDIul]jmul[jul] VcTOcul jmul" }`

### [profile.ci]
- Same compiler settings as default (`solc_version`, `optimizer`, `optimizer_runs`, `via_ir`)
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
- `@1inch/solidity-utils`: `6.9.5`
- `@openzeppelin/contracts`: `5.4.0`
- `forge-std`: `github:foundry-rs/forge-std#v1.11.0`

## Directory Structure
- Source: `src/` (instructions, interfaces, libs, opcodes, routers, SwapVM.sol)
- Test: `test/` (469 test functions across unit, invariant, and gas tests)
- Script: `script/` (3 deployment scripts + utils)

## Inline Test Config
- No `forge-config:` directives found in any `.sol` files

## Absolute Imports
- None found — all imports use relative paths or package names

## Forge-Dependent package.json Scripts
| Script | Command | Hardhat equivalent? |
|--------|---------|-------------------|
| `test` | `forge test` | Yes |
| `build` | `forge build` | Yes |
| `lint` | `forge fmt --check` | No (Foundry-only) |
| `format` | `forge fmt` | No (Foundry-only) |
| `snapshot` | `forge snapshot --force --no-match-test "testFuzz_*"` | No ([#7769](https://github.com/NomicFoundation/hardhat/issues/7769)) |

## Package Manager
- **No lockfile exists** — using `pnpm` as default
