// begin shapes.js

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

// end shapes.js
