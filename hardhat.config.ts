import { defineConfig } from "hardhat/config";

export default defineConfig({
  solidity: {
    compilers: [
      {
        version: "0.8.30",
        settings: {
          optimizer: {
            enabled: true,
            runs: 700,
            details: {
              yul: true,
              yulDetails: {
                stackAllocation: true,
                optimizerSteps:
                  "dhfoDgvulfnTUtnIf[xa[r]scLMcCTUtTOntnfDIul]jmul[jul] VcTOcul jmul",
              },
            },
          },
          viaIR: true,
          evmVersion: "cancun",
        },
      },
    ],
  },
  paths: {
    sources: "./src",
    tests: "./test",
  },
  test: {
    solidity: {
      fsPermissions: {
        dangerouslyReadWriteDirectory: ["./deployments", "./config"],
      },
    },
  },
  // Foundry-only settings (no Hardhat equivalent):
  // - [fmt] section — Foundry formatter config; projects typically use prettier or solhint
  // - `out = "out"` — Hardhat uses its own `artifacts/` + `cache/` dirs
  // - [profile.ci] — identical compiler settings to [profile.default]; no separate Hardhat profile needed
  // Gas snapshots: supported via `npx hardhat test solidity --snapshot` / `--snapshot-check`
});
