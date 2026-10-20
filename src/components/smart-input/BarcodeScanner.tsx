import { useState, useRef, useEffect, useCallback } from 'react'
import { Barcode, X, Camera, Keyboard, Loader2 } from 'lucide-react'
import { Button, Input } from '@/components/common'
import { lookupBarcode, type BarcodeProduct } from '@/services'

// BarcodeDetector is not in TypeScript's DOM lib yet
interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>
}
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance

interface BarcodeScannerProps {
  onScan: (product: BarcodeProduct) => void
  onCancel: () => void
}

export function BarcodeScanner({ onScan, onCancel }: BarcodeScannerProps) {
  const [mode, setMode] = useState<'select' | 'camera' | 'manual'>('select')
  const [manualCode, setManualCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check if BarcodeDetector API is available
  const hasBarcodeDetector = 'BarcodeDetector' in window

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

  const lookupAndReturn = useCallback(async (barcode: string) => {
    setLoading(true)
    setError(null)

    try {
      const result = await lookupBarcode(barcode)
      if (result.success && result.product) {
        stopCamera()
        onScan(result.product)
      } else {
        setError(result.error || 'Product not found')
      }
    } catch {
      setError('Failed to lookup barcode')
    } finally {
      setLoading(false)
    }
  }, [onScan, stopCamera])

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

  // Apply stream to video element and start barcode detection when ready
  useEffect(() => {
    if (stream && videoRef.current && mode === 'camera') {
      videoRef.current.srcObject = stream

      // Try to use BarcodeDetector API if available
      if (hasBarcodeDetector) {
        const { BarcodeDetector } = window as unknown as { BarcodeDetector: BarcodeDetectorConstructor }
        detectorRef.current = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
        })

        // Start scanning
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || !detectorRef.current) return

          try {
            const barcodes = await detectorRef.current.detect(videoRef.current)
            if (barcodes.length > 0) {
              const barcode = barcodes[0].rawValue
              if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current)
              }
              await lookupAndReturn(barcode)
            }
          } catch {
            // Detection failed, continue scanning
          }
        }, 200)
      }
    }
  }, [stream, mode, hasBarcodeDetector, lookupAndReturn])

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
        <h2 className="text-white font-medium">Scan barcode</h2>
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
                {hasBarcodeDetector ? 'Auto-detect barcode' : 'Capture barcode image'}
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
              {hasBarcodeDetector
                ? 'Position the barcode within the frame'
                : 'Barcode scanning requires manual entry on this device'}
            </p>

            {error && (
              <div className="bg-red-500/20 text-red-200 px-4 py-2 rounded-lg text-center mb-4">
                {error}
              </div>
            )}

            {!hasBarcodeDetector && (
              <Button
                onClick={() => setMode('manual')}
                className="w-full bg-primary hover:bg-primary-hover"
              >
                Enter manually
              </Button>
            )}
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
                placeholder="e.g., 5901234123457"
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
