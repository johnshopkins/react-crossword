import React, { Component } from 'react';
import HiddenWordCharacter from 'crosswords/hidden-word-character';

class HiddenWord extends Component {
  constructor(props) {
    super(props);

    // flip array (instead of x:[y], y:[x]) so that the password
    // reads from left to right
    const flipped = {};
    Object.keys(this.props.hiddenWord.cells).map((x) => this.props.hiddenWord.cells[x].map((y) => {
      if (typeof flipped[y] === 'undefined') flipped[y] = [];
      flipped[y].push(x);
    }));

    // create flat list of cells in the hidden word
    this.cells = [];  
    Object.keys(flipped).map((y) => flipped[y].map((x) => {
      let cell = this.props.grid[x][y];
      cell.x = parseInt(x);
      cell.y = parseInt(y);
      this.cells.push(cell);
    }));

    this.inputRefs = Array(this.cells.length).fill(0).map(() => React.createRef());
    this.submitRef = React.createRef();
        
  }

  handleChange(x, y, character, i) {

    const success = this.props.onChange(x, y, character);

    if (!success || !character) {
      return;
    }

    if (this.inputRefs[i+1]) {      
      this.inputRefs[i+1].current.focus();
      this.inputRefs[i+1].current.select();
    } else {
      this.submitRef.current.focus();
    }
  }

  onKeyDown(i) {
    if (i >= 1) {      
      this.inputRefs[i-1].current.focus();
      this.inputRefs[i-1].current.select();
    }
  }

  render() {
    return (
      <form onSubmit={this.props.onSubmit} className="crossword__hidden-word">
        <fieldset>
          { this.props.hiddenWord.title && <legend>{this.props.hiddenWord.title}</legend> }
          {this.cells.map((cell, i) => {    
          return <HiddenWordCharacter
            value={cell.value}
            x={cell.x}
            y={cell.y}
            key={i}
            i={i}
            ref={this.inputRefs[i]}
            onChange={this.handleChange.bind(this)}
            onKeyDown={this.onKeyDown.bind(this)}
            onFocus={this.props.onFocus}
          />;
        })}
        </fieldset>
        <input type={'submit'} value={'Submit'} ref={this.submitRef} />
      </form>
    );
  }
}

export { HiddenWord };
