'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchIPFSMetadata, getIPFSUrl } from '@/lib/ipfs';
import {
    ExternalLink,
    Download,
    FileText,
    Image,
    Archive,
    Loader2,
    AlertCircle
} from 'lucide-react';

interface DeliverableViewerProps {
    ipfsHash: string;
    showPreview?: boolean;
}

export function DeliverableViewer({ ipfsHash, showPreview = false }: DeliverableViewerProps) {
    const { data: metadata, isLoading, error } = useQuery({
        queryKey: ['ipfs-metadata', ipfsHash],
        queryFn: () => fetchIPFSMetadata(ipfsHash),
        enabled: !!ipfsHash,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    const getFileIcon = (fileType: string) => {
        if (fileType?.startsWith('image/')) return Image;
        if (fileType?.includes('zip') || fileType?.includes('compressed')) return Archive;
        return FileText;
    };

    const formatFileSize = (bytes: number) => {
        if (!bytes) return 'Unknown size';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (timestamp: number) => {
        if (!timestamp) return 'Unknown date';
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading) {
        return (
            <div className="p-4 bg-neutral-100 rounded-xl">
                <div className="flex items-center gap-3 text-neutral-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading deliverable...</span>
                </div>
            </div>
        );
    }

    if (error || !metadata) {
        return (
            <div className="p-4 bg-neutral-100 rounded-xl">
                <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <div>
                        <p className="text-neutral-700">Could not load deliverable details</p>
                        <a
                            href={getIPFSUrl(ipfsHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
                        >
                            View on IPFS <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    const FileIcon = getFileIcon(metadata.fileType);
    const fileUrl = getIPFSUrl(metadata.ipfsHash);
    const isImage = metadata.fileType?.startsWith('image/');
    const isPdf = metadata.fileType === 'application/pdf';

    return (
        <div className="bg-neutral-100 rounded-xl overflow-hidden">
            {/* File info header */}
            <div className="p-4 border-b border-neutral-200">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-neutral-200">
                        <FileIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-neutral-900 font-medium truncate">{metadata.fileName}</p>
                        <div className="flex flex-wrap gap-2 text-sm text-neutral-500 mt-1">
                            <span>{formatFileSize(metadata.fileSize)}</span>
                            <span>|</span>
                            <span>{metadata.fileType || 'Unknown type'}</span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-1">
                            Uploaded: {formatDate(metadata.uploadedAt)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Preview section */}
            {showPreview && (isImage || isPdf) && (
                <div className="p-4 border-b border-neutral-200">
                    {isImage && (
                        <div className="relative w-full max-h-96 overflow-hidden rounded-lg bg-neutral-200">
                            <img
                                src={fileUrl}
                                alt={metadata.fileName}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </div>
                    )}
                    {isPdf && (
                        <iframe
                            src={fileUrl}
                            title={metadata.fileName}
                            className="w-full h-96 rounded-lg bg-white"
                        />
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="p-4 flex flex-wrap gap-3">
                <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                    <ExternalLink className="w-4 h-4" />
                    View Full File
                </a>
                <a
                    href={fileUrl}
                    download={metadata.fileName}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-lg transition-colors text-sm font-medium"
                >
                    <Download className="w-4 h-4" />
                    Download
                </a>
            </div>

            {/* IPFS CID */}
            <div className="px-4 pb-4">
                <p className="text-xs text-neutral-400">
                    IPFS CID: <span className="font-mono">{ipfsHash.slice(0, 20)}...</span>
                </p>
            </div>
        </div>
    );
}
