import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fbPageUrl = 'https://www.facebook.com/jonesboro.elks';
const outputDir = path.join(__dirname, '../public/images');
const dataDir = path.join(__dirname, '../src/content/facebook');

async function ripFacebookPage() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    console.log(`Navigating to Facebook page: ${fbPageUrl}`);
    await page.goto(fbPageUrl, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for page to load
    await page.waitForTimeout(5000);

    // Scroll down to load more content
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    }

    // Extract all image URLs
    const imageUrls = await page.evaluate(() => {
      const urls = new Set();
      const images = document.querySelectorAll('img[src*="scontent"]');
      images.forEach(img => {
        const src = img.src;
        if (src && src.includes('scontent')) {
          // Get high quality version
          const cleanUrl = src.split('?')[0];
          urls.add(cleanUrl);
        }
      });
      return Array.from(urls);
    });

    console.log(`Found ${imageUrls.length} unique images`);

    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Download images
    const downloadedImages = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      try {
        console.log(`Downloading image ${i + 1}/${imageUrls.length}`);
        
        const response = await page.goto(url);
        const buffer = await response.body();
        
        const filename = `fb-rip-${i + 1}.jpg`;
        const filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, buffer);
        
        downloadedImages.push({
          src: `/images/${filename}`,
          alt: `Facebook Photo ${i + 1}`,
          caption: `Photo from Jonesboro Elks Lodge #498 Facebook page`
        });
        
        console.log(`Downloaded: ${filename}`);
        
        // Add delay between downloads
        await page.waitForTimeout(500);
      } catch (error) {
        console.error(`Error downloading image ${i + 1}:`, error.message);
      }
    }

    // Save metadata
    const metadata = {
      scraped: new Date().toISOString(),
      totalImages: downloadedImages.length,
      images: downloadedImages
    };

    fs.writeFileSync(
      path.join(dataDir, 'scraped-data.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log(`Scraped ${downloadedImages.length} images`);
    console.log('Metadata saved to src/content/facebook/scraped-data.json');

  } catch (error) {
    console.error('Error ripping Facebook page:', error.message);
  } finally {
    await browser.close();
  }
}

ripFacebookPage();
