// A BarcodeDetector for every browser. Chrome and Edge on Android and ChromeOS ship one. Safari and
// Firefox do not, so they get the barcode-detector package (ZXing in WebAssembly). It is loaded only
// when the browser has no detector, so Chrome users never download it.
//
// The .wasm file (about 950 KB) is served from this app, not from the package's default CDN.

export interface DetectedBarcode {
  rawValue: string
  format: string
}

export interface BarcodeDetectorLike {
  detect(source: CanvasImageSource | ImageBitmapSource): Promise<DetectedBarcode[]>
}

export const PRODUCT_BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']

export function hasNativeBarcodeDetector(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window
}

let polyfillReady: Promise<new (opts: { formats: string[] }) => BarcodeDetectorLike> | null = null

async function loadPolyfill() {
  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ])
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
    },
  })
  return BarcodeDetector as unknown as new (opts: { formats: string[] }) => BarcodeDetectorLike
}

export async function createBarcodeDetector(formats: string[] = PRODUCT_BARCODE_FORMATS): Promise<BarcodeDetectorLike> {
  if (hasNativeBarcodeDetector()) {
    const Native = (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector
    return new Native({ formats })
  }
  polyfillReady ??= loadPolyfill()
  const Polyfill = await polyfillReady
  return new Polyfill({ formats })
}
