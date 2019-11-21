import React from 'react';
import ReactDOM from 'react-dom';
import Crossword from 'crosswords/crossword';

require('./polyfills/array.find');
require('./polyfills/array.findIndex');
require('./polyfills/array.fill');
require('./polyfills/array.from');
require('./polyfills/array.includes');
require('./polyfills/object.assign');

const entries = require('./data/entries');
const data = {
  id: 'jhu/prototype',
  entries: entries,
  solutionAvailable: true,
  dateSolutionAvailable: 1542326400000,
  dimensions: {
    cols: 21,
    rows: 21 
  },
  crosswordType: 'jhu',
  eventHandler: {
    push: function (event) {
      console.log(event);
    }
  },
  hiddenWord: {
    cells: {
      1: [0],
      6: [2],
      7: [8],
      13: [13]
    },
    callback: (success) => {
      if (success) {
        console.log('go to some other page');
      } else {
        console.log('Sorrraaay, your password is not correct');
      }
    },
    title: 'Solve for S'
  }
};

ReactDOM.render(<Crossword data={data}/>, document.getElementById('puzzle'));
