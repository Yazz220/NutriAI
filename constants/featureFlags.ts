export function isNoshContextModelV2Enabled(): boolean {
  return process.env.EXPO_PUBLIC_NOSH_CONTEXT_MODEL_V2 === 'true';
}
