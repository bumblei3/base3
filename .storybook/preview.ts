import type { Preview } from '@storybook/html-vite';

// Schach9x9 styles so stories render with the real app look & feel.
// The app splits CSS across multiple files (no single style.css entry).
import '../css/base.css';
import '../css/layout.css';
import '../css/design-tokens.css';
import '../css/components.css';
import '../css/board.css';
import '../css/shop.css';
import '../css/menu.css';
import '../css/notifications.css';
import '../css/animations.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // App uses non-standard ARIA in a few places; keep a11y addon informative, not blocking
      test: 'todo',
    },
  },
};

export default preview;
