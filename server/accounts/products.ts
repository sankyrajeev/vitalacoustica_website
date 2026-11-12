// The software we sell and license, as the server sees it. The website's shop pages describe
// the same products (src/content/shop.ts, same ids).
//
// keyPrefix   the start of each licence key: VNTA-XXXXX-XXXXX-XXXXX-XXXXX
// licenceName the "product" written into signed licence files; each app checks it (VANTA checks "VANTA")
// signingKey  the environment secret holding this product's private signing key (see docs/accounts.md)
// releases    the GitHub repository whose latest release holds the installers; downloads stay
//             private and are handed only to owners, through short-lived links
// format      the signed licence each app understands:
//             'vanta' VANTA's licence file (RSA; JUCE apps: VANTA, VANTA Dynamics, ORBIT, Lumière Link)
//             'pf1'   Pixel Forge's PF1.<payload>.<signature> token (Ed25519), locked to the computer
// leaseDays   pf1 only: the token says when the app must check in again ("r"), so a computer freed
//             from the account page stops outputting even if it stays offline

export type ProductId = 'vanta' | 'vanta-dynamics' | 'orbit' | 'lumiere-link' | 'pixel-forge'

export type LicensedProduct = {
  id: ProductId
  name: string
  keyPrefix: string
  licenceName: string
  maxDevices: number
  signingKey: string
  releases?: string
  format: 'vanta' | 'pf1'
  leaseDays?: number
}

export const PRODUCTS: Record<ProductId, LicensedProduct> = {
  vanta: { id: 'vanta', name: 'VANTA', keyPrefix: 'VNTA', licenceName: 'VANTA', maxDevices: 2, signingKey: 'LICENCE_KEY_VANTA', releases: '', format: 'vanta' },
  'vanta-dynamics': {
    id: 'vanta-dynamics',
    name: 'VANTA Dynamics',
    keyPrefix: 'VDYN',
    licenceName: 'VANTA Dynamics',
    maxDevices: 2,
    signingKey: 'LICENCE_KEY_VANTA',
    releases: '',
    format: 'vanta',
  },
  orbit: { id: 'orbit', name: 'ORBIT', keyPrefix: 'ORBT', licenceName: 'ORBIT', maxDevices: 2, signingKey: 'LICENCE_KEY_ORBIT', releases: '', format: 'vanta' },
  'lumiere-link': {
    id: 'lumiere-link',
    name: 'Lumière Link',
    keyPrefix: 'LUMI',
    licenceName: 'Lumiere Link',
    maxDevices: 2,
    signingKey: 'LICENCE_KEY_LUMIERE',
    releases: '',
    format: 'vanta',
  },
  // demo mode on any number of computers; output to fixtures on one licensed computer at a time
  'pixel-forge': {
    id: 'pixel-forge',
    name: 'Pixel Forge',
    keyPrefix: 'PXFG',
    licenceName: 'Pixel Forge',
    maxDevices: 1,
    signingKey: 'LICENCE_KEY_PIXELFORGE',
    releases: '',
    format: 'pf1',
    leaseDays: 30,
  },
}

export const isProduct = (id: string): id is ProductId => id in PRODUCTS
