import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import bean from 'bean';
import fastdom from 'fastdom';
import $ from 'lib/$';
import { classNames } from 'crosswords/classNames';
import { isBreakpoint } from 'lib/detect';
import { scrollTo } from 'lib/scroller';

class Clue extends Component {
  onClick(e) {
    e.preventDefault();
    this.props.setReturnPosition();
    this.props.focusFirstCellInClueById(this.props.id);
  }

  render() {
    return (
      <li>
        <a
          href={`#${this.props.id}`}
          onClick={this.onClick.bind(this)}
          className={classNames({
            crossword__clue: true,
            'crossword__clue--answered': this.props.hasAnswered,
            'crossword__clue--selected': this.props.isSelected,
            'crossword__clue--display-group-order':
                            JSON.stringify(this.props.number)
                            !== this.props.humanNumber,
          })}
        >
          <div className="crossword__clue__number">
            {this.props.humanNumber}
          </div>
          <div
            className="crossword__clue__text"
            dangerouslySetInnerHTML={{ __html: this.props.clue }}
          />
        </a>
      </li>
    );
  }
}

class Clues extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showGradient: true,
    };
  }

  componentDidMount() {
    this.$cluesNode = findDOMNode(this.clues);
  
    bean.on(this.$cluesNode, 'scroll', (e) => {
      const height = this.$cluesNode.scrollHeight - this.$cluesNode.clientHeight;
      const showGradient = height - e.currentTarget.scrollTop > 25;

      if (this.state.showGradient !== showGradient) {
        this.setState({
          showGradient,
        });
      }
    });
  }

  /**
     * Scroll clues into view when they're activated (i.e. clicked in the grid)
     */
  componentDidUpdate(prev) {

    this.setCluesHeight();

    if (
      isBreakpoint({
        min: 'tablet',
        // max: 'wide',
      })
            && (this.props.focussed
                && (!prev.focussed || prev.focussed.id !== this.props.focussed.id))
    ) {
      fastdom.read(() => {
        this.scrollIntoView(this.props.focussed);
      });
    }
  }

  setCluesHeight() {
    if (!this.$cluesWrapper) {
      this.$cluesWrapper = $(findDOMNode(this.cluesWrapper));
    }
    if (!this.$clues) {
      this.$clues = $(findDOMNode(this.clues));
    }

    if (isBreakpoint({ min: 'tablet' })) {
      const height = `${this.props.height}px`;
      fastdom.read(() => {
        fastdom.write(() => {
          this.$cluesWrapper.css('height', height);
          this.$clues.css('height', height);
        });
        this.cluesHeightIsSet = true;
      });
    } else if (this.cluesHeightIsSet) {
      this.$cluesWrapper.attr('style', '');
      this.$clues.attr('style', '');
    }    
  }

  scrollIntoView(clue) {
    const buffer = 100;
    const node = findDOMNode(this[clue.id]);
    const visible = node.offsetTop - buffer > this.$cluesNode.scrollTop
            && node.offsetTop + buffer
                < this.$cluesNode.scrollTop + this.$cluesNode.clientHeight;

    if (!visible) {
      const offset = node.offsetTop - this.$cluesNode.clientHeight / 2;
      scrollTo(offset, 250, 'easeOutQuad', this.$cluesNode);
    }
  }

  render() {
    const headerClass = 'crossword__clues-header';
    const cluesByDirection = direction => this.props.clues
      .filter(clue => clue.entry.direction === direction)
      .map(clue => (
        <Clue
          ref={(clueRef) => {
            this[clue.entry.id] = clueRef;
          }}
          id={clue.entry.id}
          key={clue.entry.id}
          number={clue.entry.number}
          humanNumber={clue.entry.humanNumber}
          clue={clue.entry.clue}
          hasAnswered={clue.hasAnswered}
          isSelected={clue.isSelected}
          focusFirstCellInClueById={
                            this.props.focusFirstCellInClueById
                        }
          setReturnPosition={() => {
            this.props.setReturnPosition(window.scrollY);
          }}
        />
      ));

    return (
      <div
        className={`crossword__clues--wrapper ${
          this.state.showGradient ? '' : 'hide-gradient'
        }`}
        ref={(cluesWrapper) => {
          this.cluesWrapper = cluesWrapper;
        }}
      >
        <div
          className="crossword__clues"
          ref={(clues) => {
            this.clues = clues;
          }}
        >
          <div className="crossword__clues--across">
            <h3 className={headerClass}>Across</h3>
            <ol className="crossword__clues-list">
              {cluesByDirection('across')}
            </ol>
          </div>
          <div className="crossword__clues--down">
            <h3 className={headerClass}>Down</h3>
            <ol className="crossword__clues-list">
              {cluesByDirection('down')}
            </ol>
          </div>
        </div>
        <div className="crossword__clues__gradient" />
      </div>
    );
  }
}

export { Clues };
