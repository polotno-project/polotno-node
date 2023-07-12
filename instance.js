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

    try {
      if (args[1]?.assetLoadTimeout) {
        await page.evaluate((timeout) => {
          if (window.config && window.config.setAssetLoadTimeout) {
            window.config.setAssetLoadTimeout(timeout);
          }
        }, args[1].assetLoadTimeout);
      }
      if (args[1]?.htmlTextRenderEnabled) {
        await page.evaluate(() => {
          if (window.config && window.config.unstable_useHtmlTextRender) {
            window.config.unstable_useHtmlTextRender(true);
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
          }
        });
      }
      await page.evaluate(() => {
        if (window.config?.onLoadError) {
          window.config.onLoadError((error) => {
            window._polotnoError = error;
          });
        }
      });
      const result = await page.evaluate(func, ...args);
      const error = await page.evaluate(() => window._polotnoError);
      if (error) {
        throw new Error(error);
      }
      if (useParallelPages) {
        await page.close();
      }
      return result;
    } catch (e) {
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
        await store.waitLoading();
        return await store.toPDFDataURL(attrs);
      },
      json,
      attrs || {}
    );
  };

  const jsonToBlob = async (json, attrs) => {
    const base64 = await jsonToImageBase64(json, attrs);
    const blob = Buffer.from(base64, 'base64');
    return blob;
  };

  const jsonToPDFBase64 = async (json, attrs) => {
    const url = await jsonToPDFDataURL(json, attrs);
    return url.split('base64,')[1];
  };

  return {
    close: async () => {
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
};
