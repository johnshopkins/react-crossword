import React, { Component } from 'react';

class HiddenWordBlock extends Component {

  handleChange(event) {
    this.props.onChange(
      parseInt(this.props.x),
      parseInt(this.props.y),
      event.target.value
    );
  }

  render() {
    return (
      <input
        type='text'
        maxLength='1'
        autoComplete='off'
        spellCheck='false'
        autoCorrect='off'
        value={this.props.value}
        onChange={this.handleChange.bind(this)}
      />
    );
  }
}

export default HiddenWordBlock;
