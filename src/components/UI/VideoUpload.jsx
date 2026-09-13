import React, { useState, useRef } from 'react'
import styles from './VideoUpload.module.css'
import { Video, Upload, Trash2, Film } from 'lucide-react'

export default function VideoUpload({
  value,
  onChange,
  placeholder = 'Click or drag to upload product video'
}) {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('video/')) {
      alert('Please upload a valid video file (MP4, WEBM, MOV, etc.).')
      return
    }
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      alert('Video file size should be less than 100MB.')
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

  const handleRemove = (e) => {
    e.stopPropagation()
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const previewUrl = value instanceof File ? URL.createObjectURL(value) : value

  return (
    <div className={styles.container}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept="video/*"
        style={{ display: 'none' }}
      />

      {previewUrl ? (
        <div className={styles.previewContainer}>
          <video
            src={previewUrl}
            controls
            className={styles.videoPreview}
          />
          <div className={styles.actionButtons}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={triggerInput}
            >
              <Upload size={14} /> Change Video File
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.removeBtn}`}
              onClick={handleRemove}
            >
              <Trash2 size={14} /> Remove Video
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`${styles.uploadZone} ${dragOver ? styles.dragOver : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={triggerInput}
        >
          <div className={styles.placeholderContent}>
            <div className={styles.iconWrapper}>
              <Film size={26} className={styles.mainIcon} />
            </div>
            <p className={styles.text}>{placeholder}</p>
            <p className={styles.subtext}>MP4, WEBM, MOV up to 100MB</p>
            <button
              type="button"
              className={styles.browseButton}
              onClick={triggerInput}
            >
              <Upload size={15} /> Select Video File
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
