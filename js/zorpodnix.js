var Zorpodnix = (function () {
  'use strict';

  var levelSpecs = [
        {
          name: 'novice',
          numPairs: 4,
          stages: [
            //{ show: [ 0, 1 ], test: [ 2 ] },
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
      level = {},
      current = {},
      shapePalettes = [
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
      animationGroups = {};

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
    this.strokeColor = colors.action.stroke.normal;
  }
  Shape.prototype.paint = function (context, options) {
    context.save();
    context.fillStyle = this.fillColor;
    context.strokeStyle = this.strokeColor;
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
    this.cleanup= cleanup;
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
    this.cleanup();
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
    containers.info.innerHTML = [
      level.name,
      'stage ' + (current.stageIndex + 1) + ' / ' + level.stages.length,
      'trial ' + (current.trialIndex + 1) + ' / ' + current.numTrials,
    ].join('<br>');
  }

  function paintAction() {
    var context = contexts.action,
        size = sizes.action.width,
        radius = sizes.action.radius;
    context.lineWidth = layout.shape.lineFactor;
    current.actionShapes.forEach(function (shape, index) {
      var position = current.actionShapes[index].actionPosition,
          x = position.x,
          y = position.y;
      context.save();
      context.translate(x * size, y * size);
      context.scale(radius, radius);
      shape.paint(context);
      context.restore();
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
      // If this is the final trial, show the shape iff we've already matched
      // the syllable. For all other trials, show the shape iff it is not
      // being tested.
      if (isFinalTrial) {
        showShape = (i < current.spellIndex);
      } else {
        showShape = !shape.tested;
      }
      if (showShape) {
        context.save();
        context.translate(shapeX, y);
        shapeRadius = spanFill * span / 2;
        context.lineWidth = layout.shape.lineFactor;
        context.scale(shapeRadius, shapeRadius);
        context.fillStyle = '#ddd';
        shape.paint(context);
        context.restore();
      }
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
    clearAnimationGroup('spell');
    (new Animation('spell', action, cleanup, seconds)).launch();
  }

  function enterLevelSelect() {
    current.levelIndex = 0;
    startLevel();
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

  function startLevel() {
    var levelSpec;
    levelSpec = levelSpecs[current.levelIndex];
    [ 'name', 'numPairs', 'stages' ].forEach(function (property) {
      level[property] = levelSpec[property];
    });
    shuffle(shapes);
    shuffle(syllables);
    shapes.forEach(function (shape, index) {
      shape.syllable = syllables[index];
    });
    level.shapes = shapes.slice(0, level.numPairs);
    level.shapesOutsideLevel = shapes.slice(level.numPairs);
    status.inLevel = true;
    current.stageIndex = 0;
    startStage();
    nextCycle();
  }
  
  function finishLevel() {
    containers.info.innerHTML = 'level completed';
    status.inLevel = false;
  }

  function startStage() {
    var stageIndex = current.stageIndex,
        stage = level.stages[stageIndex],
        spellLength,
        spellShapes = [],
        decoyShapes,
        candidate,
        found,
        i, j, k;

    // Read the indices of the syllables that compose the spell.
    if (stage.show) {
      stage.show.forEach(function (index) {
        var shape = level.shapes[index];
        shape.tested = false;
        spellShapes.push(shape);
      });
      // Shown syllables are only hidden in the last trial.
      current.numTrials = 3;
    } else {
      // If no syllables are shown, only have one trial.
      current.numTrials = 1;
    }
    if (stage.test) {
      stage.test.forEach(function (index) {
        var shape = level.shapes[index];
        shape.tested = true;
        spellShapes.push(shape);
      });
    }
    spellLength = spellShapes.length;
    shuffle(spellShapes);
    current.spellShapes = spellShapes;

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
      }, function () {})).launch();
    });

    current.trialIndex = 0;
    current.spellWeights = current.spellShapes.map(function (shape, i) {
      return 1;
    });
    transitionSpellShape(0);
    startTrial();
    status.inStage = true;
  }

  function finishStage() {
    containers.info.innerHTML = 'stage completed';
    current.stageIndex += 1;
    if (current.stageIndex == level.stages.length) {
      finishLevel();
      return;
    }
    setTimeout(startStage, 3000);
  }

  function startTrial() {
    current.spellIndex = 0;
  }

  function finishTrial() {
    current.trialIndex += 1;
    if (current.trialIndex == current.numTrials) {
      finishStage();
    } else {
      transitionSpellShape(0, current.spellShapes.length - 1);
      startTrial();
    }
  }

  function hitShape() {
    var shape = current.spellShapes[current.spellIndex],
        syllable = shape.syllable,
        offset = offsets.action,
        scale = sizes.action.width,
        actionPosition = shape.actionPosition,
        x0 = offset.x + scale * actionPosition.x,
        y0 = offset.y + scale * actionPosition.y,
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
          fontSize = scale / 4 * 5 * progress,
          width, height;
      // Flash the word.
      syllableContext.fillStyle = shape.fillColor;
      syllableContext.font = fontSize + 'px ' + layout.spell.fontFamily;
      height = fontSize * 0.5;
      width = syllableContext.measureText(syllable).width;
      syllableContext.save();
      syllableContext.globalAlpha = 1 - Math.max(0, 2 * (progress - 0.5));
      syllableContext.fillText(syllable, x - width / 2, y + height / 2);
      syllableContext.restore();
      // Highlight the shape.
      shapeContext.save();
      shapeContext.globalAlpha = Math.min(1, 2 * (1 - progress));
      shapeContext.translate(actionPosition.x * shapeCanvas.width,
          actionPosition.y * shapeCanvas.height);
      shapeContext.lineWidth = layout.shape.lineFactor;
      shapeContext.scale(sizes.action.radius, sizes.action.radius);
      shape.paint(shapeContext, { stroke: strokeColor });
      shapeContext.restore();
    }, function () {}, animation.hit.seconds)).launch();
  }

  function missShape() {
    transitionSpellShape(0, current.spellIndex);
    startTrial();
  }

  function animateTouch(x, y, isHit) {
    var canvas = canvases.touch,
        size = sizes.action.width,
        context = contexts.touch,
        color = colors.touch,
        radius = sizes.touch.diameter / 2,
        targetShape = current.spellShapes[current.spellIndex],
        tx, ty;
    clearAnimationGroup('touch');
    (new Animation('touch', function (progress) {
      progress = animation.touch.easing(progress);
      tx = targetShape.actionPosition.x * size;
      ty = targetShape.actionPosition.y * size;
      if (!isHit) {
        // Cheat for playtesting purposes: circle the target shape.
        context.beginPath();
        context.arc(tx, ty, sizes.action.radius, 0, 2 * Math.PI);
        context.lineWidth = sizes.touch.line;
        context.strokeStyle = '#fff';
        context.stroke();
        context.closePath();
      }
      if (progress < 0.5) {
        // Instant disc.
        context.save();
        context.globalAlpha = color.fillOpacity;
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI);
        context.fillStyle = color.instant;
        context.fill();
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
        context.arc(x, y, radius, 0, 2 * Math.PI);
        context.fillStyle = color.fill;
        context.fill();
        context.restore();
      } else {
        // Instant disc.
        context.save();
        context.globalAlpha = color.fillOpacity;
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI);
        context.fillStyle = color.instant;
        context.fill();
        context.closePath();
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
    }, function () {}, animation.touch.seconds)).launch();
  }

  function handleTouch(x, y) {
    var offset = offsets.action,
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

    // Check whether the target shape is within touch.diameter.
    targetShape = current.spellShapes[current.spellIndex];
    tx = targetShape.actionPosition.x * width;
    ty = targetShape.actionPosition.y * height;
    dd = Math.pow(x - tx, 2) + Math.pow(y - ty, 2);
    if (dd <= Math.pow(sizes.action.radius + sizes.touch.diameter / 2, 2)) {
      animateTouch(x, y, true);
      hitShape();
    } else {
      animateTouch(x, y, false);
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
    enterLevelSelect();
  }

  return {
    load: load,
    resize: resize,
    addShapePainter: addShapePainter,
    setSyllables: setSyllables
  };
})(); // end Zorpodnix
window.onload = Zorpodnix.load;
