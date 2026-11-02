import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest does not expose globals here, so Testing Library cannot register its own cleanup.
afterEach(() => cleanup());

// jsdom lacks what Radix Select reaches for when a menu opens (pointer capture and scrolling an option into view).
const proto = Element.prototype as unknown as Record<string, unknown>;
if (!proto.hasPointerCapture) proto.hasPointerCapture = () => false;
if (!proto.setPointerCapture) proto.setPointerCapture = () => undefined;
if (!proto.releasePointerCapture) proto.releasePointerCapture = () => undefined;
if (!proto.scrollIntoView) proto.scrollIntoView = () => undefined;
