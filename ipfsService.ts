import axios from 'axios';

// The Pinata secret is sent from the browser. Proxy this through a server
// before treating the deployment as production.
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
  uploadImage: async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const metadata = JSON.stringify({
        name: `SSN_Image_${Date.now()}`,
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

  uploadMetadata: async (metadata: PostMetadata): Promise<string> => {
    try {
      const response = await axios.post(
        `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
        {
          pinataContent: metadata,
          pinataMetadata: {
            name: `SSN_Post_${Date.now()}`,
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

  // w3s.link allows browser fetches. Several other public gateways do not.
  getIPFSUrl: (hash: string): string => {
    return `https://w3s.link/ipfs/${hash}`;
  },
};
