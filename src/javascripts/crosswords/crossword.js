import 'main.scss';
import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import fastdom from 'fastdom';
import $ from 'lib/$';
import mediator from 'lib/mediator';
import { isBreakpoint } from 'lib/detect';
import { scrollTo } from 'lib/scroller';
import { addEventListener } from 'lib/events';
import debounce from 'lodash/debounce';
import zip from 'lodash/zip';
import { Clues } from 'crosswords/clues';
import { Controls } from 'crosswords/controls';
import { HiddenInput } from 'crosswords/hidden-input';
import { Grid } from 'crosswords/grid';
import { HiddenWord } from 'crosswords/hidden-word';
import {
  buildClueMap,
  buildGrid,
  otherDirection,
  entryHasCell,
  cluesFor,
  mapGrid,
  getClearableCellsForClue,
  getLastCellInClue,
  getPreviousClueInGroup,
  isFirstCellInClue,
  getNextClueInGroup,
  isLastCellInClue,
  gridSize,
  checkClueHasBeenAnswered,
  buildSeparatorMap,
  cellsForEntry,
} from 'crosswords/helpers';
import { keycodes } from 'crosswords/keycodes';
import { saveGridState, loadGridState } from 'crosswords/persistence';
import { classNames } from 'crosswords/classNames';

class Crossword extends Component {
  constructor(props) {
    super(props);

    this.addWindowResizeEvent();

    const dimensions = this.props.data.dimensions;

    this.columns = dimensions.cols;
    this.rows = dimensions.rows;
    this.clueMap = buildClueMap(this.props.data.entries);

    this.checked= [];

    this.hiddenWord = this.props.data.hiddenWord || null;
    this.eventHandler = this.props.data.eventHandler || null;

    this.cluesInitialized = false;
    this.cluesAttempted = [];
    this.cluesCorrect = [];

    this.state = {
      grid: buildGrid(
        dimensions.rows,
        dimensions.cols,
        this.props.data.entries,
        this.props.loadGrid(this.props.id),
        this.hiddenWord.cells
      ),
      cellInFocus: null,
      directionOfEntry: null,
      gridHeight: '',
    };
  }

  addWindowResizeEvent() {
    const onResize = (evt) => {
      mediator.emitEvent('window:throttledResize', [evt]);
    };

    addEventListener(window, 'resize', debounce(onResize, 200), {
      passive: true,
    });
  }

  componentDidMount() {
    // Sticky clue
    const $stickyClueWrapper = $(findDOMNode(this.stickyClueWrapper));
    const $game = $(findDOMNode(this.game));

    mediator.on(
      'window:throttledResize',
      debounce(this.setGridHeight.bind(this), 200),
    );
    this.setGridHeight();

    addEventListener(window, 'scroll', () => {
      const gameOffset = $game.offset();
      const stickyClueWrapperOffset = $stickyClueWrapper.offset();
      const scrollY = window.scrollY;

      const scrollYPastGame = scrollY - gameOffset.top;

      if (scrollYPastGame >= 0) {
        const gameOffsetBottom = gameOffset.top + gameOffset.height;

        if (
          scrollY
                    > gameOffsetBottom - stickyClueWrapperOffset.height
        ) {
          $stickyClueWrapper.css({ top: 'auto', bottom: 0 });
        } else {
          $stickyClueWrapper.css({
            top: scrollYPastGame,
            bottom: '',
          });
        }
      } else {
        $stickyClueWrapper.css({ top: '', bottom: '' });
      }
    });

    const entryId = window.location.hash.replace('#', '');
    this.focusFirstCellInClueById(entryId);
  }

  onKeyDown(event) {
    const cell = this.state.cellInFocus;

    if (!event.metaKey && !event.ctrlKey && !event.altKey) {
      if (
        event.keyCode === keycodes.backspace
                || event.keyCode === keycodes.delete
      ) {
        event.preventDefault();
        if (cell) {
          if (this.cellIsEmpty(cell.x, cell.y)) {
            this.focusPrevious();
          } else {
            this.setCellValue(cell.x, cell.y, '');
            this.saveGrid();
          }
        }
      } else if (event.keyCode === keycodes.left) {
        event.preventDefault();
        this.moveFocus(-1, 0);
      } else if (event.keyCode === keycodes.up) {
        event.preventDefault();
        this.moveFocus(0, -1);
      } else if (event.keyCode === keycodes.right) {
        event.preventDefault();
        this.moveFocus(1, 0);
      } else if (event.keyCode === keycodes.down) {
        event.preventDefault();
        this.moveFocus(0, 1);
      }
    }
  }

  // called when cell is selected (by click or programtically focussed)
  onSelect(x, y) {
    const cellInFocus = this.state.cellInFocus;
    const clue = cluesFor(this.clueMap, x, y);
    const focussedClue = this.clueInFocus();
    let newDirection;

    const isInsideFocussedClue = () => (focussedClue ? entryHasCell(focussedClue, x, y) : false);

    if (
      cellInFocus
            && cellInFocus.x === x
            && cellInFocus.y === y
            && this.state.directionOfEntry
    ) {
      /** User has clicked again on the highlighted cell, meaning we ought to swap direction */
      newDirection = otherDirection(this.state.directionOfEntry);

      if (clue[newDirection]) {
        this.focusClue(x, y, newDirection);
      }
    } else if (isInsideFocussedClue() && this.state.directionOfEntry) {
      /**
             * If we've clicked inside the currently highlighted clue, then we ought to just shift the cursor
             * to the new cell, not change direction or anything funny.
             */

      this.focusClue(x, y, this.state.directionOfEntry);
    } else {
      this.state.cellInFocus = {
        x,
        y,
      };

      const isStartOfClue = sourceClue => !!sourceClue
                && sourceClue.position.x === x
                && sourceClue.position.y === y;

      /**
             * If the user clicks on the start of a down clue midway through an across clue, we should
             * prefer to highlight the down clue.
             */
      if (!isStartOfClue(clue.across) && isStartOfClue(clue.down)) {
        newDirection = 'down';
      } else if (clue.across) {
        /** Across is the default focus otherwise */
        newDirection = 'across';
      } else {
        newDirection = 'down';
      }
      this.focusClue(x, y, newDirection);
    }
  }

  onCheat() {
    this.allHighlightedClues().forEach(clue => this.cheat(clue));
    this.saveGrid();
  }

  onCheck() {
    // 'Check this' checks single and grouped clues
    this.allHighlightedClues().forEach(clue => this.check(clue));
    this.saveGrid();
  }

  onSolution() {
    this.props.data.entries.forEach(clue => this.cheat(clue));
    this.saveGrid();
  }

  onCheckAll() {
    this.props.data.entries.forEach(clue => this.check(clue));
    this.saveGrid();
  }

  onClearAll() {
    this.clearPreviousChecks();

    this.setState({
      grid: mapGrid(this.state.grid, (cell, gridX, gridY) => {
        const previousValue = cell.value;
        cell.value = '';
        this.props.onMove({
          x: gridX, y: gridY, value: '', previousValue,
        });
        return cell;
      }),
    });

    this.saveGrid();
  }

  onClearSingle() {

    const clueInFocus = this.clueInFocus();

    if (clueInFocus) {

      this.clearPreviousChecks(clueInFocus);

      // Merge arrays of cells from all highlighted clues
      // const cellsInFocus = _.flatten(_.map(this.allHighlightedClues(), helpers.cellsForEntry, this));
      const cellsInFocus = getClearableCellsForClue(
        this.state.grid,
        this.clueMap,
        this.props.data.entries,
        clueInFocus,
      );

      this.setState({
        grid: mapGrid(this.state.grid, (cell, gridX, gridY) => {
          if (
            cellsInFocus.some(c => c.x === gridX && c.y === gridY)
          ) {
            const previousValue = cell.value;
            cell.value = '';
            this.props.onMove({
              x: gridX, y: gridY, value: '', previousValue,
            });
          }
          return cell;
        }),
      });

      this.saveGrid();
    }
  }

  onClickHiddenInput(event) {
    const focussed = this.state.cellInFocus;

    if (focussed) {
      this.onSelect(focussed.x, focussed.y);
    }

    /* We need to handle touch seperately as touching an input on iPhone does not fire the
         click event - listen for a touchStart and preventDefault to avoid calling onSelect twice on
         devices that fire click AND touch events. The click event doesn't fire only when the input is already focused */
    if (event.type === 'touchstart') {
      event.preventDefault();
    }
  }

  setGridHeight() {
    if (!this.$gridWrapper) {
      this.$gridWrapper = $(findDOMNode(this.gridWrapper));
    }

    // set grid height to state for clues component
    const gridHeight = this.$gridWrapper.offset().width;
    this.setState({ gridHeight: gridHeight });

    if (isBreakpoint({ max: 'tablet' })) {
      fastdom.read(() => {
        // Our grid is a square, set the height of the grid wrapper
        // to the width of the grid wrapper
        fastdom.write(() => {
          this.$gridWrapper.css(
            'height',
            `${gridHeight}px`,
          );
        });
        this.gridHeightIsSet = true;
      });
    } else if (this.gridHeightIsSet) {
      // Remove inline style if tablet and wider
      this.$gridWrapper.attr('style', '');
    }
  }

  setCellValue(x, y, value, triggerOnMoveCallback = true) {
    this.setState({
      grid: mapGrid(this.state.grid, (cell, gridX, gridY) => {
        if (gridX === x && gridY === y) {
          const previousValue = cell.value;
          cell.value = value;
          cell.isError = false;
          if (triggerOnMoveCallback) {
            this.props.onMove({
              x, y, value, previousValue,
            });
          }
        }

        return cell;
      }),
    });
  }

  getCellValue(x, y) {
    return this.state.grid[x][y].value;
  }

  setReturnPosition(position) {
    this.returnPosition = position;
  }

  updateGrid(gridState) {
    this.setState({
      grid: buildGrid(
        this.rows,
        this.columns,
        this.props.data.entries,
        gridState,
        this.hiddenWord,
      ),
    });
  }

  insertCharacter(character) {
    const characterUppercase = character.toUpperCase();
    const cell = this.state.cellInFocus;

    if (
      /[A-Za-zÀ-ÿ0-9]/.test(characterUppercase)
            && characterUppercase.length === 1
            && cell
    ) {
      this.setCellValue(cell.x, cell.y, characterUppercase);
      this.saveGrid();
      this.focusNext();
    }
  }

  onHiddenWordBlockChange(x, y, character) {

    const characterUppercase = character.toUpperCase();
    const cell = this.state.grid[x][y];

    if ((characterUppercase === '' || /[A-Za-zÀ-ÿ0-9]/.test(characterUppercase) && cell)) {
      this.setCellValue(x, y, characterUppercase);
      this.saveGrid();
      return true;
    }

    return false;
  }

  onHiddenWordBlockFocus(x, y) {
    // remove focus from crossword puzzle
    this.setState({ cellInFocus: null })
  }

  onHiddenWordBlockSubmit(e) {

    e.preventDefault()

    let success = true;
    Object.keys(this.hiddenWord.cells).map((x) => this.hiddenWord.cells[x].map((y) => {
      const cell = this.state.grid[x][y];
      if (cell.value !== cell.correctValue) {
        success = false;
      }
    }));

    if (this.eventHandler) {
      this.eventHandler.push({
        'event': 'passwordSubmitted',
        'label': 'Valid',
        'value': success
      });
      this.eventHandler.push({
        'event': 'crosswordSubmitted',
        'label': 'Clues attempted',
        'value': this.cluesAttempted.length
      });
      this.eventHandler.push({
        'event': 'crosswordSubmitted',
        'label': 'Clues correct',
        'value': this.cluesCorrect.length
      });
    }

    if (typeof this.hiddenWord.callback === 'function') {
      this.hiddenWord.callback(success);
    }
  }

  cellIsEmpty(x, y) {
    return !this.getCellValue(x, y);
  }

  goToReturnPosition() {
    if (
      isBreakpoint({
        max: 'mobile',
      })
    ) {
      if (this.returnPosition) {
        scrollTo(this.returnPosition, 250, 'easeOutQuad');
      }
      this.returnPosition = null;
    }
  }

  indexOfClueInFocus() {
    return this.props.data.entries.indexOf(this.clueInFocus());
  }

  focusPreviousClue() {
    const i = this.indexOfClueInFocus();
    const entries = this.props.data.entries;

    if (i !== -1) {
      const newClue = entries[i === 0 ? entries.length - 1 : i - 1];
      this.focusClue(
        newClue.position.x,
        newClue.position.y,
        newClue.direction,
      );
    }
  }

  focusNextClue() {
    const i = this.indexOfClueInFocus();
    const entries = this.props.data.entries;

    if (i !== -1) {
      const newClue = entries[i === entries.length - 1 ? 0 : i + 1];
      this.focusClue(
        newClue.position.x,
        newClue.position.y,
        newClue.direction,
      );
    }
  }

  /**
   * Find the next editable cell on the current row/column (wrap on grid overflow).
   * @param {number} deltaX - Horizontal delta (-1, 0, 1).
   * @param {number} deltaY - Vertical delta (-1, 0, 1).
  */
  findNextEditableCell(deltaX, deltaY) {
    const currentCell = this.state.cellInFocus;

    if (!currentCell || !this.state.grid[currentCell.x]
                     || !this.state.grid[currentCell.x][currentCell.y]
    ) {
      return null;
    }

    let x = currentCell.x;
    let y = currentCell.y;
    let cell;

    const nextPos = (i, amount, max) => {
      i += amount;

      if (i === -1) {
        return max - 1;
      }
      if (i === max) {
        return 0;
      }

      return i;
    };

    // find next editable cell on row/column
    while (!cell) {
      if (deltaY === 1 || deltaY === -1) {
        y = nextPos(y, deltaY, this.rows);
      } else if (deltaX === 1 || deltaX === -1) {
        x = nextPos(x, deltaX, this.columns);
      }

      const tempCell = this.state.grid[x][y];
      if (tempCell && tempCell.isEditable) {
        cell = { x, y };
      }
    }

    return cell;
  }

  moveFocus(deltaX, deltaY) {
    const cell = this.findNextEditableCell(deltaX, deltaY);

    if (!cell) {
      return;
    }

    const clue = cluesFor(this.clueMap, cell.x, cell.y);
    let direction = 'down';

    // keep current direction if possible
    if ((deltaX !== 0 && clue.across)
        || (deltaY !== 0 && !clue.down)
    ) {
      direction = 'across';
    }

    this.focusClue(cell.x, cell.y, direction);
  }

  isAcross() {
    return this.state.directionOfEntry === 'across';
  }

  focusPrevious() {
    const cell = this.state.cellInFocus;
    const clue = this.clueInFocus();

    if (cell && clue) {
      if (isFirstCellInClue(cell, clue)) {
        const newClue = getPreviousClueInGroup(
          this.props.data.entries,
          clue,
        );
        if (newClue) {
          const newCell = getLastCellInClue(newClue);
          this.focusClue(newCell.x, newCell.y, newClue.direction);
        }
      } else if (this.isAcross()) {
        this.moveFocus(-1, 0);
      } else {
        this.moveFocus(0, -1);
      }
    }
  }

  focusNext() {
    const cell = this.state.cellInFocus;
    const clue = this.clueInFocus();

    if (cell && clue) {
      if (isLastCellInClue(cell, clue)) {
        const newClue = getNextClueInGroup(
          this.props.data.entries,
          clue,
        );
        if (newClue) {
          this.focusClue(
            newClue.position.x,
            newClue.position.y,
            newClue.direction,
          );
        }
      } else if (this.isAcross()) {
        this.moveFocus(1, 0);
      } else {
        this.moveFocus(0, 1);
      }
    }
  }

  asPercentage(x, y) {
    const width = gridSize(this.columns);
    const height = gridSize(this.rows);

    return {
      x: (100 * x) / width,
      y: (100 * y) / height,
    };
  }

  focusHiddenInput(x, y) {
    const wrapper = findDOMNode(this.hiddenInputComponent.wrapper);
    const left = gridSize(x);
    const top = gridSize(y);
    const position = this.asPercentage(left, top);

    /** This has to be done before focus to move viewport accordingly */
    wrapper.style.left = `${position.x}%`;
    wrapper.style.top = `${position.y}%`;

    const hiddenInputNode = findDOMNode(this.hiddenInputComponent.input);

    if (document.activeElement !== hiddenInputNode) {
      hiddenInputNode.focus();
    }
  }

  /**
   * If only one clue should be cleared, pass it as the only argument
   */
  clearPreviousChecks(clue) {
    if (this.checked.length === 0) {
      return;
    }

    const stillChecked = [];

    this.checked.forEach(entry => {
      if (!clue || (clue && entry.id === clue.id)) {
        const cells = cellsForEntry(entry);
        cells.forEach(cell => this.state.grid[cell.x][cell.y].wrong = false);
      } else {
        stillChecked.push(entry);
      }
    });

    this.setState({
      grid: this.state.grid
    });

    this.checked = stillChecked;
  }

  // Focus corresponding clue for a given cell
  focusClue(x, y, direction) {

    const clues = cluesFor(this.clueMap, x, y);
    const clue = clues[direction];

    this.clearPreviousChecks(clue);

    if (clues && clue) {
      this.focusHiddenInput(x, y);

      this.setState({
        grid: this.state.grid,
        cellInFocus: {
          x,
          y,
        },
        directionOfEntry: direction,
      });

      // Side effect
      window.history.replaceState(
        undefined,
        document.title,
        `#${clue.id}`,
      );

      this.props.onFocusClue({ x, y, clueId: clue.id });
    }
  }

  // Focus first cell in given clue
  focusFirstCellInClue(entry) {
    this.focusClue(entry.position.x, entry.position.y, entry.direction);
  }

  focusFirstCellInClueById(clueId) {
    const newEntry = this.props.data.entries.find(val => val.id === clueId);
    if (newEntry) {
      this.focusFirstCellInClue(newEntry);
    }
  }

  focusCurrentCell() {
    if (this.state.cellInFocus) {
      this.focusHiddenInput(
        this.state.cellInFocus.x,
        this.state.cellInFocus.y,
      );
    }
  }

  clueInFocus() {
    if (this.state.cellInFocus) {
      const cluesForCell = cluesFor(
        this.clueMap,
        this.state.cellInFocus.x,
        this.state.cellInFocus.y,
      );

      if (this.state.directionOfEntry) {
        return cluesForCell[this.state.directionOfEntry];
      }
    }
    return null;
  }

  allHighlightedClues() {
    return this.props.data.entries.filter(clue => this.clueIsInFocusGroup(clue));
  }

  clueIsInFocusGroup(clue) {
    if (this.state.cellInFocus) {
      const cluesForCell = cluesFor(
        this.clueMap,
        this.state.cellInFocus.x,
        this.state.cellInFocus.y,
      );

      if (
        this.state.directionOfEntry
                && cluesForCell[this.state.directionOfEntry]
      ) {
        return cluesForCell[this.state.directionOfEntry].group.includes(
          clue.id,
        );
      }
    }
    return false;
  }

  cluesData() {

    let cluesAttempted = [];
    let cluesCorrect = [];

    const clues = this.props.data.entries.map((entry) => {
      const hasAnswered = checkClueHasBeenAnswered(
        this.state.grid,
        entry,
      );

      if (hasAnswered) {

        const entryLabel = entry.number + ' ' + entry.direction;

        if (this.cluesAttempted.indexOf(entryLabel) === -1) {
          // new clue attempted
          cluesAttempted.push(entryLabel);
        }

        if (this.cluesCorrect.indexOf(entryLabel) === -1 && entry.solution && this.findBadCells(entry).length === 0) {
          // new clue answered correctly
          cluesCorrect.push(entryLabel);
        }
      }

      return {
        entry,
        hasAnswered,
        isSelected: this.clueIsInFocusGroup(entry),
      };
    });

    if (this.eventHandler && this.cluesInitialized === true) {

      let newAttempts = cluesAttempted.filter(x => this.cluesAttempted.indexOf(x) === -1);
      if (newAttempts.length > 0) {
        this.eventHandler.push({
          'event': 'clueAttempted',
          'label': newAttempts[0]
        });
      }

      let newCorrectAttempts = cluesCorrect.filter(x => this.cluesCorrect.indexOf(x) === -1);
      if (newCorrectAttempts.length > 0) {
        this.eventHandler.push({
          'event': 'clueAnsweredCorrectly',
          'label': newCorrectAttempts[0]
        });
      }
    }

    // add new ones
    this.cluesAttempted = this.cluesAttempted.concat(cluesAttempted);
    this.cluesCorrect = this.cluesCorrect.concat(cluesCorrect);

    this.cluesInitialized = true;

    return clues;
  }

  cheat(entry) {
    const cells = cellsForEntry(entry);

    if (entry.solution) {
      this.setState({
        grid: mapGrid(this.state.grid, (cell, x, y) => {
          if (cells.some(c => c.x === x && c.y === y)) {
            const n = entry.direction === 'across'
              ? x - entry.position.x
              : y - entry.position.y;
            const previousValue = cell.value;
            cell.value = entry.solution[n];
            this.props.onMove({
              x, y, value: cell.value, previousValue,
            });
          }

          return cell;
        }),
      });
    }
  }

  findBadCells(entry) {
    const cells = cellsForEntry(entry);
    return zip(cells, entry.solution.split(''))
      .filter((cellAndSolution) => {
        const coords = cellAndSolution[0];
        const cell = this.state.grid[coords.x][coords.y];
        const solution = cellAndSolution[1];
        return (
          /^.$/.test(cell.value) && cell.value !== solution
        );
      })
      .map(cellAndSolution => cellAndSolution[0]);
  }

  check(entry) {
    if (entry.solution) {
      const badCells = this.findBadCells(entry);
      this.setState({
        grid: mapGrid(this.state.grid, (cell, gridX, gridY) => {
          if (badCells.some(bad => bad.x === gridX && bad.y === gridY)) {
            const previousValue = cell.value;
            cell.wrong = true;
            this.props.onMove({
              x: gridX, y: gridY, value: '', previousValue,
            });
          }

          return cell;
        }),
      });
      this.checked.push(entry);
    }
  }

  hiddenInputValue() {
    const cell = this.state.cellInFocus;

    let currentValue;

    if (cell) {
      currentValue = this.state.grid[cell.x][cell.y].value;
    }

    return currentValue || '';
  }

  hasSolutions() {
    return 'solution' in this.props.data.entries[0];
  }

  isHighlighted(x, y) {
    const focused = this.clueInFocus();
    return focused
      ? focused.group.some((id) => {
        const entry = this.props.data.entries.find(e => e.id === id);
        return entryHasCell(entry, x, y);
      })
      : false;
  }

  saveGrid() {
    const entries = this.state.grid.map(row => row.map(cell => cell.value));
    this.props.saveGrid(this.props.id, entries);
  }

  render() {
    const focused = this.clueInFocus();

    const gridProps = {
      rows: this.rows,
      columns: this.columns,
      cells: this.state.grid,
      separators: buildSeparatorMap(this.props.data.entries),
      crossword: this,
      focussedCell: this.state.cellInFocus,
      ref: (grid) => {
        this.grid = grid;
      },
    };

    return (
      <div>
      <div
        className={`crossword__container crossword__container--${
          this.props.data.crosswordType
        } crossword__container--react`}
        data-link-name="Crosswords"
      >
        <div
          className="crossword__container__game"
          ref={(game) => {
            this.game = game;
          }}
        >
          <div
            className="crossword__sticky-clue-wrapper"
            ref={(stickyClueWrapper) => {
              this.stickyClueWrapper = stickyClueWrapper;
            }}
          >
            <div
              className={classNames({
                'crossword__sticky-clue': true,
                'is-hidden': !focused,
              })}
            >
              {focused && (
              <div className="crossword__sticky-clue__inner">
                <div className="crossword__sticky-clue__inner__inner">
                  <strong>
                    {focused.number}
                    {' '}
                    <span className="crossword__sticky-clue__direction">
                      {focused.direction}
                    </span>
                  </strong>
                  {' '}
                  <span
                    className="crossword__sticky-clue__text"
                    dangerouslySetInnerHTML={{ __html: focused.clue }}
                  />
                </div>
              </div>
              )}
            </div>
          </div>
          <div
            className="crossword__container__grid-wrapper"
            ref={(gridWrapper) => {
              this.gridWrapper = gridWrapper;
            }}
          >
            {Grid(gridProps)}
            <HiddenInput
              crossword={this}
              value={this.hiddenInputValue()}
              ref={(hiddenInputComponent) => {
                this.hiddenInputComponent = hiddenInputComponent;
              }}
            />
          </div>
        </div>
        <Controls
          hasSolutions={this.hasSolutions()}
          clueInFocus={focused}
          crossword={this}
        />
        <Clues
          clues={this.cluesData()}
          focussed={focused}
          focusFirstCellInClueById={this.focusFirstCellInClueById.bind(
            this,
          )}
          height={this.state.gridHeight}
          setReturnPosition={this.setReturnPosition.bind(this)}
        />
      </div>
      <HiddenWord
        grid={this.state.grid}
        hiddenWord={this.hiddenWord}
        onChange={this.onHiddenWordBlockChange.bind(this)}
        onFocus={this.onHiddenWordBlockFocus.bind(this)}
        onSubmit={this.onHiddenWordBlockSubmit.bind(this)}
      />
      </div>
    );
  }
}

Crossword.defaultProps = {
  hiddenWord: [],
  onMove: () => {},
  onFocusClue: () => {},
  loadGrid: id => loadGridState(id),
  saveGrid: (id, grid) => saveGridState(id, grid),
};

export default Crossword;
