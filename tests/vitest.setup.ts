import { TextDecoder, TextEncoder } from 'util';
import { vi, afterEach } from 'vitest';

// --- Global type augmentation ---
declare const globalThis: typeof globalThis & {
  TextDecoder: typeof TextDecoder;
  TextEncoder: typeof TextEncoder;
  fetch: typeof fetch;
  AudioContext: typeof AudioContext;
  webkitAudioContext: typeof AudioContext;
  OffscreenCanvas: any;
  requestAnimationFrame: typeof requestAnimationFrame;
  cancelAnimationFrame: typeof cancelAnimationFrame;
  localStorage: Storage;
  sessionStorage: Storage;
  indexedDB: IDBFactory;
  ResizeObserver: any;
  IntersectionObserver: any;
  matchMedia: any;
  URL: URL;
  navigator: Navigator & { clipboard: any };
  Worker: any;
  console: Console;
};

// --- Global Text Encoder/Decoder ---
globalThis.TextDecoder = TextDecoder;
globalThis.TextEncoder = TextEncoder;

// --- Global Fetch Mock ---
globalThis.fetch = vi.fn((url: string | URL | Request) => {
  const urlStr = url.toString();
  // Mock Google Fonts CSS response
  if (urlStr.includes('fonts.googleapis.com')) {
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve('/* mocked google fonts css */'),
    } as Response);
  }
  // Mock local CSS/JS/TS requests (happy-dom tries to fetch from localhost:3000 in CI)
  if (urlStr.includes('localhost:3000') && (urlStr.includes('.css') || urlStr.includes('/css/') || urlStr.includes('.js') || urlStr.includes('.ts') || urlStr.includes('/js/'))) {
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve('/* mocked local asset */'),
    } as Response);
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  } as Response);
});
// --- AudioContext Mock (for trischach sounds) ---
class MockAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  sampleRate = 44100;
  destination = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  listener = { positionX: { value: 0 }, positionY: { value: 0 }, positionZ: { value: 0 } };

  createOscillator() {
    const osc = {
      type: 'sine',
      frequency: { 
        value: 440, 
        setValueAtTime: vi.fn(), 
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };
    return osc;
  }

  createGain() {
    return {
      gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };
  }

  createBuffer() {
    return {
      length: 0,
      duration: 0,
      sampleRate: 44100,
      numberOfChannels: 2,
      getChannelData: vi.fn(() => new Float32Array(44100)),
    };
  }

  decodeAudioData() {
    return Promise.resolve(this.createBuffer());
  }

  resume() {
    this.state = 'running';
    return Promise.resolve();
  }

  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }

  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}

// Assign the mock class directly to global scope
globalThis.AudioContext = MockAudioContext;
globalThis.webkitAudioContext = MockAudioContext;

// Also set on window for browser-like environment
if (typeof window !== 'undefined') {
  window.AudioContext = MockAudioContext;
  window.webkitAudioContext = MockAudioContext;
}

// --- Canvas & WebGL Mocks ---
const mockCanvasContext2D: CanvasRenderingContext2D = {
  canvas: { width: 800, height: 600 },
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 10 })),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createPattern: vi.fn(),
  lineWidth: 1,
  strokeStyle: '#000',
  fillStyle: '#000',
  font: '10px sans-serif',
  textAlign: 'start',
  textBaseline: 'alphabetic',
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  shadowColor: 'transparent',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  lineCap: 'butt',
  lineJoin: 'miter',
  miterLimit: 10,
  imageSmoothingEnabled: true,
  // Required by CanvasRenderingContext2D
  direction: 'ltr',
  filter: 'none',
  imageSmoothingQuality: 'low',
  lineDashOffset: 0,
  // Additional required methods
  getLineDash: vi.fn(() => []),
  setLineDash: vi.fn(),
  clip: vi.fn(),
  isPointInPath: vi.fn(() => false),
  isPointInStroke: vi.fn(() => false),
  transform: vi.fn(),
  quadraticCurveTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  rect: vi.fn(),
  closePath: vi.fn(),
  createImageData: vi.fn(() => new ImageData(1, 1)),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createConicGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  getContextAttributes: vi.fn(),
  getTransform: vi.fn(() => new DOMMatrix()),
  resetTransform: vi.fn(),
} as unknown as CanvasRenderingContext2D;

const mockWebGLContext: WebGLRenderingContext = {
  canvas: { width: 800, height: 600 },
  drawingBufferWidth: 800,
  drawingBufferHeight: 600,
  getContextAttributes: vi.fn(() => ({ alpha: true, depth: true, stencil: false, antialias: true })),
  getExtension: vi.fn(),
  getParameter: vi.fn(),
  getError: vi.fn(() => 0),
  enable: vi.fn(),
  disable: vi.fn(),
  blendFunc: vi.fn(),
  clearColor: vi.fn(),
  clearDepth: vi.fn(),
  clearStencil: vi.fn(),
  clear: vi.fn(),
  colorMask: vi.fn(),
  depthFunc: vi.fn(),
  depthMask: vi.fn(),
  depthRange: vi.fn(),
  stencilFunc: vi.fn(),
  stencilFuncSeparate: vi.fn(),
  stencilMask: vi.fn(),
  stencilMaskSeparate: vi.fn(),
  stencilOp: vi.fn(),
  stencilOpSeparate: vi.fn(),
  hint: vi.fn(),
  viewPort: vi.fn(),
  scissor: vi.fn(),
  createBuffer: vi.fn(() => ({})),
  deleteBuffer: vi.fn(),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  bufferSubData: vi.fn(),
  createShader: vi.fn(() => ({})),
  deleteShader: vi.fn(),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn(() => true),
  getShaderInfoLog: vi.fn(() => ''),
  createProgram: vi.fn(() => ({})),
  deleteProgram: vi.fn(),
  attachShader: vi.fn(),
  detachShader: vi.fn(),
  linkProgram: vi.fn(),
  validateProgram: vi.fn(),
  getProgramParameter: vi.fn(() => true),
  getProgramInfoLog: vi.fn(() => ''),
  useProgram: vi.fn(),
  createTexture: vi.fn(() => ({})),
  deleteTexture: vi.fn(),
  bindTexture: vi.fn(),
  texImage2D: vi.fn(),
  texSubImage2D: vi.fn(),
  texParameteri: vi.fn(),
  texParameterf: vi.fn(),
  generateMipmap: vi.fn(),
  activeTexture: vi.fn(),
  getUniformLocation: vi.fn(() => ({})),
  getAttribLocation: vi.fn(() => 0),
  uniform1i: vi.fn(),
  uniform1f: vi.fn(),
  uniform2fv: vi.fn(),
  uniform3fv: vi.fn(),
  uniform4fv: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  vertexAttribPointer: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  disableVertexAttribArray: vi.fn(),
  drawArrays: vi.fn(),
  drawElements: vi.fn(),
  readPixels: vi.fn(),
  flush: vi.fn(),
  finish: vi.fn(),
  drawingBufferWidth: 800,
  drawingBufferHeight: 600,
  getShaderPrecisionFormat: vi.fn(),
  releaseShaderCompiler: vi.fn(),
  isContextLost: vi.fn(() => false),
  getSupportedExtensions: vi.fn(() => []),
  isBuffer: vi.fn(() => false),
  isEnabled: vi.fn(() => false),
  isFramebuffer: vi.fn(() => false),
  isProgram: vi.fn(() => false),
  isRenderbuffer: vi.fn(() => false),
  isShader: vi.fn(() => false),
  isTexture: vi.fn(() => false),
} as unknown as WebGLRenderingContext;

// HTMLCanvasElement.prototype.getContext mock
HTMLCanvasElement.prototype.getContext = vi.fn((contextType: string, _attributes?: any) => {
  if (contextType === '2d') return mockCanvasContext2D;
  if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') return mockWebGLContext;
  if (contextType === 'bitmaprenderer') return {} as ImageBitmapRenderingContext;
  return null;
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// OffscreenCanvas mock
globalThis.OffscreenCanvas = vi.fn().mockImplementation(() => ({
  width: 800,
  height: 600,
  getContext: vi.fn((contextType: string) => {
    if (contextType === '2d') return mockCanvasContext2D;
    if (contextType === 'webgl' || contextType === 'webgl2') return mockWebGLContext;
    return null;
  }),
  convertToBlob: vi.fn(() => Promise.resolve(new Blob())),
  transferControlToOffscreen: vi.fn(),
}));

// requestAnimationFrame / cancelAnimationFrame
globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => setTimeout(cb, 16));
globalThis.cancelAnimationFrame = vi.fn((id: number) => clearTimeout(id));

// --- localStorage / sessionStorage Mock ---
const mockStorage = new Map<string, string>();
const createStorageMock = () => ({
  getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => mockStorage.set(key, value)),
  removeItem: vi.fn((key: string) => mockStorage.delete(key)),
  clear: vi.fn(() => mockStorage.clear()),
  get length() { return mockStorage.size; },
  key: vi.fn((index: number) => Array.from(mockStorage.keys())[index] ?? null),
});

globalThis.localStorage = createStorageMock();
globalThis.sessionStorage = createStorageMock();

// --- IndexedDB Mock (minimal) ---
const mockIDB = {
  open: vi.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      createObjectStore: vi.fn(),
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          get: vi.fn(() => ({ onsuccess: null, result: undefined })),
          put: vi.fn(() => ({ onsuccess: null })),
          delete: vi.fn(() => ({ onsuccess: null })),
          clear: vi.fn(() => ({ onsuccess: null })),
          getAllKeys: vi.fn(() => ({ onsuccess: null, result: [] })),
        })),
        oncomplete: null,
        onerror: null,
      })),
      close: vi.fn(),
    },
  })),
  deleteDatabase: vi.fn(),
};

globalThis.indexedDB = mockIDB;

// --- ResizeObserver Mock ---
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// --- IntersectionObserver Mock ---
globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// --- MatchMedia Mock ---
globalThis.matchMedia = vi.fn((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
}));

// --- URL.createObjectURL / revokeObjectURL ---
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
globalThis.URL.revokeObjectURL = vi.fn();

// --- SVGSVGElement Mock (for Trischach BoardRenderer) ---
class MockSVGSVGElement {
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  getElementById = vi.fn();
  querySelector = vi.fn();
  querySelectorAll = vi.fn(() => []);
  removeChild = vi.fn();
  appendChild = vi.fn();
  style = { transform: '' };
  id = '';
}

Object.defineProperty(globalThis, 'SVGSVGElement', {
  writable: true,
  value: MockSVGSVGElement,
});

// Ensure SVG elements are properly created
const originalCreateElementNS = document.createElementNS.bind(document);
document.createElementNS = vi.fn((namespace: string, qualifiedName: string) => {
  if (namespace === 'http://www.w3.org/2000/svg') {
    const el = originalCreateElementNS(namespace, qualifiedName) as HTMLElement & { addEventListener: vi.Mock; removeEventListener: vi.Mock };
    el.addEventListener = vi.fn();
    el.removeEventListener = vi.fn();
    return el;
  }
  return originalCreateElementNS(namespace, qualifiedName);
});

// Override document.createElement to handle SVG
const originalCreateElement = document.createElement.bind(document);
document.createElement = vi.fn((tagName: string, options?: ElementCreationOptions) => {
  if (tagName === 'svg' || (options && options.is === 'svg')) {
    const el = originalCreateElementNS('http://www.w3.org/2000/svg', 'svg') as HTMLElement & { addEventListener: vi.Mock; removeEventListener: vi.Mock };
    el.addEventListener = vi.fn();
    el.removeEventListener = vi.fn();
    return el;
  }
  return originalCreateElement(tagName, options);
});

// Override innerHTML setter for SVG handling
const originalInnerHTMLDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerHTML');
if (originalInnerHTMLDescriptor) {
  Object.defineProperty(HTMLElement.prototype, 'innerHTML', {
    ...originalInnerHTMLDescriptor,
    set: function(value: string) {
      if (value && value.includes('<svg') && !value.includes('xmlns="http://www.w3.org/2000/svg"')) {
        value = value.replace(/<svg([^>]*)>/gi, '<svg$1 xmlns="http://www.w3.org/2000/svg">');
      }
      originalInnerHTMLDescriptor.set.call(this, value);
    },
  });
}

// --- Clipboard API ---

  // --- Clipboard API ---
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('')),
  },
  writable: true,
  configurable: true,
});

// --- Web Worker ---
globalThis.Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onmessage: null,
  onerror: null,
}));

// --- Three.js Mock (for 3D tests) ---
// Mock the entire three module
vi.mock('three', () => {
  const createMockClass = <T extends object>(methods: Partial<T> = {}) => {
    // Return a constructor function that can be used with `new`
    const MockConstructor = vi.fn().mockImplementation(function(this: any, ...args: any[]) {
      Object.assign(this, methods);
      this.add = vi.fn();
      this.remove = vi.fn();
      this.addEventListener = vi.fn();
      this.removeEventListener = vi.fn();
      this.dispatchEvent = vi.fn();
    });
    // Also add static methods if needed
    return MockConstructor;
  };

  // Proper class-based mocks for Vector2, Vector3 etc. that work with `new`
  class MockVector2 {
    constructor(public x = 0, public y = 0) {}
    clone = vi.fn().mockReturnThis();
    copy = vi.fn().mockReturnThis();
    set = vi.fn().mockReturnThis();
    add = vi.fn().mockReturnThis();
    sub = vi.fn().mockReturnThis();
    multiplyScalar = vi.fn().mockReturnThis();
    length = vi.fn(() => Math.hypot(this.x, this.y));
    normalize = vi.fn().mockReturnThis();
  }

  class MockVector3 {
    constructor(public x = 0, public y = 0, public z = 0) {}
    clone = vi.fn().mockReturnThis();
    copy = vi.fn().mockReturnThis();
    set = vi.fn().mockReturnThis();
    add = vi.fn().mockReturnThis();
    sub = vi.fn().mockReturnThis();
    multiplyScalar = vi.fn().mockReturnThis();
    length = vi.fn(() => Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z));
    normalize = vi.fn().mockReturnThis();
  }

  class MockQuaternion {
    constructor(public x = 0, public y = 0, public z = 0, public w = 1) {}
    clone = vi.fn().mockReturnThis();
    copy = vi.fn().mockReturnThis();
    setFromEuler = vi.fn().mockReturnThis();
    setFromAxisAngle = vi.fn().mockReturnThis();
    multiply = vi.fn().mockReturnThis();
  }

  class MockEuler {
    constructor(public x = 0, public y = 0, public z = 0, public order = 'XYZ') {}
    clone = vi.fn().mockReturnThis();
    copy = vi.fn().mockReturnThis();
    set = vi.fn().mockReturnThis();
    setFromQuaternion = vi.fn().mockReturnThis();
  }

  class MockMatrix4 {
    constructor() {
      this.elements = new Float32Array(16);
      this.identity();
    }
    identity = vi.fn().mockReturnThis();
    clone = vi.fn().mockReturnThis();
    copy = vi.fn().mockReturnThis();
    multiply = vi.fn().mockReturnThis();
    multiplyMatrices = vi.fn().mockReturnThis();
    makeRotationFromQuaternion = vi.fn().mockReturnThis();
    makeTranslation = vi.fn().mockReturnThis();
    makeScale = vi.fn().mockReturnThis();
    compose = vi.fn().mockReturnThis();
    decompose = vi.fn().mockReturnThis();
  }

  class MockColor {
    constructor(public r = 0, public g = 0, public b = 0) {}
    set = vi.fn().mockReturnThis();
    setHex = vi.fn().mockReturnThis();
    setRGB = vi.fn().mockReturnThis();
    clone = vi.fn().mockReturnThis();
    copy = vi.fn().mockReturnThis();
  }

  return {
    Scene: createMockClass(),
    PerspectiveCamera: createMockClass(),
    OrthographicCamera: createMockClass(),
    WebGLRenderer: createMockClass({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      setClearColor: vi.fn(),
      dispose: vi.fn(),
      domElement: document.createElement('canvas'),
    }),
    AmbientLight: createMockClass(),
    DirectionalLight: createMockClass(),
    PointLight: createMockClass(),
    HemisphereLight: createMockClass(),
    Mesh: createMockClass({
      position: new MockVector3(),
      rotation: new MockVector3(),
      scale: new MockVector3(1, 1, 1),
      castShadow: false,
      receiveShadow: false,
    }),
    Group: createMockClass({
      position: new MockVector3(),
      rotation: new MockVector3(),
      scale: new MockVector3(1, 1, 1),
      traverse: vi.fn(),
    }),
    Object3D: createMockClass({
      position: new MockVector3(),
      rotation: new MockVector3(),
      scale: new MockVector3(1, 1, 1),
      add: vi.fn(),
      remove: vi.fn(),
      traverse: vi.fn(),
    }),
    BoxGeometry: createMockClass(),
    SphereGeometry: createMockClass(),
    CylinderGeometry: createMockClass(),
    ConeGeometry: createMockClass(),
    PlaneGeometry: createMockClass(),
    TorusGeometry: createMockClass(),
    RingGeometry: createMockClass(),
    LatheGeometry: createMockClass(),
    BufferGeometry: createMockClass({
      setAttribute: vi.fn(),
      dispose: vi.fn(),
      computeBoundingBox: vi.fn(),
      computeBoundingSphere: vi.fn(),
    }),
    MeshBasicMaterial: createMockClass(),
    MeshStandardMaterial: createMockClass(),
    MeshLambertMaterial: createMockClass(),
    MeshPhongMaterial: createMockClass(),
    ShadowMaterial: createMockClass(),
    TextureLoader: createMockClass(),
    CubeTextureLoader: createMockClass(),
    Color: MockColor,
    Vector2: MockVector2,
    Vector3: MockVector3,
    Quaternion: MockQuaternion,
    Euler: MockEuler,
    Matrix4: MockMatrix4,
    Raycaster: vi.fn().mockImplementation(() => ({
      set: vi.fn(),
      intersectObjects: vi.fn(() => []),
      linePrecision: 0,
    })),
    Clock: vi.fn().mockImplementation(() => ({
      getDelta: vi.fn(() => 0.016),
      getElapsedTime: vi.fn(() => 0),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    AnimationMixer: createMockClass({
      clipAction: vi.fn(() => ({ play: vi.fn(), stop: vi.fn(), fadeIn: vi.fn(), fadeOut: vi.fn() })),
      update: vi.fn(),
    }),
    AnimationClip: vi.fn().mockImplementation(() => ({
      name: '',
      duration: 1,
      tracks: [],
    })),
    KeyframeTrack: vi.fn(),
    LoopOnce: 1,
    LoopRepeat: 2,
    LoopPingPong: 3,
    // Constants
    FrontSide: 0,
    BackSide: 1,
    DoubleSide: 2,
    AdditiveBlending: 0,
    NormalBlending: 1,
    MultiplyBlending: 2,
    AdditiveAnimation: 1,
    AdditiveClipBlendMode: 1,
    NormalAnimationBlending: 2,
    LinearEncoding: 1,
    sRGBEncoding: 2,
    GammaEncoding: 3,
    FlatShading: 1,
    SmoothShading: 2,
    TangentSpaceNormalMap: 1,
    ObjectSpaceNormalMap: 2,
    UVMapping: 1,
    CubeReflectionMapping: 2,
    CubeRefractionMapping: 3,
    EquirectangularReflectionMapping: 4,
    EquirectangularRefractionMapping: 5,
    CubeUVReflectionMapping: 6,
    RepeatWrapping: 1,
    ClampToEdgeWrapping: 2,
    MirroredRepeatWrapping: 3,
    NearestFilter: 1,
    NearestMipmapNearestFilter: 2,
    NearestMipmapLinearFilter: 3,
    LinearFilter: 4,
    LinearMipmapNearestFilter: 5,
    LinearMipmapLinearFilter: 6,
    UnsignedByteType: 1,
    FloatType: 2,
    HalfFloatType: 3,
  };
});

// --- console spy ---
globalThis.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// --- Cleanup helpers ---
afterEach(() => {
  mockStorage.clear();
  vi.clearAllMocks();
});

export { MockAudioContext };