export const SCAN_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';

export function checkScanFile(file) {
  if (!file || !file.size) throw new Error('Choose a photo containing a complete academic question.');
  if (file.size >= 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type)
      && !/\.hei[cf]$/i.test(file.name)) throw new Error('Use a JPEG, PNG, WebP, or HEIC photo.');
}
