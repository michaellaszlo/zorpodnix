
var Zorpodnix = (function () {
  'use strict';

  var levelSpecs = [
        {
          numPairs: 8,
          stageMaker: function (stageIndex) {
            var stage = {};
            stage.numPairs = Math.min(stageIndex + 5, 5);
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
          shapeOriginX: 2.25 / 7,
          syllableOriginX: 4.75 / 7,
          highlightWeight: 1.5,
          fontFactor: 0.75,
          fontColor: '#444',
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
    var weights = {},
        index = Math.floor(Math.random() * stage.numPairs);
    weights[index] = layout.spell.highlightWeight;
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

  function paintSpell(shapes, syllables, weights) {
    var numPairs = shapes.length,
        context = contexts.spell,
        size = sizes.spell.height,
        spanFill = layout.spell.spanFill,
        shapeX = size * layout.spell.shapeOriginX,
        syllableX = size * layout.spell.syllableOriginX,
        totalWeight,
        weight,
        normalSpan,
        span,
        textWidth,
        i, x, y = 0;
    totalWeight = numPairs;
    if (weights) {
      Object.keys(weights).forEach(function (index) {
        totalWeight += weights[index] - 1;
      });
    } else {
      weights = {};
    }
    normalSpan = size / totalWeight;
    context.clearRect(0, 0, size, size);
    for (i = 0; i < numPairs; ++i) {
      span = normalSpan * (i in weights ? weights[i] : 1);
      y += span;
      context.save();
      context.translate(shapeX, y - span / 2);
      context.scale(spanFill * span / 2, spanFill * span / 2);
      shapes[i].paint(context);
      context.restore();
      contexts.spell.font = span * layout.spell.fontFactor + 'px ' +
          layout.spell.fontFamily;
      textWidth = context.measureText(syllables[i]).width;
      context.fillStyle = layout.spell.fontColor;
      context.fillText(syllables[i],
          syllableX - textWidth / 2, y - span / 3);
      console.log(syllableX - textWidth / 2, y);
    }
  }

  function startStage(stageIndex) {
    var i;
    status.inStage = true;
    stage = level.stageMaker(stageIndex);
    stage.shapes = level.shapes.slice(0, stage.numPairs);
    stage.syllables = level.syllables.slice(0, stage.numPairs);
    for (i = 0; i < stage.numPairs; ++i) {
      console.log(JSON.stringify(stage.shapes[i]), stage.syllables[i]);
    }
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
    addShapePainter: addShapePainter,
    setSyllables: setSyllables
  };
})(); // end Zorpodnix

window.onload = Zorpodnix.load;
