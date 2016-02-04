
var Zorpodnix = (function () {
  'use strict';

  var levels = [
      ],
      size = {
      },
      margin = {},
      containers = {},
      canvases = {},
      contexts = {};

  function updateLayout() {
    var actionSize;

    size.window = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Full-window canvas.
    canvases.window.width = size.window.width;
    canvases.window.height = size.window.height;
    
    // Calculate the dimensions and offset of the maximal 16:9 frame.
    if (size.window.height * 16 / 9 < size.window.width) {
      // Full-height frame with margins to left and right.
      size.frame = { height: size.window.height };
      size.frame.width = size.frame.height * 16 / 9;
      margin.frame = { top: 0, bottom: 0 };
      margin.frame.left = (size.window.width - size.frame.width) / 2;
      margin.frame.right = margin.frame.left;
    } else {
      // Full-width frame with margins above and below.
      size.frame = { width: size.window.width };
      size.frame.height = size.frame.width * 9 / 16;
      margin.frame = { left: 0, right: 0 };
      margin.frame.top = (size.window.height - size.frame.height) / 2;
      margin.frame.bottom = margin.frame.top;
    }

    // Divide the three sections along its width: 9 + 1 + 6 = 16.
    // The height is 9:16, so the action area has sides 9:9 = square.
    actionSize = size.frame.height;
    size.action = { height: actionSize, width: actionSize };
    size.countdown = { height: actionSize, width: actionSize / 9 };
    size.spell = { height: actionSize, width: actionSize * 2 / 3 };

    // Containers for the frame and its three sections.
    [ 'frame', 'action', 'countdown', 'spell' ].forEach(function (name) {
      containers[name].style.width = size[name].width + 'px';
      containers[name].style.height = size[name].height + 'px';
    });
    containers.frame.style.top = margin.frame.top + 'px';
    containers.frame.style.left = margin.frame.left + 'px';
    containers.countdown.style.left = size.action.width + 'px';
    containers.spell.style.left = (size.action.width +
        size.countdown.width) + 'px';
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

  function load() {
    makeLayout();
    updateLayout();
    window.onresize = updateLayout;
  }

  return {
    load: load
  };
})(); // end Zorpodnix

window.onload = Zorpodnix.load;
