# Brickling NFT metadata

The four images in `images/` correspond to ERC-1155 token IDs 0–3:

| Token ID | Creature | Rarity |
| --- | --- | --- |
| 0 | Mosskin | Common |
| 1 | Ripplefin | Rare |
| 2 | Cloudling | Epic |
| 3 | Solmane | Legendary |

## GitLab metadata workflow

The website continues to use its local assets. These hosted files are only for
the ERC-1155 metadata consumed by wallets, explorers, and marketplaces.

1. Prepare the final metadata:

   ```bash
   npm run metadata:prepare
   ```

2. Inspect the generated files in `metadata/upload/`.
3. Upload all four files to the GitLab repository's `metadata/` directory.
4. Put the public raw directory URL in `.env`:

   ```text
   NFT_METADATA_BASE_URI=https://gitlab.com/ptkspace-group/mystlab/-/raw/main/metadata
   ```

5. Verify every metadata URL returns JSON before deploying.

The metadata filenames are 64-character, lowercase, zero-padded hexadecimal IDs.
This is required for ERC-1155 `{id}` URI substitution.
