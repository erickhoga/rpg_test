// Arquivos relativos a public/. Use null para manter a arte provisória.
// PNG estático: { src: 'sprites/hero.png' }
// Spritesheet horizontal: { src: 'sprites/hero.png', frameWidth: 32,
//   frameHeight: 32, frames: 4, fps: 8, row: 0, scale: 1 }
export const spriteConfig = { hero: null, slime: null, bat: null, boss: null };
const cache = new Map();
export function drawSprite(ctx, type, x, y, size, time = performance.now()) {
  const config = spriteConfig[type];
  if (!config?.src) return false;
  if (!cache.has(type)) {
    const image = new Image();
    image.src = `${import.meta.env.BASE_URL}${config.src}`;
    cache.set(type, image);
  }
  const image = cache.get(type);
  if (!image.complete || !image.naturalWidth) return false;
  const fw = config.frameWidth || image.naturalWidth;
  const fh = config.frameHeight || image.naturalHeight;
  const frame =
    Math.floor((time / 1000) * (config.fps || 8)) % (config.frames || 1);
  const scale = config.scale || 1,
    height = size * scale,
    width = (height * fw) / fh;
  ctx.drawImage(
    image,
    frame * fw,
    (config.row || 0) * fh,
    fw,
    fh,
    x + (size - width) / 2,
    y + size - height,
    width,
    height,
  );
  return true;
}
