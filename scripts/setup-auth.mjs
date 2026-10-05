import { spawnSync } from "node:child_process";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
const run = (args, input) => {
  const result = spawnSync("bunx", ["convex", ...args], {
    encoding: "utf8",
    input,
  });
  if (result.status !== 0)
    throw new Error(result.stderr || "Convex command failed");
  return result.stdout;
};
const names = run(["env", "list", "--names-only"]);
if (names.includes("JWT_PRIVATE_KEY") || names.includes("JWKS")) {
  if (!names.includes("JWT_PRIVATE_KEY") || !names.includes("JWKS"))
    throw new Error(
      "Only one auth key is configured. Repair the key pair in Convex settings.",
    );
  console.log("Auth signing keys are already configured; preserving them.");
} else {
  const keys = await generateKeyPair("RS256", { extractable: true });
  const privateKey = (await exportPKCS8(keys.privateKey))
    .trimEnd()
    .replace(/\n/g, " ");
  const jwks = JSON.stringify({
    keys: [{ use: "sig", ...(await exportJWK(keys.publicKey)) }],
  });
  run(["env", "set", "JWT_PRIVATE_KEY"], privateKey);
  run(["env", "set", "JWKS"], jwks);
  console.log("Auth signing keys configured on the development deployment.");
}
