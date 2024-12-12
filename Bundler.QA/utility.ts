import sharp from 'sharp';

export type ImageFormat =
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'tiff'
  | 'gif'
  | 'avif'
  | 'tiff';

function getRandomHexColor(): string {
  const randomColor = Math.floor(Math.random() * 16777215).toString(16);
  return `#${randomColor.padStart(6, '0')}`; // Ensure it's always 6 characters long
}

export async function createImage(
  width: number,
  height: number,
  format: ImageFormat = 'png',
): Promise<Buffer | null> {
  let buffer: Buffer | null = null;

  try {
    const image = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: getRandomHexColor(),
      },
    });

    buffer = await image[format]().toBuffer();
  } catch (exception) {
    console.error('Error creating image:', exception);
    throw new Error('Image creation failed');
  }

  return buffer;
}

export function randomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * chars.length);
    result += chars.charAt(index);
  }

  return result;
}
