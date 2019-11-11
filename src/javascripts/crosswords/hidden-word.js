import React, { Component } from 'react';
import HiddenWordCharacter from 'crosswords/hidden-word-character';

const HiddenWord = function (props) {
  return (
    <form onSubmit={props.onSubmit}>
      {Object.keys(props.hiddenWord.cells).map((x) => props.hiddenWord.cells[x].map((y) => {
        const cell = props.grid[x][y];
        const key = `hidden-word-cell-${x}-${y}`;
        return <HiddenWordCharacter
          value={cell.value}
          x={x}
          y={y}
          key={key}
          onChange={props.onChange}
        />;
      }))}
      <input type={'submit'} value={'Submit'} />
    </form>
  );
};

export { HiddenWord };
