import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const logo = join(root, "public", "logo.png");
const publicDir = join(root, "public");

const BRAND_BG = { r: 10, g: 31, b: 29 };

async function main() {
  await sharp(logo).resize(32, 32).png().toFile(join(publicDir, "favicon-32.png"));

  await sharp(logo)
    .resize(48, 48)
    .png()
    .toFile(join(publicDir, "favicon-48.png"));

  await sharp(logo)
    .resize(180, 180)
    .png()
    .toFile(join(publicDir, "apple-touch-icon.png"));

  await sharp(logo)
    .resize(192, 192)
    .png()
    .toFile(join(publicDir, "icon-192.png"));

  await sharp(logo)
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, "icon-512.png"));

  const logoOg = await sharp(logo).resize(320, 320).png().toBuffer();

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 3,
      background: BRAND_BG,
    },
  })
    .composite([
      { input: logoOg, top: 155, left: 440 },
      {
        input: Buffer.from(
          `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="g1" cx="20%" cy="0%" r="60%">
                <stop offset="0%" stop-color="#1a6b63" stop-opacity="0.5"/>
                <stop offset="100%" stop-color="transparent"/>
              </radialGradient>
              <radialGradient id="g2" cx="90%" cy="30%" r="50%">
                <stop offset="0%" stop-color="#59c38b" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="transparent"/>
              </radialGradient>
            </defs>
            <rect width="1200" height="630" fill="url(#g1)"/>
            <rect width="1200" height="630" fill="url(#g2)"/>
            <text x="600" y="520" text-anchor="middle" font-family="system-ui,sans-serif" font-size="42" font-weight="700" fill="#ffffff">Apuntado</text>
            <text x="600" y="570" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" fill="#94a3b8">Citas por WhatsApp · Honduras</text>
          </svg>`
        ),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toFile(join(publicDir, "og.png"));

  console.log("Icons generated in public/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
