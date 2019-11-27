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
      0: [19],
      3: [0, 6],
      4: [11, 18],
      5: [12],
      8: [13],
      9: [4],
      10: [17],
      11: [13],
      12: [18],
      13: [9],
      15: [11, 16],
      16: [14],
      20: [6],
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
