import { Router } from 'express';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

const NFT_IMAGE_PATH = resolve(__dirname, '../../assets/donny_ticket_final.jpg');
const NFT_COLLECTION_NAME = 'DonnySwap Fractional Ownership';
const NFT_DESCRIPTION =
  'DSFO NFT representing fractional ownership of the DonnySwap decentralized exchange on PEAQ. ' +
  'Holders earn a share of all trading fees proportional to their NFT count.';
const NFT_EXTERNAL_URL = 'https://donnyswap.xyz/mint-DSFO-NFTs';

const buildImageUrl = (req) => {
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('host');
  return `${proto}://${host}/api/nft/image`;
};

// GET /nft/metadata/:tokenId — ERC721-compliant JSON metadata
router.get('/nft/metadata/:tokenId', (req, res) => {
  const tokenId = Number(req.params.tokenId);

  if (!Number.isInteger(tokenId) || tokenId <= 0) {
    return res.status(400).json({ error: 'tokenId must be a positive integer' });
  }

  const imageUrl = buildImageUrl(req);

  res.json({
    name: `${NFT_COLLECTION_NAME} #${tokenId}`,
    description: NFT_DESCRIPTION,
    image: imageUrl,
    external_url: NFT_EXTERNAL_URL,
    attributes: [
      { trait_type: 'Token ID', value: tokenId },
      { trait_type: 'Collection', value: 'DSFO' },
      { trait_type: 'Chain', value: 'PEAQ' },
    ],
  });
});

// GET /nft/image — serves the NFT image directly
router.get('/nft/image', (req, res) => {
  res.sendFile(NFT_IMAGE_PATH, (err) => {
    if (err) {
      console.error('Error serving NFT image:', err);
      if (!res.headersSent) {
        res.status(404).json({ error: 'Image not found' });
      }
    }
  });
});

export default router;
