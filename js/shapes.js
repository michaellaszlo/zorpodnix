// begin shapes.js

Zorpodnix.addShapePainter('triangle', function (context) {
  var sides = 3, i,
      increment = 2 * Math.PI / sides, angle = (Math.PI - increment) / 2;
  context.beginPath(); context.moveTo(Math.cos(angle), Math.sin(angle));
  for (i = 0; i < sides; ++i) {
    angle += increment;
    context.lineTo(Math.cos(angle), Math.sin(angle));
  }
  context.closePath(); context.fill(); context.stroke();
});
Zorpodnix.addShapePainter('square', function (context) {
  var sides = 4, i,
      increment = 2 * Math.PI / sides, angle = (Math.PI - increment) / 2;
  context.beginPath(); context.moveTo(Math.cos(angle), Math.sin(angle));
  for (i = 0; i < sides; ++i) {
    angle += increment;
    context.lineTo(Math.cos(angle), Math.sin(angle));
  }
  context.closePath(); context.fill(); context.stroke();
});
Zorpodnix.addShapePainter('hexagon', function (context) {
  var sides = 6, i,
      increment = 2 * Math.PI / sides, angle = (Math.PI - increment) / 2;
  context.beginPath(); context.moveTo(Math.cos(angle), Math.sin(angle));
  for (i = 0; i < sides; ++i) {
    angle += increment;
    context.lineTo(Math.cos(angle), Math.sin(angle));
  }
  context.closePath(); context.fill(); context.stroke();
});
Zorpodnix.addShapePainter('circle', function (context) {
  context.beginPath(); context.arc(0, 0, 1, 0, 2 * Math.PI);
  context.closePath(); context.fill(); context.stroke();
});

// end shapes.js
