# 1inch-swap-vm: Hardhat 3 Migration Report

**Hardhat version installed:** `^3.7.0`
**Migration date:** 2026-06-01
**Foundry analysis:** [Foundry analysis](1inch-swap-vm-foundry-migration-analysis.md)

---

**Verdict:** 🟡 **Successful with gaps**

All 706 Solidity tests compile and pass under Hardhat 3.7.0, and gas-snapshot gas values are byte-identical to Forge. The two non-blocking gaps are auxiliary Forge features the project uses outside the compile/test loop: `.s.sol` deployment scripting and `forge fmt`.

> **Update note (was ✅ Successful on 2026-04-06):** Upgraded Hardhat `3.3.0 → 3.7.0`; all tests still pass. The verdict moved to 🟡 because this pass classifies the project's actively-used `vm.startBroadcast` deployment scripts and `forge fmt` lint/format scripts as gaps (the prior report had scoped them out). Nothing regressed — these features were always Foundry-only.

### Blockers

None — all 706 Solidity tests pass; no tests were commented out, no EDR/Hardhat bugs found.

### Notable gaps (non-blocking, medium+ impact)

- 🚩 `Deployment scripting` — 3 `.s.sol` scripts use `vm.startBroadcast`; no Hardhat equivalent for `forge script`. Affects the deployment workflow only, not the dry-run scope (compile + Solidity tests).

## 1. Test Count Comparison

| Metric | Count |
|--------|-------|
| `function test*` declarations in `.t.sol` files | 474 |
| Tests Hardhat ran (passing) | 706 |
| Tests failing | 0 |

The 706 > 474 discrepancy is expected: parametrized invariant contracts (`TinyLiquidity`, `HugeLiquidity`, `DustAmounts`, etc., under `test/invariants/{xyc,pegged,concentrate}/`) inherit shared base test functions and re-run them with different constructor parameters, inflating the runtime count. (Counts grew from the prior report's 469 / 701 as the repo added tests; both still pass.)

## 2. Feature Parity

### Gaps, bugs & partial support

| Feature | Parity | Impact | Workaround / Notes |
| ------- | ------ | ------ | ------------------ |
| `Deployment scripting` | 🚩 **Gap** | **Medium** — 3 deploy scripts (`DeployAquaSwapVMRouter.s.sol`, `DeploySwapVMRouter.s.sol`, `DeployLimitSwapVMRouter.s.sol`) use `vm.startBroadcast`; these cheatcodes only function inside `forge script`. Deployment workflow is untested under Hardhat. Does not block the compile/test dry-run. | No tracking issue found — consider filing one. Hardhat's equivalent is Hardhat Ignition (a different, declarative paradigm); the practical path is to keep `forge script` for deployment or port the scripts to Ignition modules. |
| `Built-in formatter` | 🟡 **Partial** | **Low** — `lint` (`forge fmt --check`) and `format` (`forge fmt`) scripts have no built-in Hardhat formatter. | `forge fmt` works standalone regardless of build tool, so it keeps working; `prettier-plugin-solidity` is a mature alternative if a Hardhat-native formatter is desired. |

> `Gas snapshots` is **not** a gap — see the Full-parity note below. Hardhat reproduces Forge's gas values exactly; only the committed whole-suite file's separator format differs by design.

### Full parity

These features work equivalently in Hardhat 3.7.0:

- Solidity compilation (`forge build` → `npx hardhat compile`) — 149 files, solc 0.8.30, evm target `cancun`
- Solidity tests (`forge test` → `npx hardhat test solidity`) — all 706 tests passing
- forge-std cheatcodes (`vm.*`) — all used cheatcodes work, including the (deprecated-but-functional) `snapshot()` / `revertTo()` used across invariant tests
- Fuzz testing — works with default settings (`runs: 256`)
- Invariant testing — works across all parametrized contracts
- Optimizer settings — enabled, `runs: 700`, `viaIR`, `evmVersion: cancun`, and full `yul`/`yulDetails` (`optimizerSteps`) carried over
- `fs_permissions` → `fsPermissions.dangerouslyReadWriteDirectory` (`./deployments`, `./config`)
- **Gas snapshots** (`forge snapshot` → `npx hardhat test solidity --snapshot` / `--snapshot-check`) — verified this run (Case 1: inline cheatcodes + committed baseline):
  - The committed Forge-format `.gas-snapshot` (705 entries, `Contract:function()`) makes `--snapshot-check` fail with `HHE803: Invalid format` because Hardhat writes/reads `Contract#function`. **This is by design, not a gap or bug** (confirmed [hardhat#8357](https://github.com/NomicFoundation/hardhat/issues/8357), open).
  - Verified gas-value equivalence directly: regenerated the file with `--snapshot` (705 entries, no FQN prefix — no duplicate-name issue) and separator-normalized diff against the committed Forge baseline → **all 705 standard `(gas:)` values byte-identical**. The only delta was one fuzz line (`UnwrapWethTest#test_UnwrapWeth_Fuzz`, μ/~ differ at equal `runs: 256`) — seed nondeterminism, not a gas change.
  - The inline `snapshots/AMMGas.json` / `snapshots/LimitSwapGas.json` files are cross-compatible and were **not** modified by `--snapshot`.
  - All snapshot files were restored after verification (dry-run constraint preserved).

**Features not used by this project:**

- Network configuration / RPC endpoints — no `[rpc_endpoints]` in `foundry.toml`
- Etherscan verification — no `[etherscan]` section in `foundry.toml`
- FFI — not enabled
- Inline test config (`forge-config:` comments) — none in the codebase (re-verified)
- EIP-712 cheatcodes / `[bind_json]` — not used (no `vm.eip712Hash*`, no `JsonBindings`)

## 3. Workarounds Applied

- **`pnpm.overrides` for `@openzeppelin/contracts` (→ `5.4.0`):** Forces all transitive copies to a single OZ version. Root cause: Forge uses flat `remappings.txt` where `@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/` applies globally, so every package sees one `IERC20`. Hardhat 3 uses Node.js resolution, which respects pnpm's strict per-package isolation — `@1inch/solidity-utils` would resolve its own declared OZ version while the project resolves `5.4.0`, and Solidity treats identically-named types from different paths as incompatible, breaking `using SafeERC20 for IERC20`. The override reproduces Forge's flat resolution at the package-manager level.
- **`patch-package` for `@1inch/solidity-utils`:** Adds `"./contracts/*.sol"` and `"./test/contracts/*.sol"` to the package's `exports` field. Without it, Hardhat 3's `exports`-field enforcement blocks Solidity imports from the package (HHE902). Forge avoids this because remappings bypass `exports` entirely. **This update renamed the patch `@1inch+solidity-utils+6.9.5.patch` → `+6.9.7.patch`** to match the now-installed `6.9.7` (it had been applying with a version-mismatch warning); it now applies cleanly (`@1inch/solidity-utils@6.9.7 ✔`).
- **`"type": "module"` in `package.json`:** Required by Hardhat 3 (ESM). No CommonJS files affected.
- **`evmVersion: "cancun"` explicit in `hardhat.config.ts`:** `foundry.toml` does not set `evm_version`; Forge auto-detects the latest for solc 0.8.30 (`cancun`), while Hardhat defers to the solc default. Set explicitly to keep both toolchains on the same EVM target.
- **`optimizer.runs` reconciled to `700`:** `foundry.toml` had drifted to `optimizer_runs = 700` while `hardhat.config.ts` (and the analysis file) still read `10_000`. Corrected the config and analysis to `700` so the two toolchains compile identically — this is what made the gas values match exactly.
- **`remappings.txt`:** Kept for Forge compatibility only. Hardhat 3 resolves all of the project's imports via Node.js resolution without it (all 706 tests pass), and project-level remappings do not propagate into `node_modules`.
- **Import path rewrites:** None needed — all imports use relative paths or package names.

## 4. Next Steps

1. **Decide the deployment-scripting path (Medium impact)** — the 3 `.s.sol` scripts use `vm.startBroadcast`, which has no Hardhat equivalent. Either keep `forge script` for deployments (both toolchains coexist) or port them to Hardhat Ignition modules. Consider filing a tracking issue if a `forge script` shim is desired.
2. **Regenerate the gas-snapshot baseline under Hardhat for CI use (Low/Medium)** — `npx hardhat test solidity --snapshot` rewrites `.gas-snapshot` in Hardhat's `#` format. Forge and Hardhat cannot share the one file (hardcoded path, mutually unreadable separators per [hardhat#8357](https://github.com/NomicFoundation/hardhat/issues/8357)); keep a per-toolchain baseline if both are run in CI. Gas values are identical, so no thresholds change.
3. **Upstream the `@1inch/solidity-utils` exports fix (Medium)** — add `"./contracts/*.sol"` to the package's `exports` field upstream to eliminate the `patch-package` workaround for all Hardhat 3 consumers.
4. **CI integration (Low)** — add `pnpm run build-hardhat` / `pnpm run test-hardhat` (and `snapshot-hardhat` / `snapshot-check-hardhat` against a Hardhat-format baseline) alongside the existing Forge commands to run both toolchains.
