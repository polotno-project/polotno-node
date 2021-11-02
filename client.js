import React from 'react';
import ReactDOM from 'react-dom';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import { toggleFadeInAnimation } from 'polotno/canvas/use-fadein';

import { addGlobalFont } from 'polotno/utils/fonts';

toggleFadeInAnimation(false);

const key = new URLSearchParams(location.search).get('key');

const store = createStore({
  key: key,
});

window.store = store;
window.config = {
  addGlobalFont,
};

ReactDOM.render(<Workspace store={store} />, document.getElementById('root'));
