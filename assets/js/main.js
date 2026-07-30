/* ChipTycoon - drops each diorama into its slot on the page. */

(function () {
  'use strict';

  function mount() {
    var slots = document.querySelectorAll('[data-scene]');
    for (var i = 0; i < slots.length; i++) {
      var name = slots[i].getAttribute('data-scene');
      var spec = window.SCENES && window.SCENES[name];
      if (!spec) {
        slots[i].innerHTML = '<p style="padding:20px;text-align:center">Scene "' + name + '" is still under construction.</p>';
        continue;
      }
      slots[i].innerHTML = window.ISO.scene(spec);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
