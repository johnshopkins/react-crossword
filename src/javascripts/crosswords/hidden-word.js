import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import HiddenWordCharacter from 'crosswords/hidden-word-character';

class HiddenWord extends Component {
  constructor(props) {
    super(props);

    // create flat list of cells in the hidden word
    this.cells = [];  
    Object.keys(this.props.hiddenWord.cells).map((x) => this.props.hiddenWord.cells[x].map((y) => {
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

    if (!success) {
      return;
    }

    if (this.inputRefs[i+1]) {      
      this.inputRefs[i+1].current.focus();
      this.inputRefs[i+1].current.select();
    } else {
      this.submitRef.current.focus();
    }
  }

  render() {

    return (
      <form onSubmit={this.props.onSubmit}>
        {this.cells.map((cell, i) => {    
          return <HiddenWordCharacter
            value={cell.value}
            focussed={this.props.focussed === i}
            x={cell.x}
            y={cell.y}
            key={i}
            i={i}
            ref={this.inputRefs[i]}
            onChange={this.handleChange.bind(this)}
            onFocus={this.props.onFocus}
          />;
        })}
        <input type={'submit'} value={'Submit'} ref={this.submitRef} />
      </form>
    );
  }
}

export { HiddenWord };
