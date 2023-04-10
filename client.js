import React from 'react';
import ReactDOM from 'react-dom/client';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import { toggleFadeInAnimation } from 'polotno/canvas/use-fadein';
import {
  unstable_setTextOverflow,
  unstable_useHtmlTextRender,
  onLoadError,
  unstable_setTextVerticalResizeEnabled,
  setAssetLoadTimeout,
} from 'polotno/config';

import { addGlobalFont } from 'polotno/utils/fonts';

toggleFadeInAnimation(false);
unstable_setTextOverflow('change-font-size');

const key = new URLSearchParams(location.search).get('key');

const store = createStore({
  key: key,
});

window.store = store;
window.config = {
  addGlobalFont,
  unstable_useHtmlTextRender,
  unstable_setTextVerticalResizeEnabled,
  unstable_setTextOverflow,
  onLoadError,
  setAssetLoadTimeout,
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Workspace store={store} />);
