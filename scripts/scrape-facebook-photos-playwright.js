import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fbPhotoUrls = [
  'https://www.facebook.com/photo?fbid=1385815206916574&set=a.613858704112232',
  'https://www.facebook.com/photo/?fbid=1385620770269351&set=a.613858704112232',
  'https://www.facebook.com/photo/?fbid=1372493398248755&set=a.613858704112232'
];

const outputDir = path.join(__dirname, '../public/images');

async function scrapeFacebookPhoto(url, index) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    console.log(`Navigating to photo ${index + 1}/${fbPhotoUrls.length}: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for image to load
    await page.waitForTimeout(3000);

    // Try to find the image
    const imageUrl = await page.evaluate(() => {
      // Look for the main photo image
      const img = document.querySelector('img[src*="scontent"]');
      return img ? img.src : null;
    });

    if (imageUrl) {
      console.log(`Found image URL: ${imageUrl}`);
      
      // Download the image
      const response = await page.goto(imageUrl);
      const buffer = await response.body();
      
      const filename = `fb-photo-${index + 1}.jpg`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, buffer);
      
      console.log(`Downloaded: ${filename}`);
      return imageUrl;
    } else {
      console.log('No image URL found - may need authentication');
      return null;
    }
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    return null;
  } finally {
    await browser.close();
  }
}

async function main() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (let i = 0; i < fbPhotoUrls.length; i++) {
    await scrapeFacebookPhoto(fbPhotoUrls[i], i);
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('Done!');
}

main();
