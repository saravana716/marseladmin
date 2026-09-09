import React, { useState, useEffect, useRef } from 'react'
import styles from '../styles/PriceList.module.css'
import Button from '../components/UI/Button'
import ConfirmDialog from '../components/UI/ConfirmDialog'
import Spinner from '../components/UI/Spinner'
import { supabase, uploadImage, deleteImage, BUCKETS } from '../lib/supabase'
import {
  FileText,
  UploadCloud,
  Trash2,
  RefreshCw,
  ExternalLink,
  Eye,
  Info,
  CheckCircle2,
  Download,
  AlertCircle,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon
} from 'lucide-react'

// Local storage fallback key if Supabase table is not configured yet
const LOCAL_PRICE_LIST_KEY = 'marsel_traders_price_list'

export default function PriceList() {
  const [priceList, setPriceList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  
  // Replace file / upload trigger
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)
  const replaceInputRef = useRef(null)

  // Delete modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Fetch active price list on mount
  const fetchPriceList = async () => {
    try {
      setLoading(true)

      // Try fetching from Supabase table 'price_list'
      const { data, error } = await supabase
        .from('price_list')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!error && data && data.length > 0) {
        setPriceList(data[0])
      } else {
        // Fallback to localStorage if table doesn't exist or returns empty
        const localData = localStorage.getItem(LOCAL_PRICE_LIST_KEY)
        if (localData) {
          try {
            setPriceList(JSON.parse(localData))
          } catch (e) {
            setPriceList(null)
          }
        } else {
          setPriceList(null)
        }
      }
    } catch (err) {
      console.warn('Error fetching price list:', err.message)
      const localData = localStorage.getItem(LOCAL_PRICE_LIST_KEY)
      if (localData) {
        setPriceList(JSON.parse(localData))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPriceList()
  }, [])

  // Format file size
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  // Handle File Selection (PDF only)
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Strict PDF check
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

    if (!isPdf) {
      alert('Invalid file format. Only PDF files (.pdf) are allowed for the Price List.')
      return
    }

    // Size limit check (25MB)
    if (file.size > 25 * 1024 * 1024) {
      alert('File size exceeds 25MB limit. Please upload a smaller PDF file.')
      return
    }

    await executeUpload(file)
  }

  // Upload file logic
  const executeUpload = async (file) => {
    setUploading(true)
    setUploadProgress('Preparing file upload...')

    try {
      let fileUrl = ''
      const bucketName = BUCKETS.PRICE_LIST || 'price-lists'

      try {
        setUploadProgress('Uploading document to Supabase Storage...')
        fileUrl = await uploadImage(file, bucketName, 'pricelist-')
      } catch (err) {
        console.warn('Storage bucket upload fallback:', err.message)
        // Fallback: Read file as Data URL if Supabase storage bucket isn't set up yet
        fileUrl = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.readAsDataURL(file)
        })
      }

      const fileData = {
        id: priceList?.id || Date.now().toString(),
        file_name: file.name,
        file_url: fileUrl,
        file_type: file.type || 'application/pdf',
        file_size: file.size,
        uploaded_at: new Date().toISOString()
      }

      setUploadProgress('Updating price list records...')

      // Attempt to save to Supabase table
      try {
        if (priceList?.id && priceList.id.length > 20) {
          // Update existing row
          const { error } = await supabase
            .from('price_list')
            .update(fileData)
            .eq('id', priceList.id)

          if (error) throw error
        } else {
          // Insert new row or replace all
          // First delete existing rows if single file policy
          await supabase.from('price_list').delete().neq('id', '00000000-0000-0000-0000-000000000000')

          const { error } = await supabase
            .from('price_list')
            .insert([{
              file_name: fileData.file_name,
              file_url: fileData.file_url,
              file_type: fileData.file_type,
              file_size: fileData.file_size,
              created_at: fileData.uploaded_at
            }])

          if (error) throw error
        }
      } catch (err) {
        console.warn('Database save fallback to localStorage:', err.message)
      }

      // Always save to localStorage as backup
      localStorage.setItem(LOCAL_PRICE_LIST_KEY, JSON.stringify(fileData))

      // Delete old file from storage if replacing
      if (priceList?.file_url && priceList.file_url.includes('supabase.co')) {
        try {
          await deleteImage(priceList.file_url, bucketName)
        } catch (e) {
          console.warn('Could not delete old price list from storage', e)
        }
      }

      setPriceList(fileData)
      alert('Price list uploaded successfully!')
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      setUploadProgress('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (replaceInputRef.current) replaceInputRef.current.value = ''
    }
  }

  // Handle Remove File
  const handleConfirmRemove = async () => {
    if (!priceList) return
    setDeleteLoading(true)

    try {
      // Delete from Supabase storage
      if (priceList.file_url && priceList.file_url.includes('supabase.co')) {
        const bucketName = BUCKETS.PRICE_LIST || 'price-lists'
        await deleteImage(priceList.file_url, bucketName)
      }

      // Delete from Supabase table
      try {
        await supabase
          .from('price_list')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000')
      } catch (err) {
        console.warn('DB delete error:', err)
      }

      // Clear localStorage
      localStorage.removeItem(LOCAL_PRICE_LIST_KEY)

      setPriceList(null)
      setDeleteConfirmOpen(false)
    } catch (err) {
      alert('Failed to remove price list: ' + err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  // Determine file icon
  const getFileIcon = (fileType = '', fileName = '') => {
    if (fileType.includes('pdf') || fileName.endsWith('.pdf')) {
      return <FileText color="#e11d48" size={32} />
    }
    if (fileType.includes('sheet') || fileType.includes('excel') || /\.(xlsx|xls|csv)$/i.test(fileName)) {
      return <FileSpreadsheet color="#16a34a" size={32} />
    }
    if (fileType.includes('image') || /\.(png|jpg|jpeg|webp)$/i.test(fileName)) {
      return <ImageIcon color="#2563eb" size={32} />
    }
    return <FileCode color="#d97706" size={32} />
  }

  // Get extension label
  const getExtLabel = (fileName = '') => {
    const ext = fileName.split('.').pop()
    return ext ? ext.toUpperCase() : 'FILE'
  }

  const isPdf = priceList?.file_type?.includes('pdf') || priceList?.file_name?.toLowerCase().endsWith('.pdf')
  const isImage = priceList?.file_type?.includes('image') || /\.(png|jpg|jpeg|webp)$/i.test(priceList?.file_name || '')

  // Handle viewing PDF safely (converts data: URL to Blob URL if necessary)
  const handleViewPdf = (e) => {
    e.preventDefault()
    if (!priceList?.file_url) return

    if (priceList.file_url.startsWith('data:')) {
      try {
        const parts = priceList.file_url.split(',')
        const mimeMatch = parts[0].match(/:(.*?);/)
        const mime = mimeMatch ? mimeMatch[1] : 'application/pdf'
        const bstr = atob(parts[1])
        let n = bstr.length
        const u8arr = new Uint8Array(n)
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n)
        }
        const blob = new Blob([u8arr], { type: mime })
        const blobUrl = URL.createObjectURL(blob)
        window.open(blobUrl, '_blank')
      } catch (err) {
        console.warn('Error opening data URL:', err)
        const pdfWindow = window.open('')
        pdfWindow?.document.write(
          `<iframe src="${priceList.file_url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%; position:absolute;" allowfullscreen></iframe>`
        )
      }
    } else {
      window.open(priceList.file_url, '_blank')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            📄 Price List Management
            <span className={styles.badge}>{priceList ? '1 Active' : '0 Files'}</span>
          </h1>
          <p className={styles.subtitle}>
            Upload, update, and manage your official store price list document.
          </p>
        </div>

        {priceList && (
          <div className={styles.actionsGroup}>
            <input
              type="file"
              ref={replaceInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              accept=".pdf,application/pdf"
            />
            <Button
              variant="outline"
              icon={<RefreshCw size={16} />}
              onClick={() => replaceInputRef.current?.click()}
              disabled={uploading}
            >
              Replace PDF File
            </Button>

            <Button
              variant="danger"
              icon={<Trash2 size={16} />}
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={uploading}
            >
              Remove File
            </Button>
          </div>
        )}
      </div>

      {/* Info Alert Box */}
      <div className={styles.infoAlert}>
        <Info className={styles.infoIcon} size={20} />
        <div>
          <strong>Single PDF File Policy:</strong> Only 1 PDF Price List document is kept active at a time. Uploading a new PDF will automatically replace the existing file. Customers and store managers can view or download the active PDF.
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className={styles.card} style={{ alignItems: 'center', padding: '60px' }}>
          <Spinner size="lg" />
          <p style={{ marginTop: '12px', color: 'var(--gray-500)' }}>Loading price list details...</p>
        </div>
      ) : priceList ? (
        /* State 2: File Uploaded and Active */
        <div className={styles.card}>
          <div className={styles.activeFileCard}>
            <div className={styles.fileMetaGroup}>
              <div className={styles.fileIconBox}>
                {getFileIcon(priceList.file_type, priceList.file_name)}
              </div>
              <div className={styles.fileDetails}>
                <div className={styles.fileName}>{priceList.file_name}</div>
                <div className={styles.fileMetaTags}>
                  <span className={`${styles.fileBadge} ${styles.statusActive}`}>
                    <CheckCircle2 size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    Active Price List
                  </span>
                  <span className={styles.fileBadge}>PDF</span>
                  <span className={styles.fileBadge}>{formatBytes(priceList.file_size)}</span>
                </div>
                <div className={styles.uploadTime}>
                  Uploaded on: {new Date(priceList.uploaded_at || Date.now()).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>

            <div className={styles.actionsGroup}>
              <Button variant="primary" icon={<ExternalLink size={16} />} onClick={handleViewPdf}>
                View / Open PDF
              </Button>

              <a
                href={priceList.file_url}
                download={priceList.file_name}
                style={{ textDecoration: 'none' }}
              >
                <Button variant="outline" icon={<Download size={16} />}>
                  Download PDF
                </Button>
              </a>
            </div>
          </div>

          {uploading && (
            <div className={styles.uploadProgress}>
              <Spinner size="sm" />
              <span>{uploadProgress}</span>
            </div>
          )}
        </div>
      ) : (
        /* State 1: No file uploaded yet (Dropzone) */
        <div className={styles.card}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            accept=".pdf,application/pdf"
          />

          <div
            className={styles.dropzoneContainer}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={styles.dropzoneIconWrapper}>
              <UploadCloud size={32} />
            </div>

            <h3 className={styles.dropzoneTitle}>
              Click to select or drop Price List PDF file
            </h3>
            <p className={styles.dropzoneSubtitle}>
              Upload your store price list in PDF format only (Max size 25MB)
            </p>

            <div className={styles.allowedFormats}>
              <span className={styles.formatTag}>PDF Document Only (.pdf)</span>
            </div>
          </div>

          {uploading && (
            <div className={styles.uploadProgress}>
              <Spinner size="sm" />
              <span>{uploadProgress}</span>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmRemove}
        loading={deleteLoading}
        title="Remove Price List?"
        message="Are you sure you want to remove the current active price list document? Users will not be able to view or download it until a new price list is uploaded."
      />
    </div>
  )
}
