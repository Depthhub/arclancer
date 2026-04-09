// IPFS Upload utility
// Supports: Pinata (recommended), or mock mode for development
//
// To enable real uploads:
// 1. Create a free account at https://app.pinata.cloud
// 2. Generate an API key with pinning permissions
// 3. Set NEXT_PUBLIC_PINATA_JWT in your .env.local

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';

if (!PINATA_JWT && typeof window !== 'undefined') {
    console.warn(
        '[ArcLancer] ⚠️ NEXT_PUBLIC_PINATA_JWT not set — IPFS uploads will use mock mode. Deliverables will not persist.\n' +
        '  → Get a free key at https://app.pinata.cloud'
    );
}

interface UploadResult {
    cid: string;
    url: string;
}

export interface FileMetadata {
    fileName: string;
    fileSize: number;
    fileType: string;
    uploadedAt: number;
    ipfsHash: string;
}

/**
 * Upload a file to IPFS via Pinata
 * Falls back to mock mode if PINATA_JWT is not configured
 */
export async function uploadToIPFS(file: File): Promise<string> {
    if (PINATA_JWT) {
        return uploadToPinata(file);
    }

    // Mock implementation for development
    return mockUpload(file.name);
}

/**
 * Upload to Pinata using their REST API
 * Docs: https://docs.pinata.cloud/api-reference/endpoint/upload-a-file
 */
async function uploadToPinata(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    // Add metadata for easier identification in Pinata dashboard
    const metadata = JSON.stringify({
        name: `arclancer-${file.name}`,
        keyvalues: {
            app: 'arclancer',
            type: file.type,
            uploadedAt: new Date().toISOString(),
        },
    });
    formData.append('pinataMetadata', metadata);

    // Pin options
    const options = JSON.stringify({
        cidVersion: 1,
    });
    formData.append('pinataOptions', options);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${PINATA_JWT}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');
        throw new Error(`Pinata upload failed (${response.status}): ${errorBody}`);
    }

    const result = await response.json();
    console.log(`[IPFS] Uploaded ${file.name} → ${result.IpfsHash}`);
    return result.IpfsHash;
}

/**
 * Upload JSON data to IPFS
 */
export async function uploadJSONToIPFS(data: object): Promise<string> {
    if (PINATA_JWT) {
        // Use Pinata's dedicated JSON pinning endpoint for efficiency
        const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${PINATA_JWT}`,
            },
            body: JSON.stringify({
                pinataContent: data,
                pinataMetadata: {
                    name: 'arclancer-metadata',
                    keyvalues: {
                        app: 'arclancer',
                        type: 'metadata',
                    },
                },
                pinataOptions: {
                    cidVersion: 1,
                },
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => 'Unknown error');
            throw new Error(`Pinata JSON upload failed (${response.status}): ${errorBody}`);
        }

        const result = await response.json();
        console.log(`[IPFS] Uploaded metadata → ${result.IpfsHash}`);
        return result.IpfsHash;
    }

    // Mock fallback
    return mockUpload('metadata.json');
}

/**
 * Upload file with metadata — uploads the file first, then a JSON metadata object
 */
export async function uploadFileWithMetadata(file: File): Promise<{ metadataCid: string; metadata: FileMetadata }> {
    // Upload the actual file
    const fileCid = await uploadToIPFS(file);

    // Create metadata
    const metadata: FileMetadata = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: Date.now(),
        ipfsHash: fileCid,
    };

    // Upload metadata
    const metadataCid = await uploadJSONToIPFS(metadata);

    return { metadataCid, metadata };
}

/**
 * Get IPFS gateway URL for a CID
 */
export function getIPFSUrl(cid: string): string {
    if (PINATA_JWT && PINATA_GATEWAY) {
        // Use dedicated Pinata gateway for faster retrieval
        return `https://${PINATA_GATEWAY}/ipfs/${cid}`;
    }
    // Public fallback gateways
    return `https://ipfs.io/ipfs/${cid}`;
}

/**
 * Fetch metadata from IPFS
 */
export async function fetchIPFSMetadata(cid: string): Promise<FileMetadata | null> {
    try {
        const url = getIPFSUrl(cid);
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error(`Failed to fetch (${response.status})`);
        return await response.json();
    } catch (error) {
        console.warn('[IPFS] Failed to fetch metadata, returning mock:', error);

        // Return mock data for development
        return {
            fileName: 'deliverable.pdf',
            fileSize: 1024000,
            fileType: 'application/pdf',
            uploadedAt: Date.now(),
            ipfsHash: cid,
        };
    }
}

// ---- Mock helpers ----

async function mockUpload(fileName: string): Promise<string> {
    const mockCid = `Qm${generateMockHash(46)}`;
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log(`[MOCK IPFS] Uploaded ${fileName} as ${mockCid}`);
    return mockCid;
}

function generateMockHash(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
