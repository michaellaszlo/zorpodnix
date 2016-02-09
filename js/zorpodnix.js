var Zorpodnix = (function () {
  'use strict';

  var levelSpecs = [
        {
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
      countdown = {
        total: 20
      },
      level = {},
      stage = {},
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
      spellLength,
      layout = {
        landscape: {
          action: 'right'
        },
        portrait: {
          action: 'bottom'
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
        }
      },
      sizes = {
      },
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
    var actionSize, spellSize, gap, infoSize;

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
      infoSize = actionSize - spellSize;
      sizes.action = { width: actionSize, height: actionSize };
      sizes.countdown = { width: gap, height: actionSize };
      sizes.spell = { width: spellSize, height: spellSize };
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
      infoSize = actionSize - spellSize;
      sizes.action = { width: actionSize, height: actionSize };
      sizes.countdown = { width: actionSize, height: gap };
      sizes.spell = { width: spellSize, height: spellSize };
    }
    sizes.touch = sizes.action;

    // Containers for the frame and its three sections.
    [ 'frame', 'action', 'touch', 'countdown', 'spell'
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
      containers.spell.style.top = infoSize + 'px';
      if (layout.landscape.action == 'left') {
        containers.action.style.left = '0';
        containers.countdown.style.left = sizes.action.width + 'px';
        containers.spell.style.left = (sizes.action.width +
            sizes.countdown.width) + 'px';
      } else {
        containers.spell.style.left = '0';
        containers.countdown.style.left = sizes.spell.width + 'px';
        containers.action.style.left = (sizes.spell.width +
            sizes.countdown.width) + 'px';
      }
    } else {
      containers.frame.style.left = margin.frame.left + 'px';
      containers.frame.style.top = margin.frame.top + 'px';
      containers.countdown.style.left = containers.action.style.left = '0';
      containers.spell.style.left = infoSize + 'px';
      if (layout.portrait.action == 'top') {
        containers.action.style.top = '0';
        containers.countdown.style.top = sizes.action.height + 'px';
        containers.spell.style.top = (sizes.action.height +
            sizes.countdown.height) + 'px';
      } else {
        containers.spell.style.top = '0';
        containers.countdown.style.top = sizes.spell.height + 'px';
        containers.action.style.top = (sizes.spell.height +
            sizes.countdown.height) + 'px';
      }
    }

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
    [ 'spell', 'countdown', 'action' ].forEach(function (name) {
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
        scale,
        weights = {};
    if (!status.inStage) {
      return;
    }

    // Spell.
    weights[stage.syllablePosition] = 1;
    paintSpell(stage.spellShapes, stage.spellSyllables, weights);

    // Action.
    context = contexts.action;
    size = sizes.action.width;
    scale = size / stage.numCols / 2;
    stage.actionShapes.forEach(function (shape, index) {
      var position = stage.actionPositions[index],
          x = position.x,
          y = position.y;
      context.save();
      context.translate(x * size, y * size);
      context.scale(0.95 * scale, 0.95 * scale);
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

  function paintSpell(shapes, syllables, highlighted) {
    var numPairs = shapes.length,
        context = contexts.spell,
        size = sizes.spell.height,
        spanFill = layout.spell.spanFill,
        highlightWeight = layout.spell.highlightWeight,
        weights = new Array(numPairs),
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
        textColors = new Array(numPairs),
        i, x, y;
    for (i = 0; i < numPairs; ++i) {
      weights[i] = 1;
      textColors[i] = normalTextColor;
    }
    totalWeight = numPairs;
    if (highlighted) {
      Object.keys(highlighted).forEach(function (index) {
        weight = highlighted[index] * highlightWeight;
        weights[index] = weight;
        totalWeight += weight - 1;
        gray = Math.floor(passiveGray - weight * (passiveGray - activeGray));
        textColors[index] = 'rgb(' + [ gray, gray, gray ].join(', ') + ')';
      });
    }
    normalSpan = size / totalWeight;
    highlightSpan = highlightWeight * normalSpan;
    sizes.spellShapeSpan = spanFill * highlightSpan;
    shapeX = Math.max(highlightSpan / 2,
        (size - spanFill * highlightSpan) / 2);
    fontSize = layout.spell.fontFactor * size;
    syllableX = (size / 2) * (1 + layout.spell.syllableFactorX);
    contexts.spell.font = fontSize + 'px ' + layout.spell.fontFamily;
    context.clearRect(0, 0, size, size);
    y = 0;
    for (i = 0; i < numPairs; ++i) {
      span = normalSpan * weights[i];
      y += span;
      context.save();
      context.translate(shapeX, y - span / 2);
      context.scale(spanFill * span / 2, spanFill * span / 2);
      shapes[i].paint(context);
      context.restore();
      textWidth = context.measureText(syllables[i]).width;
      context.fillStyle = textColors[i];
      context.fillText(syllables[i],
          syllableX + (size - syllableX - textWidth) / 2,
          y - span / 2 + layout.spell.syllableFactorY * fontSize);
    }
  }

  function startStage(stageIndex) {
    var spellSize,
        spellIndices = [],
        shown = {},
        i, j,
        numCols;

    // Read the indices of the syllables that compose the spell.
    stage = level.stages[stageIndex];
    if (stage.show) {
      stage.show.forEach(function (index) {
        spellIndices.push(index);
        shown[index] = true;
      });
    }
    if (stage.test) {
      stage.test.forEach(function (index) {
        spellIndices.push(index);
      });
    }
    spellSize = spellIndices.length;
    shuffle(spellIndices);

    // Get the corresponding shapes.
    stage.spellShapes = new Array(spellSize);
    stage.spellSyllables = new Array(spellSize);
    for (i = 0; i < spellSize; ++i) {
      stage.spellShapes[i] = level.shapes[spellIndices[i]];
      stage.spellSyllables[i] = level.syllables[spellIndices[i]];
    }

    // Select decoy shapes to be used in the action area.
    // Take some decoys among the level shapes.
    stage.decoyShapes = new Array(3 * spellSize);
    for (i = 0; i < spellSize && spellSize + i < level.numPairs; ++i) {
      stage.decoyShapes[i] = level.shapes[spellSize + i];
    }
    // Take the rest outside the level shapes.
    j = 0;
    while (i < stage.decoyShapes.length) {
      stage.decoyShapes[i++] = level.shapesOutsideLevel[j++];
    }

    // Action shapes: a shuffled array of spell shapes and decoy shapes.
    stage.actionShapes = stage.spellShapes.concat(stage.decoyShapes);
    shuffle(stage.actionShapes);
    numCols = Math.ceil(Math.sqrt(stage.actionShapes.length));
    stage.numCols = numCols;
    stage.actionPositions = stage.actionShapes.map(function (shape, index) {
      var c = index % numCols, r  = (index - c) / numCols;
      return { x: (c + 0.5) / numCols, y: (r + 0.5) / numCols };
    });

    stage.syllablePosition = 0;
    status.inStage = true;
  }

  function finishStage(success) {
    status.inStage = false;
  }

  function startLevel(levelIndex) {
    var levelSpec,
        i;
    levelSpec = levelSpecs[levelIndex];
    level.numPairs = levelSpec.numPairs;
    level.stages = levelSpec.stages;
    shuffle(shapes);
    shuffle(syllables);
    level.shapes = shapes.slice(0, level.numPairs);
    level.syllables = syllables.slice(0, level.numPairs);
    level.shapesOutsideLevel = shapes.slice(level.numPairs);
    status.inLevel = true;
    startStage(0);
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

  function handleTap(x, y) {
    var offset = offsets.touch,
        context = contexts.touch,
        canvas = canvases.touch,
        width = canvas.width, height = canvas.height;
    x -= offset.x;
    y -= offset.y;
    if (x < 0 || x > width || y < 0 || y > height) {
      return;
    }
    context.clearRect(0, 0, width, height);
    context.beginPath();
    context.arc(x, y, sizes.spellShapeSpan / 4, 0, 2 * Math.PI);
    context.closePath();
    context.fill();
  }

  function configureTap() {
    document.body.ontouchstart = function (event) {
      var touch;
      if (event.targetTouches.length > 1) {
        return;
      }
      touch = event.targetTouches[0];
      handleTap(touch.pageX, touch.pageY);
    };
    document.body.onmousedown = function (event) {
      handleTap(event.pageX, event.pageY);
    };
  }

  function resize() {
    updateLayout();
    paintFrame();
  }

  function load() {
    makeShapes();
    makeLayout();
    configureTap();
    window.onresize = resize;
    setTimeout(resize, 200);
    startLevel(0);
  }

  return {
    load: load,
    resize: resize,
    addShapePainter: addShapePainter,
    setSyllables: setSyllables
  };
})(); // end Zorpodnix
window.onload = Zorpodnix.load;
