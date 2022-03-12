const fs = require('fs');

const file = './test-data/polotno2_private.json';

// load sample json
const json = JSON.parse(fs.readFileSync(file));

const types = ['text', 'image', 'svg'];

json.pages.forEach((page, index) => {
  page.children = page.children.filter(({ type }) => {
    return types.indexOf(type) !== -1;
  });
});

fs.writeFileSync(file, JSON.stringify(json), 'utf8');
