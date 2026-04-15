import '@testing-library/jest-dom/vitest';

// Mock matchmedia
window.matchMedia = window.matchMedia || function() {
  return {
      matches: false,
      media: '',
      onchange: null,
      addListener: function() {},
      removeListener: function() {},
      addEventListener: function() {},
      removeEventListener: function() {},
      dispatchEvent: function() { return false; }
   };
};
