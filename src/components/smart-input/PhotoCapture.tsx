import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, Upload, X, RotateCw } from 'lucide-react'
import { Button } from '@/components/common'

interface PhotoCaptureProps {
  onCapture: (imageBase64: string) => void
  onCancel: () => void
  title?: string
}

export function PhotoCapture({ onCapture, onCancel, title = 'Take Photo' }: PhotoCaptureProps) {
  const [mode, setMode] = useState<'select' | 'camera' | 'preview'>('select')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      })
      setStream(mediaStream)
      setMode('camera')
    } catch (err) {
      console.error('Camera error:', err)
      setError('Could not access camera. Please check permissions.')
    }
  }, [facingMode])

  // Apply stream to video element when both are ready
  useEffect(() => {
    if (stream && videoRef.current && mode === 'camera') {
      videoRef.current.srcObject = stream
    }
  }, [stream, mode])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    const imageData = canvas.toDataURL('image/jpeg', 0.8)

    setCapturedImage(imageData)
    stopCamera()
    setMode('preview')
  }, [stopCamera])

  const switchCamera = useCallback(async () => {
    stopCamera()
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
    // Camera will restart with new facing mode
    setTimeout(startCamera, 100)
  }, [stopCamera, startCamera])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const imageData = reader.result as string
      setCapturedImage(imageData)
      setMode('preview')
    }
    reader.readAsDataURL(file)
  }, [])

  const handleConfirm = useCallback(() => {
    if (!capturedImage) return
    const base64 = capturedImage.split(',')[1]
    onCapture(base64)
  }, [capturedImage, onCapture])

  const handleRetake = useCallback(() => {
    setCapturedImage(null)
    setMode('select')
  }, [])

  const handleCancel = useCallback(() => {
    stopCamera()
    onCancel()
  }, [stopCamera, onCancel])

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

      {/* Hidden elements */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

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
            <div className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center">
              <Camera className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium">Take Photo</p>
              <p className="text-white/60 text-sm">Use your camera</p>
            </div>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full max-w-xs flex items-center gap-4 p-6 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors"
          >
            <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center">
              <Upload className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium">Upload Photo</p>
              <p className="text-white/60 text-sm">Choose from gallery</p>
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

          {/* Camera controls */}
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/50 to-transparent">
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={switchCamera}
                className="p-4 bg-white/20 rounded-full"
              >
                <RotateCw className="h-6 w-6 text-white" />
              </button>

              <button
                onClick={capturePhoto}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center"
              >
                <div className="w-16 h-16 bg-white border-4 border-gray-300 rounded-full" />
              </button>

              <div className="w-14" /> {/* Spacer for alignment */}
            </div>
          </div>
        </>
      )}

      {/* Mode: Preview */}
      {mode === 'preview' && capturedImage && (
        <>
          <img
            src={capturedImage}
            alt="Captured"
            className="h-full w-full object-contain bg-black"
          />

          {/* Preview controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex gap-4 max-w-sm mx-auto">
              <Button
                variant="secondary"
                onClick={handleRetake}
                className="flex-1 bg-white/20 text-white border-0 hover:bg-white/30"
              >
                Retake
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Use Photo
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
