'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFileWithMetadata, getIPFSUrl } from '@/lib/ipfs';
import { Button } from '@/components/ui/Button';
import {
    Upload,
    File,
    X,
    CheckCircle,
    AlertCircle,
    Loader2,
    FileText,
    Image,
    Archive
} from 'lucide-react';

interface DeliverableUploadProps {
    onUpload: (ipfsHash: string) => void;
    acceptedTypes?: string[];
    maxSize?: number; // in MB
    disabled?: boolean;
}

const DEFAULT_ACCEPTED_TYPES = [
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
];

const DEFAULT_MAX_SIZE = 50; // 50MB

export function DeliverableUpload({
    onUpload,
    acceptedTypes = DEFAULT_ACCEPTED_TYPES,
    maxSize = DEFAULT_MAX_SIZE,
    disabled = false,
}: DeliverableUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [uploadedCid, setUploadedCid] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
        setError(null);

        if (rejectedFiles.length > 0) {
            const rejection = rejectedFiles[0];
            if (rejection.errors[0]?.code === 'file-too-large') {
                setError(`File is too large. Maximum size is ${maxSize}MB.`);
            } else if (rejection.errors[0]?.code === 'file-invalid-type') {
                setError('Invalid file type. Please upload PDF, ZIP, DOC, or image files.');
            } else {
                setError('Invalid file. Please try again.');
            }
            return;
        }

        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            setUploadedCid(null);
        }
    }, [maxSize]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
        maxSize: maxSize * 1024 * 1024,
        multiple: false,
        disabled: disabled || isUploading,
    });

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setProgress(0);
        setError(null);

        try {
            // Simulate progress (IPFS doesn't provide real progress)
            const progressInterval = setInterval(() => {
                setProgress(p => Math.min(p + 10, 90));
            }, 200);

            const { metadataCid, metadata } = await uploadFileWithMetadata(file);

            clearInterval(progressInterval);
            setProgress(100);
            setUploadedCid(metadataCid);

            // Call the onUpload callback with the metadata CID
            onUpload(metadataCid);
        } catch (err) {
            console.error('Upload failed:', err);
            setError('Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const clearFile = () => {
        setFile(null);
        setUploadedCid(null);
        setProgress(0);
        setError(null);
    };

    const getFileIcon = (fileType: string) => {
        if (fileType.startsWith('image/')) return Image;
        if (fileType.includes('zip') || fileType.includes('compressed')) return Archive;
        return FileText;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="space-y-4">
            {!file ? (
                <div
                    {...getRootProps()}
                    className={`
                        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                        ${isDragActive
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    <input {...getInputProps()} />
                    <Upload className="w-10 h-10 text-neutral-400 mx-auto mb-4" />
                    {isDragActive ? (
                        <p className="text-blue-600">Drop the file here...</p>
                    ) : (
                        <>
                            <p className="text-neutral-700 mb-2">Drag & drop your deliverable here</p>
                            <p className="text-sm text-neutral-500">or click to browse</p>
                            <p className="text-xs text-neutral-400 mt-4">
                                Supported: PDF, ZIP, DOC, Images | Max size: {maxSize}MB
                            </p>
                        </>
                    )}
                </div>
            ) : (
                <div className="bg-neutral-100 rounded-xl p-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-neutral-200">
                            {React.createElement(getFileIcon(file.type), {
                                className: 'w-6 h-6 text-neutral-600',
                            })}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-neutral-900 font-medium truncate">{file.name}</p>
                            <p className="text-sm text-neutral-500">
                                {formatFileSize(file.size)} | {file.type || 'Unknown type'}
                            </p>
                        </div>
                        {!uploadedCid && !isUploading && (
                            <button
                                onClick={clearFile}
                                className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Progress bar */}
                    {isUploading && (
                        <div className="mt-4">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-neutral-500">Uploading to IPFS...</span>
                                <span className="text-neutral-500">{progress}%</span>
                            </div>
                            <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Upload success */}
                    {uploadedCid && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-medium">Uploaded successfully!</span>
                            </div>
                            <a
                                href={getIPFSUrl(uploadedCid)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-green-600/80 hover:text-green-600 mt-1 block truncate"
                            >
                                CID: {uploadedCid}
                            </a>
                        </div>
                    )}

                    {/* Upload button */}
                    {!uploadedCid && (
                        <div className="mt-4 flex gap-3">
                            <Button
                                onClick={handleUpload}
                                isLoading={isUploading}
                                leftIcon={!isUploading ? <Upload className="w-4 h-4" /> : undefined}
                                className="flex-1"
                            >
                                {isUploading ? 'Uploading...' : 'Upload to IPFS'}
                            </Button>
                            <Button variant="outline" onClick={clearFile} disabled={isUploading}>
                                Cancel
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
