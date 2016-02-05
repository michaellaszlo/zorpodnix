
var Zorpodnix = (function () {
  'use strict';

  var levels = [
      ],
      sizes = {
      },
      shapePalettes = [
        [ '#e0de99', '#e08739', '#b23331', '#4f68a7', '#6ca76f' ]
      ],
      colors = {
        shapePalette: shapePalettes[0]
      },
      shapePainters = [],
      shapes = [],
      margin = {},
      containers = {},
      canvases = {},
      contexts = {};

  function addShapePainter(shape) {
    shapePainters.push(shape);
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
    var size;

    sizes.window = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Full-window canvas.
    canvases.window.width = sizes.window.width;
    canvases.window.height = sizes.window.height;
    
    // TODO: give containers integer dimensions in order to fit canvases
    // TODO: stack sections vertically in portrait layout
    // TODO: put action section to the right (landscape) or bottom (portrait)
    // TODO: make the layout configurable: left or right, top or bottom

    if (sizes.window.width > sizes.window.height) {
      // Landscape layout. Calculate the maximal 16:9 frame.
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
      // Divide the three sections along the frame width: 9 + 1 + 6 = 16.
      // The height is 9:16, so the action area has sides 9:9 = square.
      size = sizes.frame.height;
      sizes.action = { width: size, height: size };
      sizes.countdown = { width: Math.floor(size / 9), height: size };
      sizes.spell = { width: sizes.frame.width -
          sizes.action.width - sizes.countdown.width, height: size };
    } else {
      // Portrait layout. Calculate the maximal 9:16 frame.
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
      // Divide the three sections along the frame height: 9 + 1 + 6 = 16.
      // The width is 9:16, so the action area has sides 9:9 = square.
      size = sizes.frame.width;
      sizes.action = { width: size, height: size };
      sizes.countdown = { width: size, height: Math.floor(size / 9) };
      sizes.spell = { width: size, height: sizes.frame.height -
          sizes.action.height - sizes.countdown.height };
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
    containers.frame.style.top = margin.frame.top + 'px';
    containers.frame.style.left = margin.frame.left + 'px';
    containers.countdown.style.left = sizes.action.width + 'px';
    containers.spell.style.left = (sizes.action.width +
        sizes.countdown.width) + 'px';
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
    var size = sizes.action.height,
        count = 5,
        radius = size / 2 / count,
        context = contexts.action,
        shape, i, x, y;
    context.clearRect(0, 0, size, size);
    for (x = radius * 3 / 4; x < size; x += 2 * radius) {
      for (y = radius * 3 / 4; y < size; y += 2 * radius) {
        shape = shapes[Math.floor(Math.random() * shapes.length)];
        context.save();
        context.translate(x + radius, y + radius);
        context.scale(radius, radius);
        context.rotate(Math.random() * 2 * Math.PI);
        shape.paint(context);
        context.restore();
      }
    }
  }

  function load() {
    makeShapes();
    makeLayout();
    window.onresize = function () {
      updateLayout();
      paintFrame();
    };
    window.onresize();
  }

  return {
    load: load,
    addShapePainter: addShapePainter
  };
})(); // end Zorpodnix

Zorpodnix.addShapePainter(function (context) {
  var sides = 3, i,
      increment = 2 * Math.PI / sides, angle = (Math.PI - increment) / 2;
  context.beginPath(); context.moveTo(Math.cos(angle), Math.sin(angle));
  for (i = 0; i < sides; ++i) {
    angle += increment;
    context.lineTo(Math.cos(angle), Math.sin(angle));
  }
  context.closePath(); context.fill();
});
Zorpodnix.addShapePainter(function (context) {
  var sides = 4, i,
      increment = 2 * Math.PI / sides, angle = (Math.PI - increment) / 2;
  context.beginPath(); context.moveTo(Math.cos(angle), Math.sin(angle));
  for (i = 0; i < sides; ++i) {
    angle += increment;
    context.lineTo(Math.cos(angle), Math.sin(angle));
  }
  context.closePath(); context.fill();
});
Zorpodnix.addShapePainter(function (context) {
  var sides = 6, i,
      increment = 2 * Math.PI / sides, angle = (Math.PI - increment) / 2;
  context.beginPath(); context.moveTo(Math.cos(angle), Math.sin(angle));
  for (i = 0; i < sides; ++i) {
    angle += increment;
    context.lineTo(Math.cos(angle), Math.sin(angle));
  }
  context.closePath(); context.fill();
});
Zorpodnix.addShapePainter(function (context) {
  context.beginPath(); context.arc(0, 0, 1, 0, 2 * Math.PI);
  context.closePath(); context.fill();
});

window.onload = Zorpodnix.load;
