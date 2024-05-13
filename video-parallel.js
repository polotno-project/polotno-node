const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const path = require('path');

const tmp = require('tmp');
tmp.setGracefulCleanup();

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

const videoToDataURL = async (url, tempFolder) => {
  const shortUrl = url.slice(0, 50) + '...';
  console.log('Downloading video: ' + shortUrl);
  const filename = Math.random().toString(36).substring(7);
  const destination = path.join(tempFolder.name, filename + '.mp4');
  await downloadVideo(url, destination);
  console.log('Converting video to webm: ' + shortUrl);
  const webmFile = destination.replace('.mp4', '.webm');
  await convertToWebM(destination, webmFile);
  fs.unlinkSync(destination);
  const dataURL = await fileToDataUrl(webmFile);
  console.log('Downloading video finished: ' + url.slice(0, 50) + '...');
  return {
    dataURL,
    file: webmFile,
  };
};

const urlCache = {};
const cachedVideoToDataURL = async (url, tempFolder) => {
  if (!urlCache[url]) {
    urlCache[url] = videoToDataURL(url, tempFolder);
  }
  return urlCache[url];
};

module.exports.jsonToVideo = async function jsonToVideo(inst, json, attrs) {
  const tempFolder = tmp.dirSync();
  // const tempFolder = {
  //   name: './temp',
  // };

  try {
    const videoEls = [];

    for (const page of json.pages) {
      for (const el of page.children) {
        if (el.type === 'video') {
          videoEls.push(el);
        }
      }
    }

    await Promise.all(
      videoEls.map(async (el) => {
        const { dataURL, file } = await cachedVideoToDataURL(
          el.src,
          tempFolder
        );
        el.src = dataURL;
        el.file = file;
      })
    );

    const duration = json.pages.reduce((acc, page) => {
      return acc + (page.duration ?? 5000);
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
        const instance = typeof inst === 'function' ? await inst() : inst;
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
              currentTime >= p.startTime &&
              currentTime < p.startTime + p.duration
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
          const startTime = Date.now();
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
                ...attrs,
                _skipTimeout: true,
                mimeType: 'image/jpeg',
                pageId: currentPage?.id,
              });
              return url;
            },
            json,
            attrs || {},
            currentTime
          );
          fs.writeFileSync(
            `${tempFolder.name}/${frameIndex}.jpeg`,
            dataURL.split(',')[1],
            'base64'
          );
          finishedFramesNumber += 1;
          if (attrs.onProgress) {
            const frameTime = Date.now() - startTime;
            const progress = finishedFramesNumber / framesNumber;
            attrs.onProgress(progress, frameTime);
          }
        }
        await page.close();
        if (typeof inst === 'function') {
          await instance.close();
        }
      })
    );

    const inputs = [];
    let pageStartTime = 0;
    for (const page of json.pages) {
      for (const el of page.children) {
        if (el.type === 'video') {
          const elStartTime = el.startTime * el.duration;
          const elDuration = Math.min(
            page.duration,
            el.duration * (el.endTime - el.startTime)
          );
          const elEndTime = elStartTime + elDuration;
          inputs.push({
            file: el.file,
            inputStartTime: elStartTime,
            inputEndTime: elEndTime,
            outputStartTime: pageStartTime,
            outputEndTime: pageStartTime + page.duration,
          });
        }
      }
      pageStartTime += page.duration;
    }

    const format = attrs.out.split('.').pop() || 'mp4';

    await new Promise((resolve, reject) => {
      const ffmpegCmd = ffmpeg()
        .input(`${tempFolder.name}/%d.jpeg`)
        .inputFPS(fps)
        .videoCodec('libx264')
        .outputOptions('-pix_fmt yuv420p')
        .videoFilters('scale=trunc(iw/2)*2:trunc(ih/2)*2'); // Ensure dimensions are divisible by 2

      // Add each audio segment as a separate input
      inputs.forEach((input, index) => {
        const inputStartSec = (input.inputStartTime / 1000).toFixed(3);
        const inputDurationSec = (
          (input.inputEndTime - input.inputStartTime) /
          1000
        ).toFixed(3);
        const outputOffsetSec = (input.outputStartTime / 1000).toFixed(3);

        // Apply `-itsoffset` before each input file to shift its audio stream
        ffmpegCmd
          .inputOptions([`-itsoffset ${outputOffsetSec}`]) // Shift the input time
          .input(input.file) // Add the actual input file
          .inputOptions([`-ss ${inputStartSec}`, `-t ${inputDurationSec}`]); // Specify the timing to cut the audio
      });

      // Map the video stream from the image sequence
      ffmpegCmd.outputOptions(['-map 0:v']);

      // Map each audio stream
      inputs.forEach((_, index) => {
        ffmpegCmd.outputOptions([`-map ${index + 1}:a?`]);
      });

      ffmpegCmd
        .format(format)
        .on('end', () => resolve())
        .on('error', (err, stdout, stderr) => {
          console.log(err.message);
          console.log('stdout:\n' + stdout);
          console.log('stderr:\n' + stderr);
          reject(err);
        })
        .save(attrs.out);
    });
  } catch (e) {
    throw e;
  } finally {
    fs.rmSync(tempFolder.name, { recursive: true });
  }
};
