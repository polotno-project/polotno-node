const fs = require('fs');
const { createCanvas, Image, loadImage } = require('canvas');
const GIFEncoder = require('gifencoder');
const ffmpeg = require('fluent-ffmpeg');

module.exports.jsonToVideoFile = async function jsonToGifFile(
  page,
  json,
  attrs
) {
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
  const frames = 50;
  for (let i = 0; i < frames; i++) {
    const currentTime = i * 100;
    console.time('exporting frame');
    const dataURL = await page.evaluate(
      async (json, attrs, currentTime) => {
        store.setCurrentTime(currentTime);
        await store.waitLoading();
        console.log('currentTime', currentTime);
        return await store.toDataURL({ ...attrs, pixelRatio: 0.5 });
      },
      json,
      attrs || {},
      currentTime
    );
    console.timeEnd('exporting frame');
    console.time('writing frame');
    fs.mkdirSync('./tmp', { recursive: true });
    fs.writeFileSync(`./tmp/${i}.png`, dataURL.split(',')[1], 'base64');
    console.timeEnd('writing frame');
  }
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(`./tmp/%d.png`) // Make sure your images are named with numbers, e.g. 1.jpg, 2.jpg, etc.
      .inputFPS(10)
      .videoCodec('libx264')
      .outputOptions('-pix_fmt yuv420p')
      .format('mp4')
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(attrs.out);
  });
};
