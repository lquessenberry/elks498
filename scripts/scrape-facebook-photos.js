import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fbPhotoUrls = [
  "https://www.facebook.com/photo?fbid=1385815206916574&set=a.613858704112232",
  "https://www.facebook.com/photo/?fbid=1385620770269351&set=a.613858704112232",
  "https://www.facebook.com/photo/?fbid=1372493398248755&set=a.613858704112232",
];

const outputDir = path.join(__dirname, "../public/images");

async function scrapeFacebookPhoto(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const $ = cheerio.load(response.data);

    // Look for high-quality image URLs in the page
    const imageUrl = $('img[src*="scontent"]').first().attr("src");

    if (imageUrl) {
      // Try to get the highest quality version by replacing URL parameters
      const highQualityUrl = imageUrl
        .replace(/\/[a-z]\d+\//, "/o/")
        .replace(/\?.*$/, "");
      return highQualityUrl || imageUrl;
    }

    return null;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    return null;
  }
}

async function downloadImage(url, filename) {
  try {
    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
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
  }
}

async function main() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (let i = 0; i < fbPhotoUrls.length; i++) {
    const url = fbPhotoUrls[i];
    console.log(`Scraping photo ${i + 1}/${fbPhotoUrls.length}: ${url}`);

    const imageUrl = await scrapeFacebookPhoto(url);

    if (imageUrl) {
      console.log(`Found image URL: ${imageUrl}`);
      const filename = `fb-photo-${i + 1}.jpg`;
      await downloadImage(imageUrl, filename);
      console.log(`Downloaded: ${filename}`);
    } else {
      console.log("No image URL found");
    }

    // Add delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("Done!");
}

main();
