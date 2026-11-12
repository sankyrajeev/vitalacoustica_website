// The software we sell and license, as the server sees it. The website's shop pages describe
// the same products (src/content/shop.ts, same ids).
//
// keyPrefix   the start of each licence key: VNTA-XXXXX-XXXXX-XXXXX-XXXXX
// licenceName the "product" written into signed licence files; each app checks it (VANTA checks "VANTA")
// signingKey  the environment secret holding this product's private signing key (see docs/accounts.md)
// releases    the GitHub repository whose latest release holds the installers; downloads stay
//             private and are handed only to owners, through short-lived links

export type ProductId = 'vanta' | 'vanta-dynamics' | 'orbit' | 'lumiere-link'

export type LicensedProduct = {
  id: ProductId
  name: string
  keyPrefix: string
  licenceName: string
  maxDevices: number
  signingKey: string
  releases?: string
}

export const PRODUCTS: Record<ProductId, LicensedProduct> = {
  vanta: { id: 'vanta', name: 'VANTA', keyPrefix: 'VNTA', licenceName: 'VANTA', maxDevices: 2, signingKey: 'LICENCE_KEY_VANTA', releases: '' },
  'vanta-dynamics': {
    id: 'vanta-dynamics',
    name: 'VANTA Dynamics',
    keyPrefix: 'VDYN',
    licenceName: 'VANTA Dynamics',
    maxDevices: 2,
    signingKey: 'LICENCE_KEY_VANTA',
    releases: '',
  },
  orbit: { id: 'orbit', name: 'ORBIT', keyPrefix: 'ORBT', licenceName: 'ORBIT', maxDevices: 2, signingKey: 'LICENCE_KEY_ORBIT', releases: '' },
  'lumiere-link': {
    id: 'lumiere-link',
    name: 'Lumière Link',
    keyPrefix: 'LUMI',
    licenceName: 'Lumiere Link',
    maxDevices: 2,
    signingKey: 'LICENCE_KEY_LUMIERE',
    releases: '',
  },
}

export const isProduct = (id: string): id is ProductId => id in PRODUCTS
