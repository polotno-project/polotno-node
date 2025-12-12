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
      .outputOptions([
        '-c:v libvpx-vp9',
        '-crf 30',
        '-b:v 0',
        '-b:a 128k',
        '-c:a libopus',
        '-cpu-used 4', // Faster encoding with slight quality loss
        '-deadline realtime', // Fastest encoding mode
        '-threads 0', // Use all available CPU cores
      ])
      .output(output)
      .on('end', () => {
        resolve();
      })
      .on('error', (err) => {
        console.error('Error occurred: ' + err.message);
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

const convertVideo = async (url, tempFolder, skipWebm) => {
  const shortUrl = url.slice(0, 50) + '...';
  console.log('Downloading video: ' + shortUrl);
  const filename = Math.random().toString(36).substring(7);
  const mp4Destination = path.join(tempFolder.name, filename + '.mp4');
  await downloadVideo(url, mp4Destination);
  let dataURL = '';
  if (!skipWebm) {
    console.log('Converting video to webm: ' + filename);
    const webmDestination = mp4Destination.replace('.mp4', '.webm');
    await convertToWebM(mp4Destination, webmDestination);
    dataURL = await fileToDataUrl(webmDestination);
    console.log('Converting video finished: ' + filename);
  }

  return {
    dataURL,
    mp4File: mp4Destination,
  };
};

module.exports.jsonToVideo = async function jsonToVideo(
  inst,
  json,
  attrs = {}
) {
  const tempFolder = tmp.dirSync({
    tmpdir: attrs.tmpdir,
  });
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
        const { dataURL, file, mp4File } = await convertVideo(
          el.src,
          tempFolder,
          attrs.skipWebm
        );
        if (!attrs.skipWebm) {
          el.src = dataURL;
        }
        el.file = file;
        el.mp4File = mp4File;
      })
    );

    const audios = [];
    // download all audio tracks
    await Promise.all(
      (json.audios || []).map(async (audio) => {
        const filename = Math.random().toString(36).substring(7);
        const destination = path.join(tempFolder.name, filename);
        await downloadVideo(audio.src, destination);
        audios.push({
          ...audio,
          file: destination,
        });
      })
    );

    const duration = json.pages.reduce((acc, page) => {
      return acc + (page.duration ?? 5000);
    }, 0);

    if (duration === 0) {
      throw new Error('Video duration is 0');
    }
    const parallel = attrs.parallel || 5;

    const fps = attrs.fps || 30;
    const timePerFrame = 1000 / fps;

    // loop through the images and add each to the animation
    const framesNumber = Math.floor((duration / 1000) * fps) || 1;
    const frames = Array.from(Array(framesNumber).keys());

    // split frames into parallel chunks
    const chunkSize = Math.ceil(framesNumber / parallel);
    const chunks = [];
    for (let i = 0; i < framesNumber; i += chunkSize) {
      chunks.push(frames.slice(i, i + chunkSize));
    }

    let lastTime = 0;
    const pages = json.pages.map((p, index) => {
      const startTime = lastTime;
      lastTime = startTime + p.duration;
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
        await page.evaluate(() => {
          if (window.config?.onLoadError) {
            window.config.onLoadError((error) => {
              window._polotnoError = error;
            });
          } else {
            console.error(
              'onLoadError function is not defined in the client. Error handling will not work.'
            );
          }
        });
        page.setDefaultNavigationTimeout(60000); // Increase timeout to 60 seconds

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
            await page.evaluate(async (json) => {
              store.loadJSON(json);
              await store.waitLoading();
              await new Promise((resolve) => {
                setTimeout(resolve, 100);
              });
            }, json);
            await page.evaluate(async (currentTime) => {
              store.setCurrentTime(currentTime);
              store.checkActivePage();
              store.activePage.set({
                _rendering: true,
              });
              await store.waitLoading();
              await new Promise((resolve) => {
                setTimeout(resolve, 100);
              });
              if (window.config.unstable_setTextOverflow) {
                window.config.unstable_setTextOverflow('resize');
              } else {
                // console.error(
                //   'Can not set text overflow mode. Define window.config.unstable_setTextOverflow function'
                // );
              }
            }, currentTime);
            lastPageIndex = storePageIndex;
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
          const error = await page.evaluate(() => window._polotnoError);
          if (error) {
            // clear error
            await page.evaluate(() => {
              window._polotnoError = null;
            });
            const message = error.toString();
            const isFontError =
              message.indexOf('Timeout for loading font') >= 0;
            const skipError = isFontError && attrs.skipFontError;

            const isImageError = message.indexOf('image ') >= 0;
            const skipImageError = isImageError && attrs.skipImageError;

            if (!skipError && !skipImageError) {
              throw new Error('Asset loading error: ' + error);
            }
          }
          // TODO: add error handling!!!!
          fs.writeFileSync(
            `${tempFolder.name}/${frameIndex}.jpeg`,
            dataURL.split(',')[1],
            'base64'
          );
          finishedFramesNumber += 1;
          if (attrs.onProgress) {
            const frameTime = Date.now() - startTime;
            const progress = (finishedFramesNumber / framesNumber) * 0.95;
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
      const pageDuration = page.duration || 5000;
      for (const el of page.children) {
        if (el.type === 'video') {
          const startTime = el.startTime || 0;
          const endTime = el.endTime || 1;
          const dur = el.duration || 5000;
          const elStartTime = startTime * dur;

          const elDuration = Math.min(
            pageDuration,
            dur * (endTime - startTime)
          );
          const elEndTime = elStartTime + elDuration;
          inputs.push({
            file: el.file,
            mp4File: el.mp4File,
            inputStartTime: elStartTime,
            inputEndTime: elEndTime,
            outputStartTime: pageStartTime,
            outputEndTime: pageStartTime + pageDuration,
            volume: el.volume,
          });
        }
      }
      pageStartTime += pageDuration;
    }

    const format = attrs.out.split('.').pop() || 'mp4';

    await new Promise((resolve, reject) => {
      const ffmpegCmd = ffmpeg()
        .input(`${tempFolder.name}/%d.jpeg`)
        .inputFPS(fps)
        .videoCodec('libx264')
        .outputOptions('-pix_fmt yuv420p')
        .videoFilters('scale=trunc(iw/2)*2:trunc(ih/2)*2');

      const audioInputs = [];

      // Use Promise.all to handle async ffprobe calls
      Promise.all(
        inputs.map((input, index) => {
          return new Promise((resolveProbe) => {
            const inputStartSec = (input.inputStartTime / 1000).toFixed(3);
            const inputDurationSec = (
              (input.inputEndTime - input.inputStartTime) /
              1000
            ).toFixed(3);
            const outputOffsetMs = Math.round(input.outputStartTime);
            const volume = input.volume !== undefined ? input.volume : 1;

            ffmpegCmd
              .input(input.mp4File)
              .inputOptions([`-ss ${inputStartSec}`, `-t ${inputDurationSec}`]);

            ffmpeg.ffprobe(input.mp4File, (err, metadata) => {
              if (
                !err &&
                metadata.streams.some((stream) => stream.codec_type === 'audio')
              ) {
                audioInputs.push({
                  index: index + 1,
                  delay: outputOffsetMs,
                  volume: volume,
                });
              }
              resolveProbe();
            });
          });
        })
      ).then(() => {
        // Map the video stream from the image sequence
        ffmpegCmd.outputOptions(['-map 0:v']);

        // Prepare audio filter complex for both video and pure audio inputs
        const allAudioInputs = [...audioInputs, ...audios];
        if (allAudioInputs.length > 0) {
          const audioFilters = allAudioInputs.map((input, i) => {
            const inputIndex = audioInputs.includes(input)
              ? input.index
              : audioInputs.length + i + 1;
            return `[${inputIndex}:a]adelay=${input.delay}|${input.delay},volume=${input.volume},apad[a${i}]`;
          });
          const audioMerge = allAudioInputs.map((_, i) => `[a${i}]`).join('');
          const filterComplex = `${audioFilters.join(
            ';'
          )};${audioMerge}amix=inputs=${
            allAudioInputs.length
          }:dropout_transition=0,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,apad,atrim=0:${
            duration / 1000
          }[aout]`;

          ffmpegCmd.complexFilter(filterComplex);
          ffmpegCmd.outputOptions(['-map [aout]']);

          // Add pure audio inputs
          audios.forEach((audio) => {
            ffmpegCmd.input(audio.file);
          });
        }

        ffmpegCmd
          .format(format)
          .audioCodec('aac')
          .on('start', (command) => console.log('FFmpeg command:', command))
          .on('end', () => resolve())
          .on('error', (err, stdout, stderr) => {
            console.error('Error:', err.message);
            console.error('stdout:', stdout);
            console.error('stderr:', stderr);
            reject(err);
          })
          .save(attrs.out);
      });
    });
  } catch (e) {
    throw e;
  } finally {
    fs.rmSync(tempFolder.name, { recursive: true });
  }
};
