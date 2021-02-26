import React from 'react';
import ReactDOM from 'react-dom';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';

const key = new URLSearchParams(location.search).get('key');

const store = createStore({
  key: key,
});

window.store = store;

ReactDOM.render(<Workspace store={store} />, document.getElementById('root'));
