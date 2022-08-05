import React from 'react';
import ReactDOM from 'react-dom/client';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import { toggleFadeInAnimation } from 'polotno/canvas/use-fadein';
import {
  unstable_setForceTextFit,
  unstable_useHtmlTextRender,
  onLoadError,
} from 'polotno/config';

import { addGlobalFont } from 'polotno/utils/fonts';

toggleFadeInAnimation(false);
unstable_setForceTextFit(true);

const key = new URLSearchParams(location.search).get('key');

const store = createStore({
  key: key,
});

window.store = store;
window.config = {
  addGlobalFont,
  unstable_useHtmlTextRender,
  onLoadError,
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Workspace store={store} />);
