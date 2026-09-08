const sha = /^[0-9a-f]{40}$/;
const identifier = (value) => /^[1-9]\d*$/.test(value ?? '') && Number.isSafeInteger(Number(value));
const fields = [
  ['productSha', 'PRODUCT_SHA', (value) => sha.test(value ?? '')],
  ['runId', 'PRODUCT_RUN_ID', identifier],
  ['artifactId', 'PRODUCT_ARTIFACT_ID', identifier],
  ['artifactDigest', 'PRODUCT_ARTIFACT_DIGEST', (value) => /^sha256:[0-9a-f]{64}$/.test(value ?? '')],
];

export function reuseInputsFromEnv(env = process.env) {
  return Object.fromEntries(fields.map(([name, variable]) => [name, env[variable]]));
}

export function invalidReuseFields(input) {
  return fields.filter(([name, , valid]) => !valid(input[name])).map(([name]) => name);
}

export function assertReuseInputs(input) {
  const invalid = invalidReuseFields(input);
  if (invalid.length) throw new Error(`Invalid installer reuse inputs: ${invalid.join(', ')}; exact SHA, positive integer IDs and sha256 digest are required`);
}
