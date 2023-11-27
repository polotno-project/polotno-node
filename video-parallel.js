const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const path = require('path');

const downloadVideo = async (url, destination) => {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream',
  });

  const writer = response.data.pipe(fs.createWriteStream(destination));

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};

// 2. Convert it into webm format

const convertToWebM = (input, output) => {
  console.log(input, output);
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .outputOptions(['-c:v libvpx', '-crf 30', '-b:v 1000k'])
      .output(output)
      .on('start', () => {})
      .on('end', () => {
        resolve();
      })
      .on('error', (err) => {
        console.log('Error occurred: ' + err.message);
        reject(err);
      })
      .run();
  });
};

// 3. Serialize file into dataurl string
const fileToDataUrl = (filename) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, 'base64', (err, data) => {
      if (err) reject(err);
      resolve(`data:video/webm;base64,${data}`);
    });
  });
};

const videoToDataURL = async (url) => {
  console.log('downloading', url);
  const filename = Math.random().toString(36).substring(7);
  const destination = path.join('./tmp', filename + '.mp4');
  await downloadVideo(url, destination);
  const webmFile = destination.replace('.mp4', '.webm');
  console.log('converting to webm', url);
  await convertToWebM(destination, webmFile);
  const dataUrl = await fileToDataUrl(webmFile);
  return dataUrl;
};

function printProgress(progress) {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write('Rendering frame: ' + progress + '%');
}

module.exports.jsonToVideo = async function jsonToVideo(
  createInstance,
  json,
  attrs
) {
  try {
    fs.rmSync('./tmp', { recursive: true });
  } catch (e) {}

  fs.mkdirSync('./tmp', { recursive: true });

  for (const page of json.pages) {
    for (const el of page.children) {
      if (el.type === 'video') {
        el.src = await videoToDataURL(el.src);
      }
    }
  }

  const duration = json.pages.reduce((acc, page) => {
    return acc + page.duration;
  }, 0);
  const parallel = attrs.parallel || 5;

  const fps = attrs.fps || 15;
  const timePerFrame = 1000 / fps;

  // loop through the images and add each to the animation
  const framesNumber = Math.floor((duration / 1000) * fps);
  const frames = Array.from(Array(framesNumber).keys());

  // split frames into parallel chunks
  const chunkSize = Math.ceil(framesNumber / parallel);
  const chunks = [];
  for (let i = 0; i < framesNumber; i += chunkSize) {
    chunks.push(frames.slice(i, i + chunkSize));
  }

  const pages = json.pages.map((p, index) => {
    const previousPage = json.pages[index - 1];
    const startTime = previousPage
      ? previousPage.startTime + previousPage.duration
      : 0;
    return {
      id: p.id,
      startTime,
      duration: p.duration,
    };
  });

  let finishedFramesNumber = 0;

  await Promise.all(
    chunks.map(async (chunk, chunkIndex) => {
      const instance = await createInstance();
      const page = await instance.createPage();
      await page.evaluate(async (json) => {
        store.loadJSON(json);
        await store.waitLoading();
        await new Promise((resolve) => {
          setTimeout(resolve, 100);
        });
      }, json);

      let lastPageIndex = -1;
      for (const frameIndex of chunk) {
        let currentTime = frameIndex * timePerFrame;
        if (frameIndex === 0) {
          // offset the very first frame to enable animation start
          currentTime = 1;
        }
        if (frameIndex === framesNumber - 1) {
          // offset the very last frame to enable animation end
          currentTime = duration - 1;
        }
        const storePageIndex = pages.findIndex((p) => {
          return (
            currentTime >= p.startTime && currentTime < p.startTime + p.duration
          );
        });
        if (storePageIndex !== lastPageIndex) {
          await page.evaluate(async (currentTime) => {
            store.setCurrentTime(currentTime);
            await store.waitLoading();
            if (window.config.unstable_setTextOverflow) {
              window.config.unstable_setTextOverflow('resize');
            } else {
              // console.error(
              //   'Can not set text overflow mode. Define window.config.unstable_setTextOverflow function'
              // );
            }
          });
        }
        const dataURL = await page.evaluate(
          async (json, attrs, currentTime) => {
            store.setCurrentTime(currentTime);
            const currentPage = store.pages.find((p) => {
              return (
                store.currentTime >= p.startTime &&
                store.currentTime < p.startTime + p.duration
              );
            });
            const url = await store.toDataURL({
              pixelRatio: 0.5,
              ...attrs,
              pageId: currentPage?.id,
            });
            return url;
          },
          json,
          attrs || {},
          currentTime
        );
        fs.mkdirSync('./tmp', { recursive: true });
        fs.writeFileSync(
          `./tmp/${frameIndex}.png`,
          dataURL.split(',')[1],
          'base64'
        );
        finishedFramesNumber += 1;
        const progress = ((finishedFramesNumber / framesNumber) * 100).toFixed(
          1
        );
        printProgress(progress);
      }
      // TODO: why can't we just close the one created page?
      // const browserPages = await instance.browser.pages();
      // for (let i = 0; i < browserPages.length; i++) {
      //   await browserPages[i].close();
      // }
      await page.close();
      if (!attrs.keepInstance) {
        await instance.close();
      }
    })
  );

  // for (let i = 0; i < frames; i++) {
  //   let currentTime = i * timePerFrame;
  //   if (i === 0) {
  //     // offset the very first frame to enable animation start
  //     currentTime = 1;
  //   }
  //   if (i === frames - 1) {
  //     // offset the very last frame to enable animation end
  //     currentTime = duration - 1;
  //   }

  //   const dataURL = await page.evaluate(
  //     async (json, attrs, currentTime) => {
  //       store.setCurrentTime(currentTime);
  //       const currentPage = store.pages.find((p) => {
  //         return (
  //           store.currentTime >= p.startTime &&
  //           store.currentTime < p.startTime + p.duration
  //         );
  //       });
  //       const url = await store.toDataURL({
  //         pixelRatio: 0.5,
  //         ...attrs,
  //         pageId: currentPage?.id,
  //       });
  //       return url;
  //     },
  //     json,
  //     attrs || {},
  //     currentTime
  //   );
  //   const progress = ((i / (frames - 1)) * 100).toFixed(1);
  //   printProgress(progress);
  //   fs.mkdirSync('./tmp', { recursive: true });
  //   fs.writeFileSync(`./tmp/${i}.png`, dataURL.split(',')[1], 'base64');
  // }

  console.log('\nRendering video');

  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(`./tmp/%d.png`) // Make sure your images are named with numbers, e.g. 1.jpg, 2.jpg, etc.
      .inputFPS(fps)
      .videoCodec('libx264')
      .outputOptions('-pix_fmt yuv420p')
      .format('mp4')
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(attrs.out);
  });

  fs.rmSync('./tmp', { recursive: true });
};
