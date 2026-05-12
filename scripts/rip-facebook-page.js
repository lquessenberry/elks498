import axios from "axios";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fbPageUrl = "https://www.facebook.com/jonesboro.elks/photos";
const outputDir = path.join(__dirname, "../public/images");
const dataDir = path.join(__dirname, "../src/content/facebook");

async function downloadImage(url, filename) {
  try {
    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: "https://www.facebook.com/",
      },
    });

    const filepath = path.join(outputDir, filename);
    const writer = fs.createWriteStream(filepath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (error) {
    console.error(`Error downloading ${url}:`, error.message);
    throw error;
  }
}

async function ripFacebookPage() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    console.log(`Navigating to Facebook page: ${fbPageUrl}`);
    await page.goto(fbPageUrl, { waitUntil: "networkidle", timeout: 60000 });

    // Wait for page to load
    await page.waitForTimeout(5000);

    // Scroll down to load more content
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    }

    // Extract all image URLs with their original Facebook URLs
    const imageData = await page.evaluate(() => {
      const data = [];
      const images = document.querySelectorAll('img[src*="scontent"]');
      images.forEach((img) => {
        const src = img.src;
        if (src && src.includes("scontent")) {
          // Find the parent link or container that has the Facebook post URL
          const parentLink = img.closest("a");
          const fbUrl = parentLink ? parentLink.href : null;

          data.push({
            src: src,
            fbUrl: fbUrl,
          });
        }
      });
      return data;
    });

    // Remove duplicates based on src
    const uniqueImages = [];
    const seenSrc = new Set();
    imageData.forEach((img) => {
      if (!seenSrc.has(img.src)) {
        seenSrc.add(img.src);
        uniqueImages.push(img);
      }
    });

    const imageUrls = uniqueImages.map((img) => img.src);
    console.log(`Found ${imageUrls.length} unique images`);

    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Download images using axios
    const downloadedImages = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      try {
        console.log(`Downloading image ${i + 1}/${imageUrls.length}: ${url}`);

        const filename = `fb-rip-${i + 1}.jpg`;
        await downloadImage(url, filename);

        // Verify file was downloaded and has content
        const filepath = path.join(outputDir, filename);
        const stats = fs.statSync(filepath);

        if (stats.size > 100) {
          downloadedImages.push({
            src: `/images/${filename}`,
            alt: `Facebook Photo ${i + 1}`,
            caption: `Photo from Jonesboro Elks Lodge #498 Facebook page`,
            fbUrl: uniqueImages[i].fbUrl,
          });
          console.log(`Downloaded: ${filename} (${stats.size} bytes)`);
        } else {
          console.log(
            `Skipping ${filename} - file too small (${stats.size} bytes)`,
          );
          fs.unlinkSync(filepath);
        }

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
      images: downloadedImages,
    };

    fs.writeFileSync(
      path.join(dataDir, "scraped-data.json"),
      JSON.stringify(metadata, null, 2),
    );

    console.log(`Successfully scraped ${downloadedImages.length} images`);
    console.log("Metadata saved to src/content/facebook/scraped-data.json");
  } catch (error) {
    console.error("Error ripping Facebook page:", error.message);
  } finally {
    await browser.close();
  }
}

ripFacebookPage();
