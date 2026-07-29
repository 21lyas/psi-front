import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  loading?: boolean
}

export default function ConfirmDialog({ open, onClose, onConfirm, title = 'Confirm', message, loading }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={18} className="text-red-500" />
        </div>
        <p className="text-sm text-gray-600 pt-2">{message}</p>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="btn-secondary" disabled={loading}>Cancel</button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </Modal>
  )
}
