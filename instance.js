const path = require('path');
const DEFAULT_CLIENT = `file:${path.join(__dirname, 'dist', 'index.html')}`;

module.exports.createPage = async (browser, url) => {
  const page = await browser.newPage();
  // overwrite user agent, so headless check still work with the last puppeteer version
  await page.setUserAgent('Chrome Headless');

  page.on('console', (msg) => {
    msg.args().forEach(async (message) => {
      // skip style information
      if (message.toString().indexOf('margin') >= 0) {
        return;
      }
      // const val = await arg.jsonValue();
      // const { type, subtype, description } = arg._remoteObject;
      // console.log(
      //   `type: ${type}, subtype: ${subtype}, description:\n ${description}`
      // );
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
} = {}) => {
  const visitPage = url || `${DEFAULT_CLIENT}?key=${key}`;
  const firstPage = useParallelPages
    ? null
    : await module.exports.createPage(browser, visitPage);

  const run = async (func, ...args) => {
    const page = useParallelPages
      ? await module.exports.createPage(browser, visitPage)
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
        }, args[1].assetLoadTimeout);
      }
      if (args[1]?.htmlTextRenderEnabled) {
        await page.evaluate(() => {
          if (window.config && window.config.unstable_useHtmlTextRender) {
            window.config.unstable_useHtmlTextRender(true);
          } else {
            console.error(
              'unstable_useHtmlTextRender function is not defined in the client.'
            );
          }
        });
      }
      if (args[1]?.textVerticalResizeEnabled) {
        await page.evaluate(() => {
          if (
            window.config &&
            window.config.unstable_setTextVerticalResizeEnabled
          ) {
            window.config.unstable_setTextVerticalResizeEnabled(true);
          } else {
            console.error(
              'unstable_setTextVerticalResizeEnabled function is not defined in the client.'
            );
          }
        });
      }
      if (args[1]?.onProgress) {
        const originalProgress = args[1].onProgress;
        await page.exposeFunction('onProgress', async (progress) => {
          originalProgress(progress);
        });
      }
      if (args[1]?.textOverflow) {
        await page.evaluate((overflow) => {
          if (window.config && window.config.unstable_setTextOverflow) {
            window.config.unstable_setTextOverflow(overflow);
          } else {
            console.error(
              'unstable_setTextOverflow function is not defined in the client.'
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
          throw new Error(error);
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
    createPage: async () => await module.exports.createPage(browser, visitPage),
  };

  createdInstances.push(instance);
  return instance;
};

// Function to close all created instances in parallel
const closeAllInstances = async () => {
  await Promise.all(createdInstances.map((instance) => instance.close()));
};

// Register the function to be called on process exit
process.on('beforeExit', () => {
  closeAllInstances().catch((error) => {
    console.error('Error closing instances:', error);
  });
});

// Also handle other termination signals
['SIGINT', 'SIGTERM', 'SIGQUIT', 'exit', 'beforeExit'].forEach((signal) => {
  process.on(signal, () => {
    closeAllInstances()
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        console.error('Error closing instances:', error);
        process.exit(1);
      });
  });
});
