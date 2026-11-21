import { useState, useRef, useEffect, useCallback } from 'react'
import { Barcode, X, Camera, Keyboard, Loader2 } from 'lucide-react'
import { Button, Input } from '@/components/common'
import type { BarcodeProduct } from '@/services'
import type { LookupResult } from '@/allergy/lookup'
import { createBarcodeDetector, type BarcodeDetectorLike } from '@/allergy/barcodeDetector'
import { productName } from '@/allergy/products'
import { mapCategory } from '@/utils/productCategory'

interface BarcodeScannerProps {
  /**
   * Called with the product after a successful lookup. lookup holds the full Open Food Facts records,
   * already cached for the allergy check.
   */
  onScan?: (product: BarcodeProduct, lookup: LookupResult) => void
  /** If given, the scanner only reads the code and hands it over without looking it up. */
  onCode?: (code: string, format?: string) => void
  onCancel: () => void
  title?: string
}

// Until step 3 brings the lookup-product Edge Function, barcodes are looked up from the browser
// straight at Open Food Facts, in demo mode and with Supabase alike.
async function lookupForPantry(code: string, format?: string): Promise<{ product: BarcodeProduct; lookup: LookupResult } | { error: string }> {
  const { lookupProduct, NotABarcodeError } = await import('@/allergy/lookup')
  try {
    const lookup = await lookupProduct(code, { symbology: format })
    if (lookup.storeMade) {
      return { error: 'This barcode was printed in the store, so it does not name a product. Type the item name instead.' }
    }
    if (lookup.records.length === 0) {
      return { error: lookup.sourceErrors[0] ?? 'Open Food Facts does not know this product. Type the item name instead.' }
    }
    const { name, brand } = productName(lookup.records)
    const first = lookup.records[0]!
    return {
      lookup,
      product: {
        name,
        brand,
        category: mapCategory(first.categories ?? []),
        quantity: first.quantity ?? null,
        imageUrl: first.imageUrl ?? null,
        barcode: lookup.gtin,
      },
    }
  } catch (e) {
    if (e instanceof NotABarcodeError) return { error: e.message }
    return { error: 'Failed to look up the barcode' }
  }
}

export function BarcodeScanner({ onScan, onCode, onCancel, title = 'Scan barcode' }: BarcodeScannerProps) {
  const [mode, setMode] = useState<'select' | 'camera' | 'manual'>('select')
  const [manualCode, setManualCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const detectorRef = useRef<BarcodeDetectorLike | null>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const detectingRef = useRef(false)

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  const lookupAndReturn = useCallback(async (barcode: string, format?: string) => {
    if (onCode) {
      stopCamera()
      onCode(barcode, format)
      return
    }
    setLoading(true)
    setError(null)
    const result = await lookupForPantry(barcode, format)
    setLoading(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    stopCamera()
    onScan?.(result.product, result.lookup)
  }, [onCode, onScan, stopCamera])

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      setStream(mediaStream)
      setMode('camera')
    } catch (err) {
      console.error('Camera error:', err)
      setError('Could not access camera')
      setMode('manual')
    }
  }, [])

  // Apply stream to video element and start barcode detection when ready. Browsers without a
  // built-in BarcodeDetector (Safari, Firefox) load a WebAssembly one first.
  useEffect(() => {
    if (!(stream && videoRef.current && mode === 'camera')) return
    videoRef.current.srcObject = stream
    let cancelled = false

    createBarcodeDetector()
      .then((detector) => {
        if (cancelled) return
        detectorRef.current = detector
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || !detectorRef.current || detectingRef.current) return
          if (videoRef.current.readyState < 2) return
          detectingRef.current = true
          try {
            const barcodes = await detectorRef.current.detect(videoRef.current)
            if (barcodes.length > 0 && !cancelled) {
              if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current)
                scanIntervalRef.current = null
              }
              await lookupAndReturn(barcodes[0]!.rawValue, barcodes[0]!.format)
            }
          } catch {
            // Detection failed on this frame; try the next one.
          } finally {
            detectingRef.current = false
          }
        }, 250)
      })
      .catch((err) => {
        console.error('Barcode detector error:', err)
        if (!cancelled) setError('This browser could not start the barcode reader. Type the number instead.')
      })

    return () => {
      cancelled = true
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }
    }
  }, [stream, mode, lookupAndReturn])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    await lookupAndReturn(manualCode.trim())
  }

  const handleCancel = () => {
    stopCamera()
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <button onClick={handleCancel} className="p-2 text-white">
          <X className="h-6 w-6" />
        </button>
        <h2 className="text-white font-medium">{title}</h2>
        <div className="w-10" />
      </div>

      {/* Mode: Select */}
      {mode === 'select' && (
        <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
          {error && (
            <div className="bg-red-500/20 text-red-200 px-4 py-2 rounded-lg text-center">
              {error}
            </div>
          )}

          <button
            onClick={startCamera}
            className="w-full max-w-xs flex items-center gap-4 p-6 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors"
          >
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
              <Camera className="h-7 w-7 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium">Scan with camera</p>
              <p className="text-white/60 text-sm">
                Point the camera at the barcode
              </p>
            </div>
          </button>

          <button
            onClick={() => setMode('manual')}
            className="w-full max-w-xs flex items-center gap-4 p-6 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors"
          >
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
              <Keyboard className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium">Enter manually</p>
              <p className="text-white/60 text-sm">Type the barcode number</p>
            </div>
          </button>
        </div>
      )}

      {/* Mode: Camera */}
      {mode === 'camera' && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />

          {/* Scanning overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-72 h-40 border-2 border-white rounded-lg relative">
              <div className="absolute inset-0 flex items-center justify-center">
                {loading ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <Barcode className="h-12 w-12 text-white/50" />
                )}
              </div>
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white" />
            </div>
          </div>

          {/* Instructions */}
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white text-center mb-4">
              Position the barcode within the frame
            </p>

            {error && (
              <div className="bg-red-500/20 text-red-200 px-4 py-2 rounded-lg text-center mb-4">
                {error}
              </div>
            )}

            <Button
              onClick={() => {
                stopCamera()
                setMode('manual')
              }}
              className="w-full bg-primary hover:bg-primary-hover"
            >
              Enter manually
            </Button>
          </div>
        </>
      )}

      {/* Mode: Manual */}
      {mode === 'manual' && (
        <div className="h-full flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <Barcode className="h-16 w-16 text-white/50 mx-auto mb-4" />
              <p className="text-white/80">Enter the barcode number</p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g., 044000037451"
                inputMode="numeric"
                aria-label="Barcode number"
                className="text-center text-xl tracking-widest"
                autoFocus
              />

              {error && (
                <div className="bg-red-500/20 text-red-200 px-4 py-2 rounded-lg text-center">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setMode('select')}
                  className="flex-1 bg-white/20 text-white border-0"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  disabled={!manualCode.trim()}
                  className="flex-1 bg-primary hover:bg-primary-hover"
                >
                  Lookup
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
