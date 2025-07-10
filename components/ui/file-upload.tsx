"use client"

import React, { useState, useRef, ChangeEvent } from 'react'
import { Button } from './button'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { UploadCloud, Loader2 } from 'lucide-react'

interface FileUploadProps {
  onFileUpload: (file: File) => Promise<void> | void
  allowedTypes?: string[]
  maxSizeMB?: number
  buttonText?: string
  loadingText?: string
  className?: string
  isLoading?: boolean
  showPreview?: boolean
  previewUrl?: string
  previewAlt?: string
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"],
  maxSizeMB = 5,
  buttonText = "ატვირთვა",
  loadingText = 'იტვირთება...',
  className,
  isLoading = false,
  showPreview = false,
  previewUrl,
  previewAlt = 'Preview'
}) => {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFile(file)
    }
    event.target.value = ''
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragOver(false)
    const file = event.dataTransfer.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleFile = (file: File) => {
    setError(null)

    if (!allowedTypes.includes(file.type)) {
      setError(`ფაილის ტიპი არ არის მხარდაჭერილი. გთხოვთ ატვირთოთ: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`)
      return
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`ფაილი ძალიან დიდია. მაქსიმალური ზომაა ${maxSizeMB}MB`)
      return
    }

    onFileUpload(file)
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragOver(false)
  }

  return (
    <div className={cn("w-full", className)}>
      <label
        htmlFor="file-upload"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer",
          "border-gray-600 hover:border-gray-500",
          "bg-gray-700 hover:bg-gray-600",
          dragOver && "border-blue-500 bg-blue-900/20",
          "transition-colors duration-200 ease-in-out"
        )}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
          <UploadCloud className="w-8 h-8 mb-3 text-gray-400" />
          <p className="mb-2 text-sm text-gray-400">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">
            {allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')} (MAX. {maxSizeMB}MB)
          </p>
        </div>
        <input 
          id="file-upload" 
          type="file" 
          className="hidden" 
          onChange={handleFileChange} 
          accept={allowedTypes.join(',')} 
          disabled={isLoading}
        />
      </label>
      {showPreview && previewUrl && (
        <div className="relative w-24 h-24 mx-auto overflow-hidden rounded-full mt-4">
          <Image
            src={previewUrl}
            alt={previewAlt}
            fill
            className="object-cover"
          />
        </div>
      )}
      {isLoading && (
        <div className="flex items-center justify-center mt-2 text-sm text-gray-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </div>
      )}
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
} 