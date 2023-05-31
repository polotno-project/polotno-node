const fs = require('fs');
const { createCanvas, Image, loadImage } = require('canvas');
const GIFEncoder = require('gifencoder');
// const axios = require('axios');
// const ffmpeg = require('fluent-ffmpeg');

// Download the video using axios
// const downloadVideo = async (videoUrl, file) => {
//   const response = await axios({
//     url: videoUrl,
//     method: 'GET',
//     responseType: 'stream',
//   });
//   // Create a new ffmpeg command
//   const command = ffmpeg()
//     .input(response.data)
//     .outputOptions('-c:v libx264')
//     .outputOptions('-crf 20')
//     .outputOptions('-preset veryfast')
//     .outputOptions('-pix_fmt yuv420p')
//     .outputOptions('-movflags frag_keyframe+empty_moov')
//     .output(file);

//   // Run the ffmpeg command
//   command.run();
// };

module.exports.jsonToGifFile = async function jsonToGifFile(page, json, attrs) {
  // create a canvas with the same dimensions as the images
  const canvas = createCanvas(json.width, json.height);
  const ctx = canvas.getContext('2d');

  // create a GIF encoder
  const encoder = new GIFEncoder(json.width, json.height);
  const stream = encoder.createReadStream();
  stream.pipe(fs.createWriteStream(attrs.out));

  encoder.start();
  encoder.setRepeat(0); // 0 = repeat forever
  encoder.setDelay(100); // frame delay in ms
  encoder.setQuality(10); // lower is better
  // first load json
  await page.evaluate(
    async (json, attrs) => {
      store.loadJSON(json);
      await store.waitLoading();
    },
    json,
    attrs || {}
  );

  // loop through the images and add each to the animation
  const frames = 20;
  for (let i = 0; i < frames; i++) {
    const currentTime = i * 100;
    console.time('exporting frame');
    const dataURL = await page.evaluate(
      async (json, attrs, currentTime) => {
        store.setCurrentTime(currentTime);
        await store.waitLoading();
        console.log('currentTime', currentTime);
        return await store.toDataURL({ ...attrs, pixelRatio: 0.2 });
      },
      json,
      attrs || {},
      currentTime
    );
    console.timeEnd('exporting frame');
    console.time('drawing frame');
    const image = await loadImage(dataURL);
    ctx.drawImage(image, 0, 0, json.width, json.height);
    console.timeEnd('drawing frame');
    console.time('adding frame');
    encoder.addFrame(ctx);
    console.timeEnd('adding frame');
  }
  // finish the animation
  encoder.finish();
};
