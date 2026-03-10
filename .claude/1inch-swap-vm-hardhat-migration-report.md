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
- Optimizer settings (enabled, runs, via_ir, yul details)
- `fs_permissions` → `fsPermissions` (read-write directories)

**Features not used by this project:**
- Network configuration / RPC endpoints — no `[rpc_endpoints]` in `foundry.toml`
- Etherscan verification — no `[etherscan]` section in `foundry.toml`
- Deployment scripts (`forge script`) — project has `script/` directory but scripts are Foundry-specific `.s.sol` files (no Hardhat equivalent needed for dry-run)
- FFI — not enabled
- Inline test config (`forge-config:` comments) — not used

## 3. Workarounds Applied

- **`pnpm.overrides` for `@openzeppelin/contracts`:** Forced all transitive dependencies to use `@openzeppelin/contracts@5.4.0`. Without this, pnpm's strict isolation causes `@1inch/solidity-utils` to resolve `IERC20` from OZ 5.1.0, while the project uses OZ 5.4.0. Solidity treats these as different types, breaking `using SafeERC20 for IERC20` declarations.
- **`patch-package` for `@1inch/solidity-utils`:** Added `"./contracts/*.sol"` and `"./test/contracts/*.sol"` to the package's `exports` field. Without this, Hardhat 3's Node.js `exports` field enforcement blocks Solidity file imports from the package (HHE902).
- **`"type": "module"` added to `package.json`:** Required by Hardhat 3 (ESM). No existing CommonJS files were affected.
- **Import path rewrites:** None needed — all imports use relative paths or package names.

## 4. Next Steps

1. **Upstream `@1inch/solidity-utils` exports fix** — file an issue or PR to add `"./contracts/*.sol"` to the package's `exports` field, eliminating the `patch-package` workaround. This affects all Hardhat 3 consumers of the package.
2. **Gas snapshot alternative** — monitor [#7769](https://github.com/NomicFoundation/hardhat/issues/7769) for Hardhat support. In the interim, gas costs can be observed from test output but automated snapshot regression is unavailable.
3. **CI integration** — add `pnpm run build-hardhat` and `pnpm run test-hardhat` to CI alongside existing Forge commands to run both toolchains in parallel.
