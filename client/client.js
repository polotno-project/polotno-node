import React from 'react';
import ReactDOM from 'react-dom/client';
import { WorkspaceCanvas } from 'polotno/canvas/workspace-canvas';
import { createStore } from 'polotno/model/store';
import { toggleFadeInAnimation } from 'polotno/canvas/use-fadein';
// instead of importing fom config, let's import from direct files
// to avoid blueprint import
import { setTextOverflow } from 'polotno/utils/flags';
import { setRichTextEnabled } from 'polotno/utils/flags';
import { setTextSplitAllowed } from 'polotno/utils/flags';
import { setTextVerticalResizeEnabled } from 'polotno/utils/flags';

import { onLoadError } from 'polotno/utils/loader';
import { setAssetLoadTimeout, setFontLoadTimeout } from 'polotno/utils/loader';
import { addGlobalFont } from 'polotno/utils/fonts';
import { Node } from 'konva/lib/Node';

// on any changes in polotno workspace (and internal konva nddes), re-render is automatically triggered in Konva internals
// but we don't need to that on the server side, because actual render will be done once on canvas  export
Node.prototype._requestDraw = () => {};

toggleFadeInAnimation(false);
setTextOverflow('change-font-size');

const key = new URLSearchParams(location.search).get('key');

const store = createStore({
  key: key,
});

window.store = store;

// Lazy loaders for heavy modules.
// NOTE: these are intentionally NOT part of window.config (config should remain config-only).

// Lazy loader for jsPDF (used for PDF export)
let __jspdfModulePromise = null;
window.__polotnoLoadJspdf = async () => {
  if (!__jspdfModulePromise) {
    __jspdfModulePromise = import('jspdf');
  }
  return await __jspdfModulePromise;
};

// Lazy loader for video export module
let __videoExportModulePromise = null;
window.__polotnoLoadVideoExport = async () => {
  if (!__videoExportModulePromise) {
    __videoExportModulePromise = import('@polotno/video-export');
  }
  return await __videoExportModulePromise;
};

window.config = {
  addGlobalFont,
  setRichTextEnabled,
  setTextVerticalResizeEnabled,
  setTextOverflow,
  onLoadError,
  setAssetLoadTimeout,
  setFontLoadTimeout,
  unstable_setTextSplitAllowed: setTextSplitAllowed,
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  React.createElement(WorkspaceCanvas, {
    // making only offset is not enough, as it allows scroll and may produce some unexpected change of active page
    visiblePagesOffset: 0,
    // render only active page will do a TRUE force render of active page
    renderOnlyActivePage: true,
    store,
    components: { PageControls: () => null, Tooltip: () => null },
  })
);
