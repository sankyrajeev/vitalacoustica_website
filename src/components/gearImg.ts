/** Equipment photo: 'sm' (480 px) for cards and lists, full (800 px) for the item page. */
export const gearImg = (file: string, size: 'sm' | 'full' = 'full') =>
  `${import.meta.env.BASE_URL}gear/${size === 'sm' ? 'sm/' : ''}${file}`
