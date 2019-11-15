import React from 'react';
import { constants } from 'crosswords/constants';
import { keycodes } from 'crosswords/keycodes';

const HiddenWordCharacter = React.forwardRef((props, ref) => {

  const handleChange = (event) => { 
    props.onChange(
      parseInt(props.x),
      parseInt(props.y),
      event.target.value,
      props.i
    );
  }

  const handleFocus = (event) => {
    ref.current.select();
    props.onFocus(
      parseInt(props.x),
      parseInt(props.y)
    );
  }

  const handleKeyDown = (event) => {
    if (event.target.value === '' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      if (event.keyCode === keycodes.backspace || event.keyCode === keycodes.delete) {
        event.preventDefault();
        props.onKeyDown(props.i);
      }
    }
  }

  const cellSize = constants.cellSize + (constants.borderSize * 2);

  return (
    <input
      type='text'
      maxLength='1'
      autoComplete='off'
      spellCheck='false'
      autoCorrect='off'
      value={props.value}
      ref={ref}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      onFocus={handleFocus}
      style={{ width: cellSize, height: cellSize }}
    />
  );

});

export default HiddenWordCharacter;
