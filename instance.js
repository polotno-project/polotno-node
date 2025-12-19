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

  async function ensureAssetErrorHelpers(page) {
    await page.evaluate(() => {
      // Define helpers once per page. They unify asset-loading error handling
      // across all exports (dataURL/image/pdf/video).
      if (!window.__polotnoConsumeAssetError) {
        window.__polotnoConsumeAssetError = (attrs) => {
          const error = window._polotnoError;
          if (!error) return null;

          // Clear immediately to avoid double-reporting.
          window._polotnoError = null;

          const message = String(error);
          const isFontError = message.indexOf('Timeout for loading font') >= 0;
          const skipFontError = isFontError && attrs && attrs.skipFontError;

          const isImageError = message.indexOf('image ') >= 0;
          const skipImageError = isImageError && attrs && attrs.skipImageError;

          if (skipFontError || skipImageError) {
            return null;
          }
          return message;
        };
      }

      if (!window.__polotnoThrowAssetErrorIfAny) {
        window.__polotnoThrowAssetErrorIfAny = (attrs) => {
          const message = window.__polotnoConsumeAssetError(attrs);
          if (message) {
            throw new Error('Asset loading error: ' + message);
          }
        };
      }
    });
  }

  async function consumeAssetLoadingErrorMessage(page, attrs) {
    try {
      return await page.evaluate((attrs) => {
        if (window.__polotnoConsumeAssetError) {
          return window.__polotnoConsumeAssetError(attrs);
        }
        return null;
      }, attrs);
    } catch (e) {
      // If the page is already crashed/unavailable, we can't inspect the error.
      return null;
    }
  }

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

    // Setup profiling if profilePath is provided
    let cdpSession = null;
    const profilePath = args[1]?.profilePath;
    if (profilePath) {
      cdpSession = await page.target().createCDPSession();
      await cdpSession.send('Profiler.enable');
      await cdpSession.send('Profiler.start');
    }

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
      // Allow exposing custom functions (used for chunked data transfer)
      if (args[1]?.exposeFunctions) {
        for (const [name, fn] of Object.entries(args[1].exposeFunctions)) {
          await page.exposeFunction(name, fn);
        }
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
      await ensureAssetErrorHelpers(page);
      const result = await page.evaluate(func, ...args);

      // Stop profiler and save profile if enabled
      if (cdpSession && profilePath) {
        const { profile } = await cdpSession.send('Profiler.stop');
        fs.writeFileSync(profilePath, JSON.stringify(profile));
        console.log(`CPU profile saved to: ${profilePath}`);
      }

      const assetErrorMessage = await consumeAssetLoadingErrorMessage(
        page,
        args[1]
      );
      if (assetErrorMessage) {
        throw new Error('Asset loading error: ' + assetErrorMessage);
      }
      // remove busy page
      busyPages.splice(busyPages.indexOf(page), 1);
      if (useParallelPages) {
        await page.close();
      }
      return result;
    } catch (e) {
      // Stop profiler and save profile even on error
      if (cdpSession && profilePath) {
        console.log('saving profile');
        try {
          const { profile } = await cdpSession.send('Profiler.stop');
          fs.writeFileSync(profilePath, JSON.stringify(profile));
          console.log(`CPU profile saved to: ${profilePath}`);
        } catch (profileError) {
          console.error('Failed to save profile:', profileError.message);
        }
      }

      // If `page.evaluate()` failed (e.g. thrown during onProgress), still prefer
      // a captured Polotno asset-loading error when available.
      const assetErrorMessage = await consumeAssetLoadingErrorMessage(
        page,
        args[1]
      );
      // remove busy page
      busyPages.splice(busyPages.indexOf(page), 1);
      if (useParallelPages) {
        await page.close();
      }
      if (assetErrorMessage) {
        throw new Error('Asset loading error: ' + assetErrorMessage);
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

  const jsonToVideoDataURL = async (json, attrs) => {
    const chunks = [];
    const mimeType = await run(
      async (json, attrs) => {
        const pixelRatio = attrs.pixelRatio || 1;
        store.loadJSON(json);
        await store.waitLoading();
        window.__polotnoThrowAssetErrorIfAny(attrs);

        // keep store internals consistent with image/pdf exports
        store.setElementsPixelRatio(pixelRatio);

        // loop through all pages and wait for loading for all layout calculations
        // (this helps stabilize text/layout across multi-page designs)
        for (const page of store.pages) {
          store.selectPage(page.id);
          await store.waitLoading();
          window.__polotnoThrowAssetErrorIfAny(attrs);
        }
        if (store.pages.length > 0) {
          store.selectPage(store.pages[0].id);
          await store.waitLoading();
          window.__polotnoThrowAssetErrorIfAny(attrs);
        }

        // For video export, we always use 'resize' text overflow mode
        // to ensure text fits properly in animations. User preferences are ignored for now.
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
              // Check for asset-loading errors during render
              window.__polotnoThrowAssetErrorIfAny(attrs);
              return window.onProgress(progress, frameTime);
            }
          : undefined;

        const videoBlob = await storeToVideo({
          store,
          fps: attrs.fps,
          pixelRatio,
          onProgress: progressCallback,
        });

        // Stream blob in chunks (5MB each) via exposed function to avoid large payload issues
        const CHUNK_SIZE = 5 * 1024 * 1024;
        const arrayBuffer = await videoBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        for (let offset = 0; offset < uint8Array.length; offset += CHUNK_SIZE) {
          const end = Math.min(offset + CHUNK_SIZE, uint8Array.length);
          const chunk = uint8Array.slice(offset, end);
          let binary = '';
          for (let i = 0; i < chunk.length; i++) {
            binary += String.fromCharCode(chunk[i]);
          }
          await window.__polotnoSendChunk(btoa(binary));
        }

        return videoBlob.type;
      },
      json,
      {
        ...attrs,
        exposeFunctions: {
          __polotnoSendChunk: (chunk) => chunks.push(chunk),
        },
      }
    );
    return `data:${mimeType || 'video/mp4'};base64,${chunks.join('')}`;
  };

  const jsonToVideoBase64 = async (json, attrs) => {
    const url = await jsonToVideoDataURL(json, attrs);
    return url.split('base64,')[1];
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
    jsonToVideoDataURL,
    jsonToVideoBase64,
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
