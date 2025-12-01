import axios from 'axios';

// ⚠️ SECURITY WARNING: 
// Pinata secret keys are currently exposed in the frontend.
// For production, move IPFS uploads to a backend API proxy to protect these credentials.
// This is a temporary solution for development/testing purposes.
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY;
const PINATA_API_URL = 'https://api.pinata.cloud';

export interface PostMetadata {
  content: string;
  author: string;
  timestamp: number;
  imageUrl?: string;
}

export const IPFSService = {
  /**
   * Upload image to IPFS via Pinata
   */
  uploadImage: async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const metadata = JSON.stringify({
        name: `BSN_Image_${Date.now()}`,
      });
      formData.append('pinataMetadata', metadata);

      const response = await axios.post(
        `${PINATA_API_URL}/pinning/pinFileToIPFS`,
        formData,
        {
          headers: {
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET_KEY,
          },
        }
      );

      return `ipfs://${response.data.IpfsHash}`;
    } catch (error) {
      console.error('Error uploading image to IPFS:', error);
      throw new Error('Failed to upload image to IPFS');
    }
  },

  /**
   * Upload post metadata to IPFS via Pinata
   */
  uploadMetadata: async (metadata: PostMetadata): Promise<string> => {
    try {
      const response = await axios.post(
        `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
        {
          pinataContent: metadata,
          pinataMetadata: {
            name: `BSN_Post_${Date.now()}`,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET_KEY,
          },
        }
      );

      return response.data.IpfsHash;
    } catch (error) {
      console.error('Error uploading metadata to IPFS:', error);
      throw new Error('Failed to upload metadata to IPFS');
    }
  },

  /**
   * Get IPFS URL for a hash using CORS-friendly gateways
   */
  getIPFSUrl: (hash: string): string => {
    // Use w3s.link gateway (CORS-friendly and reliable from web3.storage)
    return `https://w3s.link/ipfs/${hash}`;
  },
};
