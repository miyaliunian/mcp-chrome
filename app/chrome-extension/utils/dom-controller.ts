// This file acts as a clean, user-facing API.
// It imports from the auto-generated file and re-exports a structured object.

import * as helpers from './dom-helpers.generated';

export const domController = {
  /**
   * Clicks an element on the page.
   * @param args - Arguments for the click operation.
   */
  click: (args: Parameters<typeof helpers.clickElement>[0]) => {
    return helpers.clickElement(
      args.selector,
      args.waitForNavigation,
      args.timeout,
      args.coordinates,
    );
  },

  /**
   * Fills a form element with a value.
   * @param args - Arguments for the fill operation.
   */
  fill: (args: { selector: string; value: string }) => {
    return helpers.fillElement(args.selector, args.value);
  },

  /**
   * Finds interactive elements on the page.
   * @param args - Arguments for finding elements.
   */
  getInteractiveElements: (args: Parameters<typeof helpers.findElementsByTextWithFallback>[0]) => {
    return helpers.findElementsByTextWithFallback(args);
  },

  /**
   * Simulates keyboard events.
   * @param args - Arguments for keyboard simulation.
   */
  keyboard: (args: { keys: string; selector?: string; delay?: number }) => {
    const targetElement = args.selector ? document.querySelector(args.selector) : null;
    return helpers.simulateKeyboard(args.keys, targetElement, args.delay);
  },

  /**
   * Replays a network request.
   * @param args - Arguments for the network request.
   */
  networkRequest: (args: Parameters<typeof helpers.replayNetworkRequest>[0]) => {
    return helpers.replayNetworkRequest(
      args.url,
      args.method,
      args.headers,
      args.body,
      args.timeout,
    );
  },

  /**
   * Prepares the page for a screenshot.
   * @param args - Arguments for screenshot preparation.
   */
  preparePageForCapture: (args: Parameters<typeof helpers.preparePageForCapture>[0]) => {
    return helpers.preparePageForCapture(args.options);
  },

  /**
   * Gets details about the page layout.
   */
  getPageDetails: () => {
    return helpers.getPageDetails();
  },

  /**
   * Gets details about a specific element.
   * @param args - Arguments for getting element details.
   */
  getElementDetails: (args: { selector: string }) => {
    return helpers.getElementDetails(args.selector);
  },

  /**
   * Scrolls the page to a specific position.
   * @param args - Arguments for scrolling.
   */
  scrollPage: (args: { x: number; y: number; scrollDelay?: number }) => {
    return helpers.scrollPage(args.x, args.y, args.scrollDelay);
  },

  /**
   * Resets the page after a screenshot.
   * @param args - Arguments for resetting the page.
   */
  resetPageAfterCapture: (args: { scrollX: number; scrollY: number }) => {
    return helpers.resetPageAfterCapture(args.scrollX, args.scrollY);
  },

  /**
   * Fetches and parses the main content of the page.
   * @param doc - The document to parse.
   * @param options - Options for Readability.
   */
  fetchWeb: (doc: Document, options?: any) => {
    const readability = new helpers.Readability(doc, options);
    return readability.parse();
  },
};

export default domController;
