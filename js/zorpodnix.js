'use strict';

var Zorpodnix = (function () {

  function load() {
    console.log('loading');
  }

  return {
    load: load
  };
})();

window.onload = Zorpodnix.load;
