// Mock WASM module for CI tests where engine-wasm is not built
export const wasmAvailable = false;

export async function initWasAI() {
  return { wasmAvailable: false };
}

export function evaluatePosition() {
  return { score: 0, depth: 0, nodes: 0, pv: [] };
}

export function findBestMove() {
  return null;
}

export function getWasmStatus() {
  return { loaded: false, error: 'WASM not built in CI test environment' };
}

export default {
  wasmAvailable: false,
  initWasAI,
  evaluatePosition,
  findBestMove,
  getWasmStatus,
};
