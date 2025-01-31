import React, { Component } from 'react';
import { gridSize } from 'crosswords/helpers';
import { constants } from 'crosswords/constants';
import { classNames } from 'crosswords/classNames';

class Cell extends Component {
  shouldComponentUpdate(nextProps) {
    return (
      this.props.value !== nextProps.value
            || this.props.isFocussed !== nextProps.isFocussed
            || this.props.isHighlighted !== nextProps.isHighlighted
            || this.props.isError !== nextProps.isError
            || this.props.wrong !== nextProps.wrong
    );
  }

  onClick(event) {
    event.preventDefault();
    this.props.handleSelect(this.props.x, this.props.y);
  }

  render() {
    const top = gridSize(this.props.y);
    const left = gridSize(this.props.x);

    let cellNumber = null;
    if (this.props.number !== undefined) {
      cellNumber = (
        <text
          x={left + 1}
          y={top + constants.numberSize}
          key="number"
          className="crossword__cell-number"
        >
          {this.props.number}
        </text>
      );
    }

    let cellValue = null;
    if (this.props.value !== undefined) {
      cellValue = (
        <text
          x={left + constants.cellSize * 0.5}
          y={top + constants.cellSize * 0.675}
          key="entry"
          className={classNames({
            'crossword__cell-text': true,
            'crossword__cell-text--focussed': this.props.isFocussed,
            'crossword__cell-text--error': this.props.isError,
            'crossword__cell--hiddenWord': this.props.hiddenWord,
          })}
          textAnchor="middle"
        >
          {this.props.value}
        </text>
      );
    }

    return (
      <g onClick={this.onClick.bind(this)}>
        <rect
          x={left}
          y={top}
          width={constants.cellSize}
          height={constants.cellSize}
          className={classNames({
            crossword__cell: true,
            'crossword__cell--focussed': this.props.isFocussed,
            'crossword__cell--wrong': this.props.wrong,
            'crossword__cell--highlighted': this.props.isHighlighted,
            'crossword__cell--hiddenWord': this.props.hiddenWord,
          })}
        />
        {cellNumber}
        {cellValue}
      </g>
    );
  }
}

export default Cell;
