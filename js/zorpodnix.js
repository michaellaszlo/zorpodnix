var Zorpodnix = (function () {
  'use strict';

  var levelSpecs = [
        {
          numPairs: 8,
          stageMaker: function (stageIndex) {
            var stage = {};
            stage.numPairs = Math.min(stageIndex + 3, 6);
            return stage;
          }
        }
      ],
      level = {},
      stage = {},
      shapePalettes = [
        [ '#e0de99', '#e08739', '#b23331', '#4f68a7', '#6ca76f' ]
      ],
      colors = {
        shapePalette: shapePalettes[0]
      },
      shapePainters = [],
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
          syllableFactorY: 1 / 4,
          syllableFactorX: 4 / 5,
          fontFactor: 1 / 8,
          passiveGray: 0.5,
          activeGray: 0.1,
          fontFamily: "'Bubblegum Sans', sans-serif"
        }
      },
      sizes = {
      },
      margin = {},
      containers = {},
      canvases = {},
      contexts = {},
      status = {};

  function addShapePainter(shape) {
    shapePainters.push(shape);
  }

  function setSyllables(someSyllables) {
    syllables = someSyllables;
  }

  function Shape(shapePainter, fillColor) {
    this.shapePainter = shapePainter;
    this.fillColor = fillColor;
  }
  Shape.prototype.paint = function (context) {
    context.save();
    context.fillStyle = this.fillColor;
    this.shapePainter(context);
    context.restore();
  };

  function makeShapes() {
    shapePainters.forEach(function (shapePainter) {
      colors.shapePalette.forEach(function (shapeColor) {
        shapes.push(new Shape(shapePainter, shapeColor));
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

    // Containers for the frame and its three sections.
    [ 'frame', 'action', 'countdown', 'spell' ].forEach(function (name) {
      containers[name].style.width = sizes[name].width + 'px';
      containers[name].style.height = sizes[name].height + 'px';
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

    paintFrame();
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
    [ 'action', 'countdown', 'spell' ].forEach(function (name) {
      var container = containers[name] = document.createElement('div'),
          canvas = canvases[name] = document.createElement('canvas');
      container.appendChild(canvas);
      containers.frame.appendChild(container);
      container.id = name + 'Container';
      canvas.id = name + 'Canvas';
    });

    // Contexts for all canvases.
    Object.keys(canvases).forEach(function (name) {
      contexts[name] = canvases[name].getContext('2d');
    });
  }

  function paintFrame() {
    var weights = {};
    weights[stage.syllableIndex] = 1;
    if (stage.shapes) {
      paintSpell(stage.shapes, stage.syllables, weights);
    }
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
    shapeX = Math.max(highlightSpan / 2,
        (size - spanFill * highlightSpan) / 2);
    fontSize = layout.spell.fontFactor * size;
    syllableX = shapeX + highlightSpan / 2 +
        layout.spell.syllableFactorX * fontSize;
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
          syllableX - textWidth / 2,
          y - span / 2 + layout.spell.syllableFactorY * fontSize);
    }
  }

  function startStage(stageIndex) {
    var i;
    status.inStage = true;
    stage = level.stageMaker(stageIndex);
    stage.shapes = level.shapes.slice(0, stage.numPairs);
    stage.syllables = level.syllables.slice(0, stage.numPairs);
    stage.syllableIndex = Math.floor(Math.random() * stage.numPairs);
  }

  function finishStage(success) {
    status.inStage = false;
  }

  function startLevel(levelIndex) {
    var levelSpec,
        i;
    levelSpec = levelSpecs[levelIndex];
    level.numPairs = levelSpec.numPairs;
    level.stageMaker = levelSpec.stageMaker;
    shuffle(shapes);
    shuffle(syllables);
    level.shapes = shapes.slice(0, level.numPairs);
    level.syllables = syllables.slice(0, level.numPairs);
    status.inLevel = true;
    startStage(0);
  }
  
  function finishLevel(success) {
    status.inLevel = false;
  }

  function load() {
    makeShapes();
    makeLayout();
    window.onresize = function () {
      updateLayout();
    };
    window.onresize();
    startLevel(0);
    paintFrame();
    setTimeout(paintFrame, 300);
  }

  return {
    load: load,
    updateLayout: updateLayout,
    addShapePainter: addShapePainter,
    setSyllables: setSyllables
  };
})(); // end Zorpodnix
window.onload = Zorpodnix.load;
