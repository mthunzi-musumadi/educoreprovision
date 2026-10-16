import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  File,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Trash2,
  Download,
  Loader2,
  Paperclip,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ApplicationAttachment } from '../../types';

interface FileUploadZoneProps {
  applicationId?: string;
  attachments?: ApplicationAttachment[];
  onUpload?: (file: File) => Promise<void>;
  onDelete?: (attachmentId: string) => Promise<void>;
  readOnly?: boolean;
  label?: string;
  description?: string;
  required?: boolean;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  applicationId,
  attachments = [],
  onUpload,
  onDelete,
  readOnly = false,
  label = 'Supporting Documents & Receipts',
  description = 'Attach itemized receipts, doctor invoices, quotations, or approved documents (PDF, PNG, JPG, DOCX, XLSX up to 15MB).',
  required = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFileIcon = (mimeType: string, fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (mimeType.includes('pdf') || ext === 'pdf') {
      return <FileText className="w-5 h-5 text-red-500 shrink-0" />;
    }
    if (mimeType.includes('sheet') || mimeType.includes('excel') || ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />;
    }
    if (mimeType.includes('image') || ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
      return <ImageIcon className="w-5 h-5 text-sky-500 shrink-0" />;
    }
    return <File className="w-5 h-5 text-slate-500 shrink-0" />;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !onUpload) return;
    setUploadError(null);
    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 15 * 1024 * 1024) {
          throw new Error(`File "${file.name}" exceeds the 15MB size limit.`);
        }
        await onUpload(file);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!readOnly) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!readOnly) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-sky-600" />
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
        </label>
        {attachments.length > 0 && (
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            {attachments.length} {attachments.length === 1 ? 'file' : 'files'} attached
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500">{description}</p>

      {/* Upload Dropzone */}
      {/* Upload Dropzone */}
      {!readOnly && (
        <motion.div
          animate={{ scale: isDragging ? 1.015 : 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-sky-500 bg-sky-50/70 shadow-sm'
              : 'border-slate-300 hover:border-sky-400 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv"
          />

          <div className="flex flex-col items-center justify-center gap-2">
            {isUploading ? (
              <>
                <Loader2 className="w-7 h-7 text-sky-600 animate-spin" />
                <span className="text-xs font-semibold text-sky-700">Uploading document(s)...</span>
              </>
            ) : (
              <>
                <motion.div
                  animate={{ scale: isDragging ? 1.15 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shadow-xs"
                >
                  <Upload className="w-5 h-5" />
                </motion.div>
                <div>
                  <span className="text-xs font-bold text-sky-700 hover:underline">
                    Click to upload
                  </span>{' '}
                  <span className="text-xs text-slate-500">or drag and drop</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  PDF, DOCX, XLSX, PNG or JPG (Max 15MB per file)
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Error banner */}
      <AnimatePresence>
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 overflow-hidden"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{uploadError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List of Attachments */}
      {attachments.length > 0 ? (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {attachments.map((att) => (
              <motion.div
                key={att.id}
                layout
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94, height: 0, marginBottom: 0, overflow: 'hidden' }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  {getFileIcon(att.mime_type, att.file_name)}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate" title={att.file_name}>
                      {att.file_name}
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>{formatFileSize(att.file_size_bytes)}</span>
                      <span>·</span>
                      <span>{att.uploader_name ? `Uploaded by ${att.uploader_name}` : 'Uploaded'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <motion.a
                    href={`/api/attachments/${att.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    download={att.file_name}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    className="p-1.5 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-md transition cursor-pointer"
                    title="Download / View document"
                  >
                    <Download className="w-4 h-4" />
                  </motion.a>

                  {!readOnly && onDelete && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete "${att.file_name}"?`)) {
                          onDelete(att.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer"
                      title="Remove attachment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : readOnly ? (
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs text-slate-500">
          No supporting documents attached to this application.
        </div>
      ) : null}
    </div>
  );
};
