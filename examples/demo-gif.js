const fs = require('fs');
const puppeteer = require('puppeteer');

async function run() {
  // this is a demo key just for that project
  // (!) please don't use it in your projects
  // to create your own API key please go here: https://polotno.dev/cabinet
  const browser = await puppeteer.connect({
    browserWSEndpoint:
      'wss://chrome.browserless.io?token=207a1c64-56b3-4cae-8c4f-effc763d210c&--disable-web-security',
  });
  console.log(1);
  const page = await browser.newPage();
  await page.goto('https://render-client.polotno.dev');

  console.log(2);
  page.on('console', (msg) => {
    msg.args().forEach((message) => {
      // skip style information
      if (message.toString().indexOf('margin') >= 0) {
        return;
      }
      const text = message
        .toString()
        .replace('JSHandle:', '')
        .replace('%c', '');
      console.log(text);
    });
  });

  console.log(3);
  const base64 = await page.evaluate(async () => {
    window.store.loadJSON({
      width: 1080,
      height: 1080,
      fonts: [],
      pages: [
        {
          id: 'cI7Ah4sIhw',
          children: [
            {
              id: 'hpOJBp0wo8',
              type: 'image',
              name: 'listing_image',
              x: 1.4210854715202023e-14,
              y: -1.556976769734307e-12,
              rotation: 0,
              opacity: 1,
              blurEnabled: false,
              blurRadius: 10,
              brightnessEnabled: false,
              brightness: 0,
              sepiaEnabled: false,
              grayscaleEnabled: false,
              shadowEnabled: false,
              shadowBlur: 5,
              shadowOffsetX: 0,
              shadowOffsetY: 0,
              shadowColor: 'black',
              shadowOpacity: 1,
              visible: true,
              draggable: true,
              selectable: true,
              contentEditable: true,
              styleEditable: true,
              alwaysOnTop: false,
              showInExport: true,
              width: 1079.999999999989,
              height: 1080.0000000000061,
              src: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTY5OTZ8MHwxfHNlYXJjaHw2fHxob3VzZXxlbnwwfHx8fDE2NTM5ODQzNzc&ixlib=rb-1.2.1&q=80&w=1080',
              cropX: 0.17777777777777778,
              cropY: 0,
              cropWidth: 0.6629629629629525,
              cropHeight: 1,
              cornerRadius: 0,
              flipX: false,
              flipY: false,
              clipSrc: '',
              borderColor: 'black',
              borderSize: 0,
            },
            {
              id: 'Bm3W-Jewga',
              type: 'video',
              name: '',
              opacity: 1,
              animations: [],
              visible: true,
              selectable: true,
              removable: true,
              alwaysOnTop: false,
              showInExport: true,
              x: 190.93879315231348,
              y: 627.1939916370038,
              width: 478.7820549447969,
              height: 439.0208513450251,
              rotation: 0,
              blurEnabled: false,
              blurRadius: 10,
              brightnessEnabled: false,
              brightness: 0,
              sepiaEnabled: false,
              grayscaleEnabled: false,
              shadowEnabled: false,
              shadowBlur: 5,
              shadowOffsetX: 0,
              shadowOffsetY: 0,
              shadowColor: 'black',
              shadowOpacity: 1,
              draggable: true,
              resizable: true,
              contentEditable: true,
              styleEditable: true,
              src: 'https://polotno-files.sfo3.cdn.digitaloceanspaces.com/remove/pexels-cottonbro-5900832.mp4',
              cropX: 8.421247238638224e-16,
              cropY: 0.5164503354179131,
              cropWidth: 0.9999999999999991,
              cropHeight: 0.48354966458208487,
              cornerRadius: 0,
              flipX: false,
              flipY: false,
              clipSrc: '',
              borderColor: 'black',
              borderSize: 0,
              keepRatio: false,
              duration: 16200,
            },
          ],
          width: 'auto',
          height: 'auto',
          background: 'white',
          bleed: 0,
        },
      ],
      unit: 'px',
      dpi: 72,
    });
    await store.waitLoading();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return store.toDataURL();
    // const video = document.createElement('video');
    // // video.muted = true;
    // // video.autoplay = true;
    // video.src =
    //   'https://polotno-files.sfo3.cdn.digitaloceanspaces.com/remove/pexels-cottonbro-5900832.mp4';
    // video.crossOrigin = 'anonymous';
    // // video.style.display = 'none';
    // // document.body.appendChild(video);
    // const canvas = document.createElement('canvas');
    // document.body.appendChild(canvas);
    // const ctx = canvas.getContext('2d');
    // video.currentTime = 5;
    // video.width = 100;
    // video.height = 100;
    // await new Promise((resolve) => setTimeout(resolve, 2000));
    // return new Promise((resolve, reject) => {
    //   video.addEventListener('loadeddata', () => {
    //     ctx.drawImage(video, 0, 0, 100, 100);
    //     resolve();
    //   });
    //   video.addEventListener('error', (e) => {
    //     console.log(JSON.stringify(e));
    //     reject(e);
    //   });
    // });
  });
  // console.log(4);
  // await page.waitForSelector('video');
  // console.log(5);
  // const binary = await page.screenshot({ type: 'png' });
  // await jsonToGifFile(page, json, { out: 'out.gif' });

  // console.log('done');
  fs.writeFileSync('out-2.png', base64.split('base64,')[1], 'base64');
  console.log(6);
  await page.close();
  await browser.close();
}

run().catch((e) => console.error(e));
