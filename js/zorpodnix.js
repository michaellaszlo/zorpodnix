
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

  function makeLayout() {
    var actionSize;

    // Make a canvas covering the whole window.
    size.window = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    canvases.window = document.createElement('canvas');
    canvases.window.width = size.window.width;
    canvases.window.height = size.window.height;
    
    // Calculate the dimensions and offset of the maximal 16:9 frame.
    if (size.window.height * 16 / 9 < size.window.width) {
      // Full-height frame with margins to left and right.
      size.frame = { height: window.size.height };
      size.frame.width = size.frame.height * 16 / 9;
      margin.frame = { top: 0, bottom: 0 };
      margin.frame.left = (size.window.width - size.frame.width) / 2;
      margin.frame.right = margin.frame.left;
    } else {
      // Full-width frame with margins above and below.
      size.frame = { width: window.size.width };
      size.frame.height = size.frame.width * 9 / 16;
      margin.frame = { left: 0, right: 0 };
      margin.frame.top = (size.window.height - size.frame.height) / 2;
      margin.frame.bottom = margin.frame.top;
    }

    // Divide the frame into three sections along the width: 16 = 9 + 1 + 6.
    // These are the action area, countdown bar, and spell display.
    actionSize = size.frame.height;
    size.action = { height: actionSize, width: actionSize };
    size.countdown = { height: actionSize, width: actionSize / 9 };
    size.spell = { height: actionSize, width: actionSize * 2 / 3 };

    // Make containers for the frame and the three sections.
    [ 'frame', 'action', 'countdown', 'spell' ].forEach(function (name) {
      containers[name] = document.createElement('div');
      containers[name].style.width = size[name].width + 'px';
      containers[name].style.height = size[name].height + 'px';
      containers[name].style.top = margin.frame.top + 'px';
    });
    containers.frame.style.left = containers.action.style.left =
        margin.frame.left + 'px';
    containers.countdown.style.left =
        (margin.frame.left + size.action.width) + 'px';
    containers.spell.style.left =
        (margin.frame.left + size.action.width + size.countdown.width) + 'px';

    // Now that we have all the canvases, get all the contexts.
    Object.keys(canvases).forEach(function (name) {
      contexts[name] = canvases[name].getContext('2d');
    });
  }

  function load() {
    makeLayout();
  }

  return {
    load: load
  };
})(); // end Zorpodnix

window.onload = Zorpodnix.load;
