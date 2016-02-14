var Zorpodnix = (function () {
  'use strict';

  var levelSpecs = [
        {
          name: 'novice',
          numPairs: 4,
          stages: [
            { show: [ 0, 1, 2 ] },
            { show: [ 1, 2 ], test: [ 0 ] },
            { show: [ 0, 3 ], test: [ 1 ] },
            { show: [ 3 ], test: [ 1, 2 ] },
            { test: [ 0, 1, 3 ] },
            { test: [ 0, 2, 3 ] },
            { test: [ 1, 2, 3 ] },
            { test: [ 0, 1, 2 ] }
          ]
        }
      ],
      levelIndex,
      level = {},
      current = {},
      shapePalettes = [
        [ '#e0de99', '#e08739', '#b23331', '#4f68a7', '#6ca76f' ]
      ],
      colors = {
        shapePalette: shapePalettes[0]
      },
      shapePainters = [],
      shapeNames = [],
      shapes = [],
      syllables,
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
          highlightWeight: 1.5,
          syllableFactorY: 0.36,
          syllableFactorX: -0.075,
          fontFactor: 0.19,
          passiveGray: 0.6,
          activeGray: 0.1,
          fontFamily: "'Bitter', sans-serif"
        },
        action: {
          touchSpanFactor: 0.5
        }
      },
      sizes = {},
      margin = {},
      containers = {},
      offsets = {},
      canvases = {},
      contexts = {},
      status = {};

  function addShapePainter(name, painter) {
    shapePainters.push(painter);
    shapeNames.push(name);
  }

  function setSyllables(someSyllables) {
    syllables = someSyllables;
  }

  function Shape(name, painter, fillColor) {
    this.name = name;
    this.painter = painter;
    this.fillColor = fillColor;
  }
  Shape.prototype.paint = function (context) {
    context.save();
    context.fillStyle = this.fillColor;
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

    containers.info.style.fontSize =
        layout.info.fontFactor * sizes.info.height + 'px';

    offsets.touch = calculateOffset(document.body, canvases.action);
    document.getElementById('debug').style.width = sizes.frame.width + 'px';
    document.getElementById('debug').style.height = sizes.frame.height + 'px';
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

  function paintFrame() {
    var context,
        size,
        weights = {};
    if (!('spell' in sizes)) {
      return;
    }

    // Info.
    containers.info.innerHTML = [
      level.name,
      'stage ' + (current.stageIndex + 1) + ' / ' + level.stages.length,
      'trial ' + (current.trialIndex + 1) + ' / ' + current.numTrials,
    ].join('<br>');

    // Spell.
    weights[current.spellIndex] = 1;
    paintSpell(current.spellShapes, current.spellSyllables, weights,
        current.hideSyllables);

    // Erase action.
    context = contexts.action;
    size = sizes.action.width;
    context.clearRect(0, 0, size, size);

    // Paint action.
    sizes.actionUnit = 0.95 * size / current.numCols / 2;
    current.actionShapes.forEach(function (shape, index) {
      var position = current.actionShapes[index].actionPosition,
          x = position.x,
          y = position.y;
      context.save();
      context.translate(x * size, y * size);
      context.scale(sizes.actionUnit, sizes.actionUnit);
      shape.paint(context);
      context.restore();
    });

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

  function paintSpell(shapes, syllables, highlightWeights, hideSyllables) {
    var spellLength = shapes.length,
        context = contexts.spell,
        size = sizes.spell.height,
        spanFill = layout.spell.spanFill,
        highlightWeight = layout.spell.highlightWeight,
        weights = new Array(spellLength),
        weight,
        shapeX,
        syllableX,
        totalWeight,
        normalSpan,
        highlightSpan,
        span,
        fontSize,
        textWidth,
        passiveGray = Math.floor(layout.spell.passiveGray * 256),
        activeGray = Math.floor(layout.spell.activeGray * 256),
        gray,
        normalTextColor =
            'rgb(' + [ passiveGray, passiveGray, passiveGray ].join(', ') + ')',
        textColors = new Array(spellLength),
        i, x, y;
    for (i = 0; i < spellLength; ++i) {
      weights[i] = 1;
      textColors[i] = normalTextColor;
    }
    totalWeight = spellLength;
    if (highlightWeights) {
      Object.keys(highlightWeights).forEach(function (index) {
        weight = highlightWeights[index] * highlightWeight;
        weights[index] = weight;
        totalWeight += weight - 1;
        gray = Math.floor(passiveGray - weight * (passiveGray - activeGray));
        textColors[index] = 'rgb(' + [ gray, gray, gray ].join(', ') + ')';
      });
    }
    normalSpan = size / totalWeight;
    highlightSpan = highlightWeight * normalSpan;
    sizes.spellShapeSpan = spanFill * highlightSpan;
    sizes.touchSpan = layout.action.touchSpanFactor * sizes.spellShapeSpan;
    shapeX = Math.max(highlightSpan / 2,
        (size - spanFill * highlightSpan) / 2);
    fontSize = layout.spell.fontFactor * size;
    syllableX = (size / 2) * (1 + layout.spell.syllableFactorX);
    contexts.spell.font = fontSize + 'px ' + layout.spell.fontFamily;
    context.clearRect(0, 0, size, size);
    y = 0;
    for (i = 0; i < spellLength; ++i) {
      span = normalSpan * weights[i];
      y += span;
      context.save();
      context.translate(shapeX, y - span / 2);
      context.scale(spanFill * span / 2, spanFill * span / 2);
      shapes[i].paint(context);
      context.restore();
      if (hideSyllables && i >= current.spellIndex) {
        continue;
      }
      textWidth = context.measureText(syllables[i]).width;
      context.fillStyle = textColors[i];
      context.fillText(syllables[i],
          syllableX + (size - syllableX - textWidth) / 2,
          y - span / 2 + layout.spell.syllableFactorY * fontSize);
    }
  }

  function startStage(stageIndex) {
    var stage,
        spellLength,
        spellIndices = [],
        shown = {},
        i, j,
        numCols;

    // Read the indices of the syllables that compose the spell.
    current.stage = stage = level.stages[stageIndex];
    if (stage.show) {
      stage.show.forEach(function (index) {
        spellIndices.push(index);
        shown[index] = true;
      });
      // Shown syllables are only hidden in the last trial.
      current.numTrials = 3;
    } else {
      // If no syllables are shown, only have one trial.
      current.numTrials = 1;
    }

    if (stage.test) {
      stage.test.forEach(function (index) {
        spellIndices.push(index);
      });
    }
    current.spellLength = spellLength = spellIndices.length;
    shuffle(spellIndices);

    // Get the corresponding shapes.
    current.spellShapes = new Array(spellLength);
    current.spellSyllables = new Array(spellLength);
    for (i = 0; i < spellLength; ++i) {
      current.spellShapes[i] = level.shapes[spellIndices[i]];
      current.spellSyllables[i] = level.syllables[spellIndices[i]];
    }

    // Select decoy shapes to be used in the action area.
    // Take some decoys among the level shapes.
    current.decoyShapes = new Array(3 * spellLength);
    for (i = 0; i < spellLength && spellLength + i < level.numPairs; ++i) {
      current.decoyShapes[i] = level.shapes[spellLength + i];
    }
    // Take the rest outside the level shapes.
    j = 0;
    while (i < current.decoyShapes.length) {
      current.decoyShapes[i++] = level.shapesOutsideLevel[j++];
    }

    // Action shapes: a shuffled array of spell shapes and decoy shapes.
    current.actionShapes = current.spellShapes.concat(current.decoyShapes);
    shuffle(current.actionShapes);
    numCols = Math.ceil(Math.sqrt(current.actionShapes.length));
    current.numCols = numCols;
    current.actionShapes.forEach(function (shape, index) {
      var c = index % numCols, r  = (index - c) / numCols;
      shape.actionPosition = {
        x: (c + 0.5) / numCols,
        y: (r + 0.5) / numCols
      };
    });

    console.log('started stage ' + current.stageIndex);
    current.trialIndex = 0;
    startTrial();
    status.inStage = true;
  }

  function startTrial() {
    current.spellIndex = 0;
    current.hideSyllables = (current.trialIndex == current.numTrials - 1);
    paintFrame();
    console.log('started trial ' + current.trialIndex);
  }

  function finishTrial() {
    console.log('finished trial ' + current.trialIndex);
    current.trialIndex += 1;
    if (current.trialIndex == current.numTrials) {
      finishStage();
    } else {
      startTrial();
    }
  }

  function finishStage(success) {
    console.log('finished trial ' + current.stageIndex);
    paintFrame();
    status.inStage = false;
  }

  function startLevel(levelIndex) {
    var levelSpec,
        i;
    levelSpec = levelSpecs[levelIndex];
    [ 'name', 'numPairs', 'stages' ].forEach(function (property) {
      level[property] = levelSpec[property];
    });
    shuffle(shapes);
    shuffle(syllables);
    level.shapes = shapes.slice(0, level.numPairs);
    level.syllables = syllables.slice(0, level.numPairs);
    level.shapesOutsideLevel = shapes.slice(level.numPairs);
    status.inLevel = true;
    current.stageIndex = 0;
    startStage(current.stageIndex);
  }
  
  function finishLevel(success) {
    status.inLevel = false;
  }

  function debugMessage() {
    var parts = new Array(arguments.length),
        i;
    for (i = 0; i < arguments.length; ++i) {
      parts[i] = arguments[i];
    }
    document.getElementById('debug').innerHTML += parts.join(' ') + '<br>';
  }

  function hitShape() {
    console.log('hit');
    current.spellIndex += 1;
    if (current.spellIndex == current.spellLength) {
      finishTrial();
    } else {
      paintFrame();
    }
  }

  function missShape() {
    console.log('miss');
    startTrial();
  }

  function handleTouch(x, y) {
    var offset = offsets.touch,
        context = contexts.touch,
        canvas = canvases.touch,
        width = canvas.width, height = canvas.height,
        targetShape,
        tx, ty, dd;
    if (!status.inStage) {
      return;
    }

    // Ignore touches outside the action area.
    x -= offset.x;
    y -= offset.y;
    if (x < 0 || x > width || y < 0 || y > height) {
      return;
    }

    // Display the touch span area.
    context.clearRect(0, 0, width, height);
    context.beginPath();
    context.arc(x, y, sizes.touchSpan / 2, 0, 2 * Math.PI);
    context.closePath();
    context.fillStyle = '#000';
    context.fill();

    // Check whether the target shape is within touch span.
    targetShape = current.spellShapes[current.spellIndex];
    tx = targetShape.actionPosition.x * width;
    ty = targetShape.actionPosition.y * height;
    dd = Math.pow(x - tx, 2) + Math.pow(y - ty, 2);
    if (dd <= Math.pow(sizes.actionUnit + sizes.touchSpan / 2, 2)) {
      hitShape();
      // Graphical effects to illustrate a hit.
      context.beginPath();
      context.arc(tx, ty, sizes.actionUnit, 0, 2 * Math.PI);
      context.closePath();
      context.fill();
    } else {
      missShape();
      // Graphical effects to illustrate a miss.
      context.beginPath();
      context.arc(tx, ty, sizes.actionUnit - 2, 0, 2 * Math.PI);
      context.closePath();
      context.lineWidth = 4;
      context.strokeStyle = '#b00';
      context.stroke();
    }
  }

  function configureTouch() {
    document.body.ontouchstart = function (event) {
      var touch;
      if (event.targetTouches.length > 1) {
        return;
      }
      touch = event.targetTouches[0];
      handleTouch(touch.pageX, touch.pageY);
      event.stopPropagation();
    };
    document.body.onmousedown = function (event) {
      handleTouch(event.pageX, event.pageY);
    };
  }

  function resize() {
    updateLayout();
    paintFrame();
  }

  function load() {
    makeShapes();
    makeLayout();
    configureTouch();
    window.onresize = resize;
    setTimeout(resize, 200);
    levelIndex = 0;
    startLevel(levelIndex);
  }

  return {
    load: load,
    resize: resize,
    addShapePainter: addShapePainter,
    setSyllables: setSyllables
  };
})(); // end Zorpodnix
window.onload = Zorpodnix.load;
