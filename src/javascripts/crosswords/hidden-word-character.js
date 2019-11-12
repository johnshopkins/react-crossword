import React from 'react';

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
    props.onFocus(
      parseInt(props.x),
      parseInt(props.y)
    );
  }

  return (
    <input
      type='text'
      maxLength='1'
      autoComplete='off'
      spellCheck='false'
      autoCorrect='off'
      value={props.value}
      ref={ref}
      onChange={handleChange}
      onFocus={handleFocus}
    />
  );

});

export default HiddenWordCharacter;
