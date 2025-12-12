const path = require('path');
const fs = require('fs');
const DEFAULT_CLIENT = `file:${path.join(__dirname, 'dist', 'index.html')}`;

module.exports.createPage = async (browser, url, requestInterceptor) => {
  const page = await browser.newPage();

  // Attach request interceptor if provided
  if (typeof requestInterceptor === 'function') {
    await page.setRequestInterception(true);
    page.on('request', requestInterceptor);
  }

  // we need to make sure that headless is inside user agent
  // because we use it for key validation check
  // but also lets NOT just overwrite default one, because Google Fonts may send "reduced" version of font
  // so some languages may not work
  const userAgent = await page.evaluate(() => navigator.userAgent);
  if (userAgent.indexOf('Headless') === -1) {
    await page.setUserAgent(userAgent + ' Chrome Headless');
  }

  page.on('console', (msg) => {
    msg.args().forEach(async (message) => {
      // skip style information
      if (message.toString().indexOf('margin') >= 0) {
        return;
      }

      const { subtype, description } = message.remoteObject();

      if (subtype === 'error') {
        console.error(description);
        return;
      }

      const text = message
        .toString()
        .replace('JSHandle:', '')
        .replace('%c', '');
      console.log(text);
    });
  });
  page.on('pageerror', (msg) => {
    console.error(msg);
  });
  await page.goto(url);
  return page;
};

module.exports.run = async (page, func, args) => {
  return await page.evaluate(func, ...args);
};

module.exports.jsonToDataURL = async (page, json, attrs) => {
  return await page.evaluate(
    async (json, attrs) => {
      const pixelRatio = attrs.pixelRatio || 1;
      store.loadJSON(json);
      store.setElementsPixelRatio(pixelRatio);
      await store.waitLoading();
      return store.toDataURL({ ...attrs, pixelRatio });
    },
    json,
    attrs || {}
  );
};

module.exports.jsonToPDFDataURL = async (page, json, attrs) => {
  return page.evaluate(
    async (json, attrs) => {
      store.loadJSON(json);
      await store.waitLoading();
      return await store.toPDFDataURL(attrs);
    },
    json,
    attrs || {}
  );
};

module.exports.jsonToBlob = async (page, json, attrs) => {
  return page.evaluate(
    async (json, attrs) => {
      store.loadJSON(json);
      await store.waitLoading();
      return await store.toBlob(attrs);
    },
    json,
    attrs || {}
  );
};

const busyPages = [];

const createdInstances = [];

module.exports.createInstance = async ({
  key,
  url,
  useParallelPages = true,
  browser,
  requestInterceptor,
} = {}) => {
  const visitPage = url || `${DEFAULT_CLIENT}?key=${key}`;
  const firstPage = useParallelPages
    ? null
    : await module.exports.createPage(browser, visitPage, requestInterceptor);

  const run = async (func, ...args) => {
    const page = useParallelPages
      ? await module.exports.createPage(browser, visitPage, requestInterceptor)
      : firstPage;

    if (busyPages.indexOf(page) >= 0) {
      throw new Error(
        'Current rendering context is busy with another task. Please use `useParallelPages: true` option to run multiple tasks in parallel or make sure previous task is finished before starting a new one.'
      );
    }

    busyPages.push(page);

    try {
      if (args[1]?.assetLoadTimeout) {
        await page.evaluate((timeout) => {
          if (window.config && window.config.setAssetLoadTimeout) {
            window.config.setAssetLoadTimeout(timeout);
          } else {
            console.error(
              'setAssetLoadTimeout function is not defined in the client.'
            );
          }
        }, args[1].assetLoadTimeout);
      }
      if (args[1]?.fontLoadTimeout) {
        await page.evaluate((timeout) => {
          if (window.config && window.config.setFontLoadTimeout) {
            window.config.setFontLoadTimeout(timeout);
          } else {
            console.error(
              'setFontLoadTimeout function is not defined in the client.'
            );
          }
        }, args[1].fontLoadTimeout);
      }
      if (args[1]?.htmlTextRenderEnabled || args[1]?.richTextEnabled) {
        await page.evaluate(() => {
          if (window.config && window.config.setRichTextEnabled) {
            window.config.setRichTextEnabled(true);
          } else {
            console.error(
              'setRichTextEnabled function is not defined in the client.'
            );
          }
        });
      }
      if (args[1]?.textVerticalResizeEnabled) {
        await page.evaluate(() => {
          if (window.config && window.config.setTextVerticalResizeEnabled) {
            window.config.setTextVerticalResizeEnabled(true);
          } else {
            console.error(
              'setTextVerticalResizeEnabled function is not defined in the client.'
            );
          }
        });
      }
      if (args[1]?.textSplitAllowed) {
        await page.evaluate(() => {
          if (window.config && window.config.unstable_setTextSplitAllowed) {
            window.config.unstable_setTextSplitAllowed(true);
          } else {
            console.error(
              'unstable_setTextSplitAllowed function is not defined in the client.'
            );
          }
        });
      }
      if (args[1]?.onProgress) {
        const originalProgress = args[1].onProgress;
        await page.exposeFunction('onProgress', async (progress, frameTime) => {
          originalProgress(progress, frameTime);
        });
      }
      if (args[1]?.textOverflow) {
        await page.evaluate((overflow) => {
          if (window.config && window.config.setTextOverflow) {
            window.config.setTextOverflow(overflow);
          } else {
            console.error(
              'setTextOverflow function is not defined in the client.'
            );
          }
        }, args[1].textOverflow);
      }
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
      const result = await page.evaluate(func, ...args);
      const error = await page.evaluate(() => window._polotnoError);
      if (error) {
        // clear error
        await page.evaluate(() => {
          window._polotnoError = null;
        });
        const message = error.toString();
        const isFontError = message.indexOf('Timeout for loading font') >= 0;
        const skipError = isFontError && args[1]?.skipFontError;

        const isImageError = message.indexOf('image ') >= 0;
        const skipImageError = isImageError && args[1]?.skipImageError;

        if (!skipError && !skipImageError) {
          throw new Error('Asset loading error: ' + error);
        }
      }
      // remove busy page
      busyPages.splice(busyPages.indexOf(page), 1);
      if (useParallelPages) {
        await page.close();
      }
      return result;
    } catch (e) {
      // remove busy page
      busyPages.splice(busyPages.indexOf(page), 1);
      if (useParallelPages) {
        await page.close();
      }
      throw e;
    }
  };

  const jsonToDataURL = async (json, attrs) => {
    return await run(
      async (json, attrs) => {
        const pixelRatio = attrs.pixelRatio || 1;
        store.loadJSON(json);
        store.setElementsPixelRatio(pixelRatio);
        await store.waitLoading();
        return store.toDataURL({ ...attrs, pixelRatio });
      },
      json,
      attrs || {}
    );
  };

  const jsonToGIFDataURL = async (json, attrs) => {
    return await run(
      async (json, attrs) => {
        store.loadJSON(json);
        return await store.toGIFDataURL(attrs);
      },
      json,
      attrs || {}
    );
  };

  const jsonToGIFBase64 = async (json, attrs) => {
    const url = await jsonToGIFDataURL(json, attrs);
    return url.split('base64,')[1];
  };

  const jsonToImageBase64 = async (json, attrs) => {
    const url = await jsonToDataURL(json, attrs);
    return url.split('base64,')[1];
  };

  const jsonToPDFDataURL = async (json, attrs) => {
    return await run(
      async (json, attrs) => {
        store.loadJSON(json);
        if (window.onProgress) {
          attrs.onProgress = (progress) => {
            window.onProgress(progress);
          };
        }
        await store.waitLoading();
        return await store.toPDFDataURL(attrs);
      },
      json,
      attrs || {}
    );
  };

  const jsonToPDFBase64 = async (json, attrs) => {
    const url = await jsonToPDFDataURL(json, attrs);
    return url.split('base64,')[1];
  };

  const jsonToBlob = async (json, attrs) => {
    const base64 = await jsonToImageBase64(json, attrs);
    const blob = Buffer.from(base64, 'base64');
    return blob;
  };

  const jsonToVideo = async (json, attrs) => {
    if (!attrs || !attrs.out) {
      throw new Error('jsonToVideo requires attrs.out to be specified');
    }

    const dataURL = await run(
      async (json, attrs) => {
        const pixelRatio = attrs.pixelRatio || 1;
        store.loadJSON(json);
        await store.waitLoading();
        // keep store internals consistent with image/pdf exports
        if (store.setElementsPixelRatio) {
          store.setElementsPixelRatio(pixelRatio);
        }

        // fail fast if we already captured an asset-loading error
        if (window._polotnoError) {
          throw new Error(String(window._polotnoError));
        }

        // loop through all pages and wait for loading for all layout calculations
        // (this helps stabilize text/layout across multi-page designs)
        for (const page of store.pages) {
          store.selectPage(page.id);
          await store.waitLoading();
          if (window._polotnoError) {
            throw new Error(String(window._polotnoError));
          }
        }
        if (store.pages.length > 0) {
          store.selectPage(store.pages[0].id);
          await store.waitLoading();
        }

        //
        window.config.setTextOverflow('resize');

        if (!window.loadVideoExportModule) {
          throw new Error(
            'Video export module loader is not defined in the client. Expected window.loadVideoExportModule().'
          );
        }

        const { storeToVideo } = await window.loadVideoExportModule();

        // Use exposed progress callback if available
        const progressCallback = window.onProgress
          ? (progress, frameTime) => {
              // abort export ASAP on captured asset errors
              if (window._polotnoError) {
                throw new Error(String(window._polotnoError));
              }
              return window.onProgress(progress, frameTime);
            }
          : undefined;

        const videoBlob = await storeToVideo({
          store,
          fps: attrs.fps,
          pixelRatio,
          onProgress: progressCallback,
        });

        // Convert Blob to data URL (so Node can write it)
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(videoBlob);
        });
        return dataUrl;
      },
      json,
      attrs || {}
    );

    // Extract base64 data and write to file
    const base64Data = dataURL.split('base64,')[1];
    if (!base64Data) {
      throw new Error('Invalid video data URL returned from client');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(attrs.out, buffer);

    return attrs.out;
  };

  const instance = {
    close: async () => {
      createdInstances.splice(createdInstances.indexOf(instance), 1);
      await browser.close();
    },
    firstPage,
    browser,
    run,
    jsonToDataURL,
    jsonToImageBase64,
    jsonToPDFDataURL,
    jsonToPDFBase64,
    jsonToBlob,
    jsonToGIFDataURL,
    jsonToGIFBase64,
    jsonToVideo,
    createPage: async () =>
      await module.exports.createPage(browser, visitPage, requestInterceptor),
  };

  createdInstances.push(instance);
  return instance;
};

// Function to close all created instances in parallel
const closeAllInstances = async () => {
  await Promise.all(createdInstances.map((instance) => instance.close()));
};

// Also handle other termination signals
['SIGINT', 'SIGTERM', 'SIGQUIT', 'exit', 'exit'].forEach((signal) => {
  process.on(signal, () => {
    closeAllInstances();
  });
});
