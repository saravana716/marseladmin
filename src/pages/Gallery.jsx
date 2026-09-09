import React, { useState, useEffect } from 'react'
import styles from '../styles/Gallery.module.css'
import Modal from '../components/UI/Modal'
import Button from '../components/UI/Button'
import EmptyState from '../components/UI/EmptyState'
import ConfirmDialog from '../components/UI/ConfirmDialog'
import Spinner from '../components/UI/Spinner'
import ImageUpload from '../components/UI/ImageUpload'
import { supabase, uploadImage, deleteImage, BUCKETS } from '../lib/supabase'
import { Film, Trash2, Plus, Play, Edit3 } from 'lucide-react'

export default function Gallery() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtered, setFiltered] = useState([])

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [existingVideoUrl, setExistingVideoUrl] = useState('')
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState('')

  // Delete states
  const [deleteId, setDeleteId] = useState(null)
  const [deleteVideoUrl, setDeleteVideoUrl] = useState('')
  const [deleteThumbnailUrl, setDeleteThumbnailUrl] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  // View video detail states
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewVideo, setPreviewVideo] = useState(null)

  const fetchVideos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setVideos(data || [])
      setFiltered(data || [])
    } catch (err) {
      console.warn('Error fetching gallery:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVideos()
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    const result = videos.filter(v =>
      (v.title || '').toLowerCase().includes(q)
    )
    setFiltered(result)
  }, [search, videos])

  const handleOpenAdd = () => {
    setEditingId(null)
    setTitle('')
    setVideoFile(null)
    setThumbnailFile(null)
    setExistingVideoUrl('')
    setExistingThumbnailUrl('')
    setUploadProgress('')
    setModalOpen(true)
  }

  const handleOpenEdit = (vid) => {
    setEditingId(vid.id)
    setTitle(vid.title)
    setVideoFile(null)
    setThumbnailFile(vid.thumbnail_url || null)
    setExistingVideoUrl(vid.video_url)
    setExistingThumbnailUrl(vid.thumbnail_url || '')
    setUploadProgress('')
    setModalOpen(true)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('video/')) {
        alert('Please select a valid video file.')
        return
      }
      // Check file size (e.g. limit to 25MB in dev)
      if (file.size > 25 * 1024 * 1024) {
        alert('Video file size exceeds 25MB limit. Please select a smaller video.')
        return
      }
      setVideoFile(file)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!editingId && !videoFile) {
      alert('Please select a video file to upload.')
      return
    }

    setModalLoading(true)
    try {
      let publicUrl = existingVideoUrl
      if (videoFile) {
        setUploadProgress('Uploading video to Supabase Storage...')
        publicUrl = await uploadImage(videoFile, BUCKETS.GALLERY, 'vid-')
      }

      let thumbnailUrl = existingThumbnailUrl
      // Note: thumbnailFile can be a File object (new upload), string URL (existing), or null
      if (thumbnailFile && thumbnailFile instanceof File) {
        setUploadProgress('Uploading thumbnail to Supabase Storage...')
        thumbnailUrl = await uploadImage(thumbnailFile, BUCKETS.GALLERY, 'thumb-')
      }

      setUploadProgress('Saving records to database...')
      const payload = {
        title: title || (videoFile ? videoFile.name.split('.')[0] : 'Untitled'),
        video_url: publicUrl,
        thumbnail_url: thumbnailUrl
      }

      let error
      if (editingId) {
        ({ error } = await supabase
          .from('gallery')
          .update(payload)
          .eq('id', editingId))
      } else {
        ({ error } = await supabase
          .from('gallery')
          .insert([payload]))
      }

      if (error) throw error

      // Clean up old files from storage if they were replaced
      if (editingId) {
        if (videoFile && existingVideoUrl) {
          await deleteImage(existingVideoUrl, BUCKETS.GALLERY)
        }
        if (thumbnailFile && thumbnailFile instanceof File && existingThumbnailUrl) {
          await deleteImage(existingThumbnailUrl, BUCKETS.GALLERY)
        }
      }

      setModalOpen(false)
      fetchVideos()
    } catch (err) {
      alert('Save failed: ' + err.message)
    } finally {
      setModalLoading(false)
      setUploadProgress('')
    }
  }

  const handleDeleteTrigger = (id, videoUrl, thumbnailUrl) => {
    setDeleteId(id)
    setDeleteVideoUrl(videoUrl)
    setDeleteThumbnailUrl(thumbnailUrl || '')
  }

  const handleConfirmDelete = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    try {
      const { error } = await supabase
        .from('gallery')
        .delete()
        .eq('id', deleteId)

      if (error) throw error

      if (deleteVideoUrl) {
        await deleteImage(deleteVideoUrl, BUCKETS.GALLERY)
      }

      if (deleteThumbnailUrl) {
        await deleteImage(deleteThumbnailUrl, BUCKETS.GALLERY)
      }

      setDeleteId(null)
      fetchVideos()
    } catch (err) {
      alert('Delete failed: ' + err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handlePlayPreview = (vid) => {
    setPreviewVideo(vid)
    setPreviewOpen(true)
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            🎥 Media Gallery
            <span className={styles.badge}>{filtered.length}</span>
          </h1>
          <p className={styles.subtitle}>Manage showcase and promotional videos</p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd} icon={<Plus size={16} />}>
          Add Video
        </Button>
      </div>

      {/* Search and Filters */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search videos by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Gallery Cards Grid */}
      {loading ? (
        <div className={styles.grid}>
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className={styles.card}>
              <div className="skeleton" style={{ height: '180px' }} />
              <div style={{ padding: '16px' }}>
                <div className="skeleton" style={{ height: '18px', width: '60%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className={styles.grid}>
          {filtered.map(vid => (
            <div key={vid.id} className={styles.card}>
              <div className={styles.videoWrapper} onClick={() => handlePlayPreview(vid)}>
                {vid.thumbnail_url ? (
                  <img src={vid.thumbnail_url} alt={vid.title} className={styles.videoPlayer} style={{ objectFit: 'cover' }} />
                ) : (
                  <video src={vid.video_url} preload="metadata" className={styles.videoPlayer} />
                )}
                <div className={styles.videoOverlay}>
                  <div className={styles.playIconContainer}>
                    <Play fill="white" size={24} color="white" />
                  </div>
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardDetails}>
                  <h3 className={styles.cardTitle}>{vid.title}</h3>
                </div>
                <div className={styles.cardActions}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Edit3 size={15} />}
                      onClick={() => handleOpenEdit(vid)}
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={15} />}
                      onClick={() => handleDeleteTrigger(vid.id, vid.video_url, vid.thumbnail_url)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🎥"
          title="No videos found"
          text="Upload a video to display cracker demo shows and promotions in the showcase gallery."
        />
      )}

      {/* Upload/Edit Video Modal */}
      <Modal
        open={modalOpen}
        onClose={() => !modalLoading && setModalOpen(false)}
        title={editingId ? '✏️ Edit Video Details' : '🎥 Upload Video'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={modalLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={modalLoading}>
              {editingId ? 'Save Changes' : 'Upload Video'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Video Title</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Flower Pots Display Show"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={modalLoading}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Select Video File *</label>
            <div className={styles.fileDropzone}>
              <input
                type="file"
                className={styles.fileInput}
                accept="video/*"
                onChange={handleFileChange}
                disabled={modalLoading}
              />
              <Film size={36} className={styles.dropzoneIcon} />
              <p className={styles.dropzoneText}>
                {videoFile ? `Selected: ${videoFile.name} (${(videoFile.size / (1024 * 1024)).toFixed(2)} MB)` : 'Click to select or drop video file (Max 25MB)'}
              </p>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Video Thumbnail Image (Optional)</label>
            <ImageUpload
              value={thumbnailFile}
              onChange={setThumbnailFile}
              placeholder="Click or drag to select thumbnail image"
            />
          </div>
          {uploadProgress && (
            <div className={styles.uploadProgressContainer}>
              <Spinner size="sm" />
              <span className={styles.progressText}>{uploadProgress}</span>
            </div>
          )}
        </form>
      </Modal>

      {/* Preview Player Modal */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={previewVideo ? `🎥 Viewing: ${previewVideo.title}` : ''}
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setPreviewOpen(false)}>
            Close
          </Button>
        }
      >
        {previewVideo && (
          <div className={styles.previewPlayerWrapper}>
            <video
              src={previewVideo.video_url}
              controls
              autoPlay
              className={styles.modalPlayer}
            />
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        title="Delete Video?"
        message="This video will be removed permanently from your gallery and storage records."
      />
    </div>
  )
}
