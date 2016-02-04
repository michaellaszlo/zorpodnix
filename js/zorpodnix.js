
var Zorpodnix = (function () {
  'use strict';

  var levels = [
      ],
      sizes = {
      },
      shapes = [],
      palettes = [
        [ '#e6e593', '#d36b2a', '#b41719', '#4f68a7', '#6ca76f' ]
      ],
      color = {
        palette: palettes[0]
      },
      margin = {},
      containers = {},
      canvases = {},
      contexts = {};

  function addShape(shape) {
    shapes.push(shape);
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
    
    // Calculate the dimensions and offset of the maximal 16:9 frame.
    if (sizes.window.height * 16 / 9 < sizes.window.width) {
      // Full-height frame with margins to left and right.
      sizes.frame = { height: sizes.window.height };
      sizes.frame.width = sizes.frame.height * 16 / 9;
      margin.frame = { top: 0, bottom: 0 };
      margin.frame.left = (sizes.window.width - sizes.frame.width) / 2;
      margin.frame.right = margin.frame.left;
    } else {
      // Full-width frame with margins above and below.
      sizes.frame = { width: sizes.window.width };
      sizes.frame.height = sizes.frame.width * 9 / 16;
      margin.frame = { left: 0, right: 0 };
      margin.frame.top = (sizes.window.height - sizes.frame.height) / 2;
      margin.frame.bottom = margin.frame.top;
    }

    // Divide the three sections along its width: 9 + 1 + 6 = 16.
    // The height is 9:16, so the action area has sides 9:9 = square.
    size = sizes.frame.height;
    sizes.action = { height: size, width: size };
    sizes.countdown = { height: size, width: size / 9 };
    sizes.spell = { height: size, width: size * 2 / 3 };

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
        radius = size / 2 / 9,
        context = contexts.action;
    context.clearRect(0, 0, size, size);
    context.save();
    context.translate(size / 2, size / 2);
    context.scale(radius, radius);
    shapes[0](context);
    context.restore();
  }

  function load() {
    makeLayout();
    updateLayout();
    window.onresize = updateLayout;
    paintFrame();
  }

  return {
    load: load,
    addShape: addShape
  };
})(); // end Zorpodnix

Zorpodnix.addShape(function (context) {
  var sides = 3, i,
      increment = 2 * Math.PI / sides, angle = (Math.PI - increment) / 2;
  context.beginPath(); context.moveTo(Math.cos(angle), Math.sin(angle));
  for (i = 0; i < sides; ++i) {
    angle += increment;
    context.lineTo(Math.cos(angle), Math.sin(angle));
  }
  context.closePath(); context.fill();
});
Zorpodnix.addShape(function (context) {
  var sides = 4, i,
      increment = 2 * Math.PI / sides, angle = (Math.PI - increment) / 2;
  context.beginPath(); context.moveTo(Math.cos(angle), Math.sin(angle));
  for (i = 0; i < sides; ++i) {
    angle += increment;
    context.lineTo(Math.cos(angle), Math.sin(angle));
  }
  context.closePath(); context.fill();
});
Zorpodnix.addShape(function (context) {
  var sides = 6, i,
      increment = 2 * Math.PI / sides, angle = (Math.PI - increment) / 2;
  context.beginPath(); context.moveTo(Math.cos(angle), Math.sin(angle));
  for (i = 0; i < sides; ++i) {
    angle += increment;
    context.lineTo(Math.cos(angle), Math.sin(angle));
  }
  context.closePath(); context.fill();
});
Zorpodnix.addShape(function (context) {
  context.beginPath(); context.arc(0, 0, 1, 0, 2 * Math.PI);
  context.closePath(); context.fill();
});

window.onload = Zorpodnix.load;
