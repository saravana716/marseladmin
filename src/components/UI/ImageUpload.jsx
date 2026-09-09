import React, { useState, useRef, useEffect } from 'react'
import styles from './ImageUpload.module.css'
import { Camera, RefreshCw, X, Check, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react'

export default function ImageUpload({
  value,
  onChange,
  placeholder = 'Click or drag to upload image'
}) {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  // Camera states
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [facingMode, setFacingMode] = useState('environment') // 'environment' (back) or 'user' (front)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [capturedBlob, setCapturedBlob] = useState(null)
  const [capturedPreview, setCapturedPreview] = useState(null)
  const [isShutterActive, setIsShutterActive] = useState(false)

  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const handleFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size should be less than 10MB.')
      return
    }
    onChange(file)
  }

  const onDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const onDragLeave = () => {
    setDragOver(false)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const onFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const triggerInput = () => {
    fileInputRef.current?.click()
  }

  // Camera Stream Handlers
  const startCamera = async (mode = facingMode) => {
    stopCameraStream()
    setCameraLoading(true)
    setCameraError(null)
    setCapturedBlob(null)
    setCapturedPreview(null)

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser or connection.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (err) {
      console.error('Camera access error:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.')
      } else {
        setCameraError(err.message || 'Could not access camera.')
      }
    } finally {
      setCameraLoading(false)
    }
  }

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const handleOpenCamera = (e) => {
    if (e) e.stopPropagation()
    setIsCameraOpen(true)
    startCamera(facingMode)
  }

  const handleCloseCamera = () => {
    stopCameraStream()
    setIsCameraOpen(false)
    setCapturedBlob(null)
    setCapturedPreview(null)
    setCameraError(null)
  }

  const handleSwitchCamera = (e) => {
    if (e) e.stopPropagation()
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    startCamera(nextMode)
  }

  const handleCapturePhoto = () => {
    if (!videoRef.current) return

    setIsShutterActive(true)
    setTimeout(() => setIsShutterActive(false), 200)

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    const ctx = canvas.getContext('2d')
    if (facingMode === 'user') {
      // Mirror front camera
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const preview = URL.createObjectURL(blob)
          setCapturedBlob(blob)
          setCapturedPreview(preview)
          stopCameraStream()
        }
      },
      'image/jpeg',
      0.92
    )
  }

  const handleRetakePhoto = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview)
    }
    setCapturedBlob(null)
    setCapturedPreview(null)
    startCamera(facingMode)
  }

  const handleConfirmPhoto = () => {
    if (!capturedBlob) return

    const fileName = `product-camera-${Date.now()}.jpg`
    const file = new File([capturedBlob], fileName, { type: 'image/jpeg' })
    onChange(file)
    handleCloseCamera()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraStream()
      if (capturedPreview) {
        URL.revokeObjectURL(capturedPreview)
      }
    }
  }, [capturedPreview])

  // Get preview URL
  const previewUrl = value instanceof File ? URL.createObjectURL(value) : value

  return (
    <div className={styles.container}>
      {/* Upload Drop Zone */}
      <div
        className={`${styles.uploadZone} ${dragOver ? styles.dragOver : ''} ${previewUrl ? styles.hasPreview : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={triggerInput}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileChange}
          accept="image/*"
          style={{ display: 'none' }}
        />

        {previewUrl ? (
          <div className={styles.previewContainer}>
            <img src={previewUrl} alt="Product Preview" className={styles.preview} />
            <div className={styles.actionOverlay} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={styles.overlayBtn}
                onClick={triggerInput}
                title="Browse new file"
              >
                <Upload size={14} /> Change File
              </button>
              <button
                type="button"
                className={`${styles.overlayBtn} ${styles.cameraBtn}`}
                onClick={handleOpenCamera}
                title="Capture with camera"
              >
                <Camera size={14} /> Use Camera
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.placeholderContent}>
            <div className={styles.iconWrapper}>
              <ImageIcon size={28} className={styles.mainIcon} />
            </div>
            <p className={styles.text}>{placeholder}</p>
            <p className={styles.subtext}>PNG, JPG, WEBP up to 10MB</p>

            <div className={styles.buttonGroup} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={styles.browseButton}
                onClick={triggerInput}
              >
                <Upload size={15} /> Browse File
              </button>
              <button
                type="button"
                className={styles.cameraButton}
                onClick={handleOpenCamera}
              >
                <Camera size={15} /> Open Camera
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Camera Capture Modal */}
      {isCameraOpen && (
        <div className={styles.cameraModalOverlay} onClick={handleCloseCamera}>
          <div className={styles.cameraModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.cameraHeader}>
              <div className={styles.cameraTitle}>
                <Camera size={18} />
                <span>Camera Capture</span>
              </div>
              <div className={styles.cameraHeaderActions}>
                {!capturedPreview && (
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={handleSwitchCamera}
                    title="Flip camera"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={handleCloseCamera}
                  title="Close camera"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className={styles.cameraViewfinderWrapper}>
              {cameraLoading && (
                <div className={styles.cameraLoadingState}>
                  <div className={styles.cameraSpinner} />
                  <p>Starting camera...</p>
                </div>
              )}

              {cameraError && (
                <div className={styles.cameraErrorState}>
                  <AlertCircle size={36} color="#ef4444" />
                  <p className={styles.cameraErrorText}>{cameraError}</p>
                  <button
                    type="button"
                    className={styles.retryButton}
                    onClick={() => startCamera(facingMode)}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Live Video Feed */}
              <video
                ref={videoRef}
                className={`${styles.cameraVideo} ${facingMode === 'user' ? styles.mirrored : ''} ${capturedPreview || cameraError ? styles.hidden : ''}`}
                playsInline
                autoPlay
                muted
              />

              {/* Shutter Animation */}
              {isShutterActive && <div className={styles.shutterFlash} />}

              {/* Captured Photo Preview */}
              {capturedPreview && (
                <img
                  src={capturedPreview}
                  alt="Captured frame"
                  className={styles.capturedImage}
                />
              )}

              {/* Viewfinder Target Grid Overlay */}
              {!capturedPreview && !cameraError && !cameraLoading && (
                <div className={styles.viewfinderGrid}>
                  <div className={styles.cornerTL} />
                  <div className={styles.cornerTR} />
                  <div className={styles.cornerBL} />
                  <div className={styles.cornerBR} />
                </div>
              )}
            </div>

            {/* Camera Control Footer */}
            <div className={styles.cameraFooter}>
              {capturedPreview ? (
                <div className={styles.previewControls}>
                  <button
                    type="button"
                    className={styles.retakeBtn}
                    onClick={handleRetakePhoto}
                  >
                    <RefreshCw size={15} /> Retake
                  </button>
                  <button
                    type="button"
                    className={styles.confirmBtn}
                    onClick={handleConfirmPhoto}
                  >
                    <Check size={16} /> Use Photo
                  </button>
                </div>
              ) : (
                !cameraError &&
                !cameraLoading && (
                  <div className={styles.shutterContainer}>
                    <button
                      type="button"
                      className={styles.shutterBtn}
                      onClick={handleCapturePhoto}
                      title="Take Photo"
                    >
                      <div className={styles.shutterInner} />
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
