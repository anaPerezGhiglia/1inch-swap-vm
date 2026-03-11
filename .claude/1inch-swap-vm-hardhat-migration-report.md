# 1inch-swap-vm: Hardhat 3 Migration Report

**Hardhat version installed:** `^3.1.11`
**Migration date:** 2026-03-10
**Foundry analysis:** [Foundry analysis](1inch-swap-vm-foundry-migration-analysis.md)

---

**Verdict:** 🟡 **Successful with gaps**

### Notable gaps (non-blocking, medium+ impact)

- 🚩 No equivalent for `forge snapshot` — gas snapshot workflow unavailable ([#7769](https://github.com/NomicFoundation/hardhat/issues/7769))

## 1. Test Count Comparison

| Metric | Count |
|--------|-------|
| `function test*` declarations in `.t.sol` files | 469 |
| Tests Hardhat ran (passing) | 701 |
| Tests failing | 0 |

The 701 > 469 discrepancy is expected: many invariant test contracts inherit base test functions and run them with different constructor parameters (e.g., `TinyLiquidity`, `HugeLiquidity`, `SmallAmounts`, etc. all inherit from shared invariant base contracts). Each subcontract re-runs the inherited tests, inflating the runtime count.

## 2. Feature Parity

### Gaps, bugs & partial support

| Feature | Parity | Impact | Workaround / Notes |
|---|---|---|---|
| Gas snapshots (`forge snapshot`) | 🚩 **Gap** | **Medium** — tests run but snapshots can't be generated | [#7769](https://github.com/NomicFoundation/hardhat/issues/7769) — no workaround currently |
| `forge fmt` (lint/format) | 🚩 **Gap** | **Low** — formatting only; no test impact | Projects typically use prettier + solhint instead |

### Full parity

These features work equivalently in Hardhat 3:

- Solidity compilation (`forge build` → `npx hardhat compile`)
- Solidity tests (`forge test` → `npx hardhat test solidity`) — all 701 tests passing
- forge-std cheatcodes (`vm.*`) — all used cheatcodes work correctly
- Fuzz testing — works with default settings
- Invariant testing — works across all parametrized contracts
- Optimizer settings (enabled, runs, via_ir, evmVersion, yul details)
- `fs_permissions` → `fsPermissions` (read-write directories)

**Features not used by this project:**
- Network configuration / RPC endpoints — no `[rpc_endpoints]` in `foundry.toml`
- Etherscan verification — no `[etherscan]` section in `foundry.toml`
- Deployment scripts (`forge script`) — project has `script/` directory but scripts are Foundry-specific `.s.sol` files (no Hardhat equivalent needed for dry-run)
- FFI — not enabled
- Inline test config (`forge-config:` comments) — not used

## 3. Workarounds Applied

- **`pnpm.overrides` for `@openzeppelin/contracts`:** Forced all transitive dependencies to use `@openzeppelin/contracts@5.4.0`. This workaround is needed because of a fundamental difference in how Forge and Hardhat 3 resolve Solidity imports:

  - **Forge** uses a flat remapping system (`remappings.txt`). The project's `@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/` remapping maps all `@openzeppelin/contracts/` imports — regardless of which package they originate from — to a single directory. Every package sees the same `IERC20` type. ([Forge remappings docs](https://book.getfoundry.sh/reference/forge/forge-remappings/))
  - **Hardhat 3** uses Node.js module resolution, which respects pnpm's strict per-package isolation ([Hardhat 3 dependencies docs](https://hardhat.org/docs/guides/writing-contracts/dependencies)). Under pnpm, `@1inch/solidity-utils` resolves `@openzeppelin/contracts` to its own declared version (5.1.0), while the project resolves to 5.4.0. Hardhat 3 correctly resolves both versions — but that is precisely the problem: Solidity treats `IERC20` from OZ 5.1.0 and `IERC20` from OZ 5.4.0 as **different types**, breaking `using SafeERC20 for IERC20` declarations.

  The `pnpm.overrides` forces pnpm to flatten all copies to a single version, effectively reproducing Forge's flat remapping behavior at the package manager level.

  **Note on `remappings.txt`:** Hardhat 3 loads `remappings.txt` but scopes each file to its directory — the project-level remappings [do not propagate into `node_modules`](https://hardhat.org/docs/guides/writing-contracts/remappings). So the `@openzeppelin/contracts/` remapping in `remappings.txt` does not help here: it only affects the project's own `.sol` files, not imports inside `@1inch/solidity-utils`. Furthermore, `remappings.txt` is entirely unnecessary for Hardhat 3 — all 701 tests pass without it. Hardhat 3's Node.js resolution handles all import paths that the remappings currently define. The file should be kept for Forge compatibility only.
- **`patch-package` for `@1inch/solidity-utils`:** Added `"./contracts/*.sol"` and `"./test/contracts/*.sol"` to the package's `exports` field. Without this, Hardhat 3's Node.js `exports` field enforcement blocks Solidity file imports from the package (HHE902).
- **`"type": "module"` added to `package.json`:** Required by Hardhat 3 (ESM). No existing CommonJS files were affected.
- **`evmVersion: "cancun"` explicitly set in `hardhat.config.ts`:** `foundry.toml` does not set `evm_version`, but Forge auto-detects the latest EVM version supported by the configured solc version. For solc 0.8.30, that is `cancun`. Hardhat defers to the solc default, which may differ. Setting it explicitly ensures both toolchains compile against the same EVM target.
- **Import path rewrites:** None needed — all imports use relative paths or package names.

## 4. Next Steps

1. **Upstream `@1inch/solidity-utils` exports fix** — file an issue or PR to add `"./contracts/*.sol"` to the package's `exports` field, eliminating the `patch-package` workaround. This affects all Hardhat 3 consumers of the package.
2. **Gas snapshot alternative** — monitor [#7769](https://github.com/NomicFoundation/hardhat/issues/7769) for Hardhat support. In the interim, gas costs can be observed from test output but automated snapshot regression is unavailable.
3. **CI integration** — add `pnpm run build-hardhat` and `pnpm run test-hardhat` to CI alongside existing Forge commands to run both toolchains in parallel.
