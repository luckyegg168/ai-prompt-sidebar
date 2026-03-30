/**
 * Tests for DOM utility functions
 */

import { el, debounce, throttle } from "../utils/dom";

describe("el", () => {
  it("should create element without class", () => {
    const div = el("div");

    expect(div.tagName).toBe("DIV");
    expect(div.className).toBe("");
  });

  it("should create element with class", () => {
    const div = el("div", "my-class");

    expect(div.tagName).toBe("DIV");
    expect(div.className).toBe("my-class");
  });

  it("should create button element", () => {
    const button = el("button", "btn");

    expect(button.tagName).toBe("BUTTON");
    expect(button.className).toBe("btn");
  });

  it("should create input element", () => {
    const input = el("input");

    expect(input.tagName).toBe("INPUT");
    expect(input).toBeInstanceOf(HTMLInputElement);
  });
});

describe("debounce", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should debounce function calls", () => {
    const fn = jest.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should delay execution by specified wait time", () => {
    const fn = jest.fn();
    const debouncedFn = debounce(fn, 200);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("throttle", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should throttle function calls", () => {
    const fn = jest.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn();
    throttledFn();
    throttledFn();

    expect(fn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);
    throttledFn();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should allow calls after throttle period", () => {
    const fn = jest.fn();
    const throttledFn = throttle(fn, 50);

    throttledFn();
    expect(fn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(50);
    throttledFn();
    expect(fn).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(50);
    throttledFn();
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
