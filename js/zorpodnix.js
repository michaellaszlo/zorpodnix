var Zorpodnix = (function () {
  'use strict';

  var shapePalettes = [
        [ '#e0de99', '#e08739', '#b23331', '#4f68a7', '#6ca76f' ]
      ],
      colors = {
        shapePalette: shapePalettes[0],
        touch: {
          fillOpacity: 0.65,
          instant: '#666',
          fill: '#fff'
        },
        action: {
          stroke: {
            normal: '#222',
            highlight: '#ddd'
          }
        }
      },
      shapePainters = [],
      shapeNames = [],
      shapes = [],
      syllables,
      easing = {
        // Each function maps the domain [0, 1] to the range [0, 1].
        linear: function (t) {
          return t;
        },
        cubicInOut: function (t) {
          t /= 0.5;
          if (t < 1) {
            return 0.5 * t * t * t;
          }
          t -= 2;
          return 0.5 * (t * t * t + 2);
        }
      },
      animation = {
        touch: {
          seconds: 0.5,
          easing: easing.cubicInOut
        },
        hit: {
          seconds: 1
        },
        spell: {
          grow: {
            seconds: 0.5,
            easing: easing.cubicInOut
          },
          vanish: {
            seconds: 0.5
          },
          reveal: {
            seconds: 0.5
          }
        }
      },
      layout = {
        landscape: {
          action: 'right'
        },
        portrait: {
          action: 'bottom'
        },
        info: {
          fontFactor: 0.15,
        },
        spell: {
          spanFill: 0.9,
          maxWeight: 1.5,
          shapeFactorX: 0.3,
          syllableFactorY: 0.36,
          syllableFactorX: -0.075,
          fontFactor: 0.19,
          passiveGray: 0.6,
          activeGray: 0.1,
          fontFamily: "'Bitter', sans-serif"
        },
        action: {
          radiusFactor: 1 / 8
        },
        shape: {
          lineFactor: 1 / 20
        }
      },
      sizes = {},
      margin = {},
      containers = {},
      offsets = {},
      canvases = {},
      contexts = {},
      status = {},
      animationGroups = {},
      level = {},
      current = {};

  function addShapePainter(name, painter) {
    shapePainters.push(painter);
    shapeNames.push(name);
  }

  function setSyllables(someSyllables) {
    syllables = someSyllables;
  }

  function Shape(name, painter, color) {
    this.name = name;
    this.painter = painter;
    this.color = color;
  }
  Shape.prototype.paint = function (context, options) {
    context.save();
    context.fillStyle = this.color;
    context.strokeStyle = colors.action.stroke.normal;
    if (options) {
      if ('fill' in options) {
        context.fillStyle = options.fill;
      }
      if ('stroke' in options) {
        context.strokeStyle = options.stroke;
      }
    }
    this.painter(context);
    context.restore();
  };

  function makeShapes() {
    shapePainters.forEach(function (painter, index) {
      var name = shapeNames[index];
      colors.shapePalette.forEach(function (color) {
        shapes.push(new Shape(name, painter, color));
      });
    });
  }

  function Animation(groupName, action, cleanup, seconds) {
    this.groupName = groupName;
    this.action = action;
    this.cleanup = cleanup;
    this.duration = (seconds === undefined ? null : seconds * 1000);
  }
  Animation.prototype.launch = function () {
    if (!(this.groupName in animationGroups)) {
      animationGroups[this.groupName] = [];
    }
    animationGroups[this.groupName].push(this);
    this.previouslyElapsed = 0;
    this.latestStart = Date.now();
  };
  Animation.prototype.pause = function (currentTime) {
    this.previouslyElapsed += currentTime - this.latestStart;
  };
  Animation.prototype.resume = function (currentTime) {
    this.latestStart = currentTime;
  };
  Animation.prototype.update = function (currentTime) {
    var elapsed = this.previouslyElapsed + currentTime - this.latestStart;
    if (this.duration === null) {
      this.action();
      return;
    }
    if (elapsed > this.duration) {
      this.delete();
      return;
    }
    this.action(elapsed / this.duration);
  };
  Animation.prototype.delete = function () {
    this.finished = true;
    if (this.cleanup) {
      this.cleanup();
    }
  };

  function clearAnimationGroup(groupName) {
    var group = animationGroups[groupName];
    if (group === undefined) {
      return;
    }
    while (group.length != 0) {
      group.pop().delete();
    }
  }

  function processAnimations() {
    var group,
        names = Object.keys(animationGroups),
        name,
        nameIx,
        animationIx,
        animation,
        currentTime = Date.now();
    for (nameIx = names.length - 1; nameIx >= 0; --nameIx) {
      name = names[nameIx];
      group = animationGroups[name];
      for (animationIx = group.length - 1; animationIx >= 0; --animationIx) {
        animation = group[animationIx];
        if (animation.finished) {
          // Lazily delete animations by popping them off the list. This is
          // a kludge. We really need a doubly linked list so that we can
          // immediately delete any animation.
          if (animationIx == group.length - 1) {
            group.pop();
          }
          continue;
        }
        animation.update(currentTime);
      }
      if (group.length == 0) {
        delete animationGroups[name];
      }
    }
  }

  function updateLayout() {
    var actionSize, spellSize, gap, infoSize, panelSize;

    sizes.window = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Full-window canvas.
    canvases.window.width = sizes.window.width;
    canvases.window.height = sizes.window.height;

    if (sizes.window.width > sizes.window.height) {
      layout.orientation = 'landscape';
      if (sizes.window.height * 16 / 9 < sizes.window.width) {
        // Full-height frame with margins to left and right.
        sizes.frame = { height: sizes.window.height };
        sizes.frame.width = Math.floor(sizes.frame.height * 16 / 9);
        margin.frame = { top: 0, bottom: 0 };
        margin.frame.left = (sizes.window.width - sizes.frame.width) / 2;
        margin.frame.right = margin.frame.left;
      } else {
        // Full-width frame with margins above and below.
        sizes.frame = { width: sizes.window.width };
        sizes.frame.height = Math.floor(sizes.frame.width * 9 / 16);
        margin.frame = { left: 0, right: 0 };
        margin.frame.top = (sizes.window.height - sizes.frame.height) / 2;
        margin.frame.bottom = margin.frame.top;
      }
      // Divide along the frame width: 9 + 1 + 6 = 16.
      // The height is 9:16, so the action area is a square (9:9).
      // The spell area is also a square (6:6).
      actionSize = sizes.frame.height;
      spellSize = Math.floor(actionSize * 2 / 3);
      gap = sizes.frame.width - actionSize - spellSize;
      sizes.countdown = { width: gap, height: actionSize };
    } else {
      layout.orientation = 'portrait';
      if (sizes.window.height * 9 / 16 < sizes.window.width) {
        // Full-height frame with margins to left and right.
        sizes.frame = { height: sizes.window.height };
        sizes.frame.width = Math.floor(sizes.frame.height * 9 / 16);
        margin.frame = { top: 0, bottom: 0 };
        margin.frame.left = (sizes.window.width - sizes.frame.width) / 2;
        margin.frame.right = margin.frame.left;
      } else {
        // Full-width frame with margins above and below.
        sizes.frame = { width: sizes.window.width };
        sizes.frame.height = Math.floor(sizes.frame.width * 16 / 9);
        margin.frame = { left: 0, right: 0 };
        margin.frame.top = (sizes.window.height - sizes.frame.height) / 2;
        margin.frame.bottom = margin.frame.top;
      }
      // Divide along the frame height: 9 + 1 + 6 = 16.
      // The width is 9:16, so the action area is a square (9:9).
      // The spell area is also a square (6:6).
      actionSize = sizes.frame.width;
      spellSize = Math.floor(actionSize * 2 / 3);
      gap = sizes.frame.height - actionSize - spellSize;
      sizes.countdown = { width: actionSize, height: gap };
    }
    sizes.action = { width: actionSize, height: actionSize };
    sizes.touch = sizes.action;
    sizes.spell = { width: spellSize, height: spellSize };
    infoSize = actionSize - spellSize;
    sizes.info = { width: infoSize, height: infoSize };
    sizes.menu = sizes.info;

    // Containers for the frame and its three sections.
    [ 'frame', 'info', 'spell', 'countdown', 'action', 'touch'
    ].forEach(function (name) {
      if (name in containers) {
        containers[name].style.width = sizes[name].width + 'px';
        containers[name].style.height = sizes[name].height + 'px';
      }
      if (name !== 'frame') {
        canvases[name].width = sizes[name].width;
        canvases[name].height = sizes[name].height;
      }
    });
    if (layout.orientation == 'landscape') {
      containers.frame.style.left = margin.frame.left + 'px';
      containers.frame.style.top = margin.frame.top + 'px';
      containers.countdown.style.top = containers.action.style.top = '0';
      containers.info.style.top = '0';
      containers.spell.style.top = infoSize + 'px';
      if (layout.landscape.action == 'left') {
        // Action on the left, info-menu-spell panel on the right.
        containers.action.style.left = '0';
        containers.countdown.style.left = sizes.action.width + 'px';
        panelSize = sizes.action.width + sizes.countdown.width;
        containers.info.style.left = panelSize + 'px';
        containers.spell.style.left = panelSize + 'px';
      } else {
        // Menu-info-spell panel on the left, action on the right.
        containers.info.style.left = sizes.menu.width + 'px';
        containers.spell.style.left = '0';
        containers.countdown.style.left = sizes.spell.width + 'px';
        containers.action.style.left = (sizes.spell.width +
            sizes.countdown.width) + 'px';
      }
    } else {
      containers.frame.style.left = margin.frame.left + 'px';
      containers.frame.style.top = margin.frame.top + 'px';
      containers.countdown.style.left = containers.action.style.left = '0';
      containers.info.style.left = '0';
      containers.spell.style.left = infoSize + 'px';
      if (layout.portrait.action == 'top') {
        // Action on top, info-menu-spell panel on bottom.
        containers.action.style.top = '0';
        panelSize = sizes.action.height + sizes.countdown.height;
        containers.countdown.style.top = sizes.action.height + 'px';
        containers.info.style.top = panelSize + 'px';
        containers.spell.style.top = panelSize + 'px';
      } else {
        // Menu-info-spell panel on top, action on bottom.
        containers.spell.style.top = '0';
        containers.info.style.top = sizes.menu.height + 'px';
        containers.countdown.style.top = sizes.spell.height + 'px';
        containers.action.style.top = (sizes.spell.height +
            sizes.countdown.height) + 'px';
      }
    }

    sizes.touch.diameter = sizes.action.height / 5;
    sizes.touch.line = sizes.action.height / 200;
    sizes.action.radius = sizes.action.height * layout.action.radiusFactor;

    containers.info.style.fontSize =
        layout.info.fontFactor * sizes.info.height + 'px';

    offsets.action = calculateOffset(document.body, canvases.action);
    document.getElementById('debug').style.width = sizes.frame.width + 'px';
    document.getElementById('debug').style.height = sizes.frame.height + 'px';

    if (pageYOffset != 0) {
      scrollBy(0, -pageYOffset);
    }
  }

  function calculateOffset(root, child) {
    var x = 0,
        y = 0;
    while (child != root) {
      x += child.offsetLeft;
      y += child.offsetTop;
      child = child.offsetParent;
    }
    return { x: x, y: y };
  }

  function makeLayout() {
    // Full-window canvas.
    canvases.window = document.createElement('canvas');
    canvases.window.id = 'windowCanvas';
    canvases.window.className = 'unselectable';
    document.body.appendChild(canvases.window);

    // Containers for the frame and its three sections.
    containers.frame = document.createElement('div');
    containers.frame.id = 'frameContainer';
    document.body.appendChild(containers.frame);
    [ 'info', 'spell', 'countdown', 'action' ].forEach(function (name) {
      var container = containers[name] = document.createElement('div'),
          canvas = canvases[name] = document.createElement('canvas');
      container.appendChild(canvas);
      containers.frame.appendChild(container);
      container.id = name + 'Container';
      canvas.id = name + 'Canvas';
    });

    // Layers over the base action canvas.
    [ 'touch' ].forEach(function (name) {
      var canvas = canvases[name] = document.createElement('canvas');
      containers.action.appendChild(canvas);
      canvas.id = name + 'Canvas';
    });

    // Contexts for all canvases.
    Object.keys(canvases).forEach(function (name) {
      contexts[name] = canvases[name].getContext('2d');
    });
  }

  function clearContext(name) {
    contexts[name].clearRect(0, 0, sizes[name].width, sizes[name].height);
  }

  function nextCycle() {
    clearContext('window');
    clearContext('spell');
    clearContext('touch');
    clearContext('action');
    processAnimations();
    paintInfo();
    paintAction();
    paintSpell();
    requestAnimationFrame(nextCycle);
  }

  function paintInfo() {
    var numPhases = 4,
        numStages = 4,
        numTrials = 4 - current.phaseIndex,
        context = contexts.info,
        size = sizes.info.width,
        numRows = Math.ceil(Math.sqrt(numStages)),
        cellSize = size / numRows,
        paintSize = 0.95 * cellSize,
        numCols = numRows,
        i, j, r, c, left, top,
        x, y,
        doneColor = '#444',
        waitingColor = '#ccc',
        height,
        width = paintSize * Math.sqrt(3) / 2,
        strokeWidth = 2;
    // The number of stages is determined by the number of pairs that
    // the player must memorize in the current level. The novice level has
    // four pairs. Because the spell length is three, there are C(4, 3) = 4
    // possible stages.
    // In each phase of the novice level, we go through all four stages.
    // The number of trials per stage depends on the phase. In the first
    // phase, there are four trials per stage; in the second, three; in the
    // third, two; in the fourth, one.
    context.clearRect(0, 0, size, size);
    // Paint a progress bar for each stage.
    context.strokeStyle = '#fff';
    context.lineWidth = strokeWidth;
    for (i = 0; i < numStages; ++i) {
      c = i % numCols;
      r = (i - c) / numRows;
      left = r * cellSize + (cellSize - width) / 2;
      top = c * cellSize;
      for (j = 0; j < numTrials; ++j) {
        // Calculate the center of the left side of the triangle, which
        // points toward the right.
        x = left + width * j / 4;
        y = top + cellSize / 2;
        // The length of the side of the current triangle.
        height = paintSize * (1 - j / 4);
        context.beginPath();
        context.moveTo(x, y - height / 2);
        context.lineTo(left + width, y);
        context.lineTo(x, y + height / 2);
        context.closePath();
        if (i < current.stageIndex ||
            (i == current.stageIndex && j < current.trialIndex)) {
          context.fillStyle = doneColor;
        } else {
          context.fillStyle = waitingColor;
        }
        context.fill();
        context.beginPath();
        context.moveTo(x - strokeWidth / 2, y - cellSize / 2);
        context.lineTo(x - strokeWidth / 2, y + cellSize / 2);
        context.closePath();
        context.stroke();
      }
    }
  }

  function paintShape(shape, context, radius, x, y, options) {
    context.save();
    context.translate(x, y);
    context.scale(radius, radius);
    shape.paint(context, options);
    context.restore();
  }

  function paintAction() {
    var context = contexts.action,
        size = sizes.action.width,
        radius = sizes.action.radius,
        wraparound, i;
    context.lineWidth = layout.shape.lineFactor;
    current.actionShapes.forEach(function (shape, index) {
      var position = current.actionShapes[index].actionPosition,
          x = position.x * size,
          y = position.y * size;
      wraparound = [ [ x, y ],
          [ size + x, y ], [ x - size, y ], [ x, size + y ], [ x, y - size ],
          [ size + x, y - size ], [ x - size, size + y ],
          [ size + x, size + y ], [ x - size, y - size ] ];
      for (i = 0; i < wraparound.length; ++i) {
        paintShape(shape, context, radius, wraparound[i][0], wraparound[i][1]);
      }
    });
  }

  function paintSpell() {
    var shapes = current.spellShapes,
        spellLength = shapes.length,
        isFinalTrial = (current.trialIndex >= current.numTrials - 1),
        showShape,
        context = contexts.spell,
        size = sizes.spell.height,
        spanFill = layout.spell.spanFill,
        weights = current.spellWeights,
        maxWeight = layout.spell.maxWeight,
        heaviest = 1,
        weight,
        weightSum,
        totalWeight,
        shape,
        shapeX, syllableX,
        unitSpan, maxSpan,
        span,
        shapeRadius,
        fontSize,
        textWidth,
        passiveGray = Math.floor(layout.spell.passiveGray * 256),
        activeGray = Math.floor(layout.spell.activeGray * 256),
        gray,
        textColors = new Array(spellLength),
        i, bottom, y;
    totalWeight = 0;
    for (i = 0; i < spellLength; ++i) {
      weight = weights[i];
      totalWeight += weight;
      gray = Math.floor(passiveGray + (activeGray - passiveGray) *
          (weight - 1) / (maxWeight - 1));
      textColors[i] = 'rgb(' + [ gray, gray, gray ].join(', ') + ')';
    }
    unitSpan = size / totalWeight;
    shapeX = layout.spell.shapeFactorX * size;
    fontSize = layout.spell.fontFactor * size;
    syllableX = (size / 2) * (1 + layout.spell.syllableFactorX);
    contexts.spell.font = fontSize + 'px ' + layout.spell.fontFamily;
    context.lineWidth = shapeRadius
    bottom = 0;
    for (i = 0; i < spellLength; ++i) {
      shape = current.spellShapes[i];
      span = unitSpan * weights[i];
      bottom += span;
      y = bottom - span / 2;
      //showShape = (i < current.spellIndex || !shape.hidden);
      //if (showShape) {
        context.save();
        if (shape.opacity !== undefined) {
          context.globalAlpha = shape.opacity;
        }
        context.translate(shapeX, y);
        shapeRadius = spanFill * span / 2;
        context.lineWidth = layout.shape.lineFactor;
        context.scale(shapeRadius, shapeRadius);
        context.fillStyle = '#ddd';
        shape.paint(context);
        context.restore();
      //}
      textWidth = context.measureText(shape.syllable).width;
      context.fillStyle = textColors[i];
      context.fillText(shape.syllable,
          syllableX + (size - syllableX - textWidth) / 2,
          y + layout.spell.syllableFactorY * fontSize);
    }
  }

  function transitionSpellShape(growIndex, shrinkIndex) {
    var weights = current.spellWeights,
        maxWeight = layout.spell.maxWeight,
        seconds = animation.spell.grow.seconds,
        easing = animation.spell.grow.easing,
        action,
        cleanup;
    if (shrinkIndex === undefined) {
      action = function (progress) {
        weights[growIndex] = 1 + (maxWeight - 1) * easing(progress);
      };
    } else if (shrinkIndex === growIndex) {
      action = function (progress) {
        if (progress < 0.5) {
          weights[shrinkIndex] = 1 + (maxWeight - 1) *
              easing(1 - 2 * progress);
        } else {
          weights[growIndex] = 1 + (maxWeight - 1) *
              easing(2 * (progress - 0.5));
        }
      };
    } else {
      action = function (progress) {
        weights[shrinkIndex] = 1 + (maxWeight - 1) * easing(1 - progress);
        weights[growIndex] = 1 + (maxWeight - 1) * easing(progress);
      };
    }
    cleanup = function () {
      weights[shrinkIndex] = 1;
      weights[growIndex] = maxWeight;
    };
    //clearAnimationGroup('spell');
    (new Animation('spell', action, cleanup, seconds)).launch();
  }

  function shuffle(things) {
    var i, j, temp;
    for (i = 1; i < things.length; ++i) {
      j = Math.floor(Math.random() * (i + 1));
      temp = things[j];
      things[j] = things[i];
      things[i] = temp;
    }
  }

  function choose(list, num) {
    var result = new Array(num),
        i,
        indices = list.map(function (element, index) {
      return index;
    });
    shuffle(indices);
    for (i = 0; i < num; ++i) {
      result[i] = list[indices[i]];
    }
    return result;
  }

  function startLevel() {
    var numPairs = level.numPairs = 4,
        levelShapeNames = choose(shapeNames, numPairs),
        levelColors = choose(colors.shapePalette, numPairs),
        i, j, temp, name, color;
    // Randomly assign syllables to shapes.
    shuffle(shapes);
    shuffle(syllables);
    shapes.forEach(function (shape, index) {
      shape.syllable = syllables[index];
    });
    // Choose four shapes to play with. Make colors and outlines unique.
    for (i = 0; i < numPairs; ++i) {
      name = levelShapeNames[i];
      color = levelColors[i];
      for (j = i; j < shapes.length; ++j) {
        if (shapes[j].name == name && shapes[j].color == color) {
          break;
        }
      }
      temp = shapes[i];
      shapes[i] = shapes[j];
      shapes[j] = temp;
    }
    level.shapes = shapes.slice(0, numPairs);
    level.shapesOutsideLevel = shapes.slice(numPairs);
    status.inLevel = true;
    current.phaseIndex = 0;
    startPhase();
    nextCycle();
  }
  
  function finishLevel() {
    status.inLevel = false;
  }

  function startPhase() {
    current.stageIndex = 0;
    startStage();
  }

  function finishPhase() {
  }

  function startStage() {
    var stageIndex = current.stageIndex,
        spellLength = 3,
        spellShapes = current.spellShapes = [],
        hiddenShapes,
        decoyShapes,
        candidate,
        found,
        i, j, k;

    // Omit one shape from the spell.
    for (i = 0; i < level.numPairs; ++i) {
      if (i != stageIndex) {
        spellShapes.push(level.shapes[i]);
      }
    }
    shuffle(spellShapes);

    // Select decoy shapes to be used in the action area.
    // Take some decoys among the level shapes.
    decoyShapes = new Array(3 * spellLength);
    k = 0;
    for (i = 0; i < spellLength && spellLength + i < level.numPairs; ++i) {
      candidate = level.shapes[spellLength + i];
      found = false;
      for (j = 0; j < spellLength; ++j) {
        if (spellShapes[j] == candidate) {
          found = true;
          break;
        }
      }
      if (found) {
        continue;
      }
      decoyShapes[k++] = candidate;
    }
    // Take the rest outside the level shapes.
    i = 0;
    while (k < decoyShapes.length) {
      decoyShapes[k++] = level.shapesOutsideLevel[i++];
    }

    // Action shapes: a shuffled array of spell shapes and decoy shapes.
    current.actionShapes = spellShapes.concat(decoyShapes);

    // Hide a certain number of shapes according to the phase index.
    current.numHidden = current.phaseIndex;
    current.hiddenShapes = choose(spellShapes, current.numHidden);
    current.hiddenShapes.forEach(function (shape) {
      hideShape(shape);
    });

    current.spellWeights = current.spellShapes.map(function (shape, i) {
      return 1;
    });
    transitionSpellShape(0);
    current.trialIndex = 0;
    startTrial();
  }

  function finishStage() {
    current.spellShapes.forEach(function (shape) {
      restoreShape(shape);
    });
    current.stageIndex += 1;
    current.trialIndex = 0;
    if (current.stageIndex == level.numPairs) {
      finishLevel();
      return;
    }
    setTimeout(startStage, 3000);
  }

  function startTrial() {
    current.spellIndex = 0;
    status.inTrial = true;
    animateShapes();
  }

  function animateShapes() {
    shuffle(current.actionShapes);
    clearAnimationGroup('action');
    current.actionShapes.forEach(function (shape) {
      var angle = Math.random() * 2 * Math.PI,
          step = 0.001,
          dx = Math.cos(angle) * step,
          dy = Math.sin(angle) * step;
      shape.actionPosition = {
        x: Math.random(),
        y: Math.random()
      };
      (new Animation('action', function (progress) {
        var x = shape.actionPosition.x,
            y = shape.actionPosition.y;
        x += dx;
        while (x < 0) {
          x += 1;
        }
        while (x >= 1) {
          x -= 1;
        }
        y += dy;
        while (y < 0) {
          y += 1;
        }
        while (y >= 1) {
          y -= 1;
        }
        shape.actionPosition.x = x;
        shape.actionPosition.y = y;
      }, null)).launch();
    });
  }

  function finishTrial() {
    var indices = [],
        canvas = canvases.action,
        i, shape;
    status.inTrial = false;
    function startNext() {
      canvas.style.opacity = 1;
      current.numHidden += 1;
      if (current.numHidden > current.spellShapes.length) {
        finishStage();
        return;
      }
      current.spellShapes.forEach(function (shape, index) {
        if (!shape.hidden) {
          indices.push(index);
        }
      });
      shape = current.spellShapes[indices[Math.floor(
          Math.random() * indices.length)]];
      current.hiddenShapes.push(shape);
      hideShape(shape);
      transitionSpellShape(0, current.spellShapes.length - 1);
      startTrial();
      console.log(JSON.stringify(status));
    }
    (new Animation('action', function (progress) {
      canvas.style.opacity = 1 - progress;
    }, startNext, 1)).launch();
  }

  function hideShape(shape) {
    shape.hidden = true;
    (new Animation('spell', function (progress) {
      shape.opacity = 1 - progress;
    }, function () {
      shape.opacity = 0;
    }, animation.spell.vanish.seconds)).launch();
  }

  function restoreShape(shape) {
    shape.hidden = false;
    (new Animation('spell', function (progress) {
      shape.opacity = progress;
    }, function () {
      shape.opacity = 1;
    }, animation.spell.reveal.seconds)).launch();
  }

  function hitShape() {
    var shape = current.spellShapes[current.spellIndex],
        syllable = shape.syllable,
        offset = offsets.action,
        actionPosition = shape.actionPosition,
        x0 = offset.x + sizes.action.width * actionPosition.x,
        y0 = offset.y + sizes.action.height * actionPosition.y,
        tx, ty, radius, options, width, height,
        syllableContext = contexts.window,
        shapeContext = contexts.touch,
        shapeCanvas = canvases.touch,
        strokeColor = colors.action.stroke.highlight;
    current.spellIndex += 1;
    if (current.spellIndex == current.spellShapes.length) {
      finishTrial();
    } else {
      transitionSpellShape(current.spellIndex, current.spellIndex - 1);
    }
    (new Animation('hit', function (progress) {
      var x = x0 + (sizes.window.width / 2 - x0) * progress,
          y = y0 + (sizes.window.height / 2 - y0) * progress,
          fontSize = sizes.action.width / 4 * 5 * progress,
          width, height;
      // Flash the word.
      syllableContext.fillStyle = shape.color;
      syllableContext.font = fontSize + 'px ' + layout.spell.fontFamily;
      height = fontSize * 0.5;
      width = syllableContext.measureText(syllable).width;
      syllableContext.save();
      syllableContext.globalAlpha = 1 - Math.max(0, 2 * (progress - 0.5));
      syllableContext.fillText(syllable, x - width / 2, y + height / 2);
      syllableContext.restore();
      // Highlight the shape.
      tx = actionPosition.x * shapeCanvas.width;
      ty = actionPosition.y * shapeCanvas.height;
      radius = sizes.action.radius;
      options = { stroke: strokeColor };
      shapeContext.save();
      shapeContext.globalAlpha = Math.min(1, 2 * (1 - progress));
      shapeContext.lineWidth = layout.shape.lineFactor;
      paintShape(shape, shapeContext, radius, tx, ty, options);
      width = sizes.action.width;
      height = sizes.action.height;
      if (tx <= radius) {
        paintShape(shape, shapeContext, radius, width + tx, ty, options);
      }
      if (width - tx <= radius) {
        paintShape(shape, shapeContext, radius, tx - width, ty, options);
      }
      if (ty <= radius) {
        paintShape(shape, shapeContext, radius, tx, height + ty, options);
      }
      if (height - ty <= radius) {
        paintShape(shape, shapeContext, radius, tx, ty - height, options);
      }
      shapeContext.restore();
    }, null, animation.hit.seconds)).launch();
  }

  function missShape() {
    var restoredShape;
    transitionSpellShape(0, current.spellIndex);
    if (current.numHidden > 0) {
      current.numHidden -= 1;
      current.trialIndex -= 1;
      restoredShape = current.hiddenShapes.pop();
      restoreShape(restoredShape);
    }
    startTrial();
  }

  function animateTouch(x, y, isHit) {
    var canvas = canvases.touch,
        size = sizes.action.width,
        context = contexts.touch,
        color = colors.touch,
        radius = sizes.touch.diameter / 2;
    (new Animation('touch', function (progress) {
      progress = animation.touch.easing(progress);
      if (progress < 0.5) {
        // Instant disc.
        context.save();
        context.globalAlpha = color.fillOpacity;
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI);
        context.fillStyle = color.instant;
        context.fill();
        if (false) {
          context.lineWidth = layout.shape.lineFactor * radius;
          context.strokeStyle = color.fill;
          context.stroke();
        }
        context.closePath();
        // Gradual fill.
        context.beginPath();
        context.arc(x, y, Math.sqrt(2 * progress) * radius,
            0, 2 * Math.PI);
        context.fillStyle = color.fill;
        context.fill();
        context.closePath();
        context.restore();
      } else if (isHit) {
        // Fade out the filled disc.
        context.save();
        context.globalAlpha = 2 * (1 - progress) * color.fillOpacity;
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI);
        context.fillStyle = color.fill;
        context.fill();
        context.closePath();
        context.restore();
      } else {
        // Shrink the filled disc.
        context.save();
        context.globalAlpha = color.fillOpacity;
        context.beginPath();
        context.arc(x, y, Math.sqrt(2 * (1 - progress)) * radius,
            0, 2 * Math.PI);
        context.fillStyle = color.fill;
        context.fill();
        context.closePath();
        context.restore();
      }
    }, null, animation.touch.seconds)).launch();
  }

  function handleTouch(x, y) {
    var offset = offsets.action,
        context = contexts.touch,
        canvas = canvases.touch,
        size = sizes.action.width,
        targetShape,
        tx, ty,
        wraparound,
        X, Y, i, dd, ddTarget, isHit;
    if (!status.inTrial) {
      return;
    }

    // Ignore touches outside the action area.
    x -= offset.x;
    y -= offset.y;
    if (x < 0 || x > size || y < 0 || y > size) {
      return;
    }

    targetShape = current.spellShapes[current.spellIndex];
    tx = targetShape.actionPosition.x * size;
    ty = targetShape.actionPosition.y * size;

    wraparound = [ [ x, y ],
        [ size + x, y ], [ x - size, y ], [ x, size + y ], [ x, y - size ],
        [ size + x, y - size ], [ x - size, size + y ],
        [ size + x, size + y ], [ x - size, y - size ] ];
    isHit = false;
    ddTarget = Math.pow(sizes.action.radius + sizes.touch.diameter / 2, 2);
    for (i = 0; i < wraparound.length; ++i) {
      X = wraparound[i][0];
      Y = wraparound[i][1];
      dd = Math.pow(X - tx, 2) + Math.pow(Y - ty, 2);
      if (dd <= ddTarget) {
        isHit = true;
        break;
      }
    }

    clearAnimationGroup('touch');
    for (i = 0; i < wraparound.length; ++i) {
      animateTouch(wraparound[i][0], wraparound[i][1], isHit);
    }
    if (isHit) {
      hitShape();
    } else {
      missShape();
    }
  }

  function debugMessage() {
    var parts = new Array(arguments.length),
        i;
    for (i = 0; i < arguments.length; ++i) {
      parts[i] = arguments[i];
    }
    document.getElementById('debug').innerHTML += parts.join(' ') + '<br>';
  }

  function configureTouch() {
    document.body.ontouchstart = function (event) {
      event.preventDefault();
      event.stopPropagation();
      var touch;
      if (event.targetTouches.length > 1) {
        return;
      }
      touch = event.targetTouches[0];
      handleTouch(touch.pageX, touch.pageY);
    };
    document.body.onmousedown = function (event) {
      handleTouch(event.pageX, event.pageY);
    };
  }

  function resize() {
    updateLayout();
  }

  function load() {
    makeShapes();
    makeLayout();
    updateLayout();
    configureTouch();
    window.onresize = resize;
    startLevel();
  }

  return {
    load: load,
    resize: resize,
    addShapePainter: addShapePainter,
    setSyllables: setSyllables
  };
})(); // end Zorpodnix
window.onload = Zorpodnix.load;
