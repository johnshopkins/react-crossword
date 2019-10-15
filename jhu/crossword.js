import React from 'react';
import ReactDOM from 'react-dom';
import Crossword from 'crosswords/crossword';

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
};

ReactDOM.render(<Crossword data={data}/>, document.getElementById('puzzle'));
