// this scrip will be used to backup the JSON file
// backup, means we take a JSON from the client
// it may have links, urls to their domains or other third party
// we need to download such and replace with data urls, so we can use it even when clients are offline

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Helper: guess MIME type from file extension (fallback to octet-stream)
function getMimeType(url) {
  try {
    // Use URL API to reliably extract pathname without querystring/hash
    const { pathname } = new URL(url);
    const ext = path.extname(pathname).toLowerCase();
    switch (ext) {
      case '.woff2':
        return 'font/woff2';
      case '.woff':
        return 'font/woff';
      case '.ttf':
        return 'font/ttf';
      case '.otf':
        return 'font/otf';
      case '.eot':
        return 'application/vnd.ms-fontobject';
      case '.svg':
        return 'image/svg+xml';
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.gif':
        return 'image/gif';
      case '.webp':
        return 'image/webp';
      case '.mp4':
        return 'video/mp4';
      default:
        return 'application/octet-stream';
    }
  } catch (e) {
    return 'application/octet-stream';
  }
}

// Cache to avoid downloading the same URL more than once
const cache = new Map();

async function urlToDataUrl(url) {
  // Skip if already data URL
  if (url.startsWith('data:')) return url;
  if (cache.has(url)) return cache.get(url);

  console.log(`Downloading: ${url}`);
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    // Prefer server-supplied content-type; otherwise guess
    const mimeType = response.headers['content-type'] || getMimeType(url);
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;
    cache.set(url, dataUrl);
    return dataUrl;
  } catch (err) {
    console.warn(`Failed to download ${url}:`, err.message);
    return url; // keep original URL if download fails
  }
}

// Load JSON input
const jsonFile = path.join(__dirname, 'test-data', 'private.json');
const json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

(async () => {
  // 1. Process font definitions
  if (Array.isArray(json.fonts)) {
    for (const font of json.fonts) {
      if (font.url) {
        font.url = await urlToDataUrl(font.url);
      }

      if (Array.isArray(font.styles)) {
        for (const style of font.styles) {
          if (style.src) {
            // Extract every url(...) occurrence and replace if remote
            const matches = [...style.src.matchAll(/url\(([^)]+)\)/g)];
            for (const match of matches) {
              let remoteUrl = match[1].trim().replace(/^['"]|['"]$/g, '');
              if (remoteUrl.startsWith('http')) {
                const dataUrl = await urlToDataUrl(remoteUrl);
                style.src = style.src.replace(remoteUrl, dataUrl);
              }
            }
          }
        }
      }
    }
  }

  // 2. Recursively traverse object to inline src/background/maskSrc URLs
  async function traverse(node) {
    if (Array.isArray(node)) {
      for (const item of node) {
        await traverse(item);
      }
      return;
    }
    if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === 'string' && value.startsWith('http')) {
          if (['src', 'maskSrc', 'background'].includes(key)) {
            node[key] = await urlToDataUrl(value);
          }
        } else if (typeof value === 'object') {
          await traverse(value);
        }
      }
    }
  }

  if (Array.isArray(json.pages)) {
    for (const page of json.pages) {
      await traverse(page);
    }
  }

  // 3. Write output
  const outputFile = path.join(__dirname, 'test-data', 'private-inline.json');
  fs.writeFileSync(outputFile, JSON.stringify(json, null, 2));
  console.log(`Backup created at ${outputFile}`);
})();
