import { RefObject, useLayoutEffect, useMemo, useState } from 'react';

export default function useObserveSize<T extends Element>(ref: RefObject<T>) {
  const [size, setSize] = useState<ResizeObserverSize | null>(null)
  const resizeObserver = useMemo(() => new ResizeObserver((entries) => {
    entries.forEach(entry => {
      const borderBoxSize = entry.borderBoxSize instanceof Array ? entry.borderBoxSize[0] : entry.borderBoxSize
      setSize(borderBoxSize)
    })
  }), [])

  useLayoutEffect(() => {
    const element = ref.current

    if (!element) {
      return
    }

    resizeObserver.observe(element)

    return () => resizeObserver.unobserve(element)
  }, [])

  return size
}

// TODO: Replace ResizeObserver type with the official one when made available (see: https://github.com/microsoft/TypeScript/issues/37861)
declare class ResizeObserver {
  constructor(callback: ResizeObserverCallback);
  observe: (target: Element, options?: ResizeObserverOptions) => void;
  unobserve: (target: Element) => void;
  disconnect: () => void;
}

type ResizeObserverBoxOptions = "border-box" | "content-box" | "device-pixel-content-box";

interface ResizeObserverOptions {
  box?: ResizeObserverBoxOptions;
}

type ResizeObserverCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;

interface ResizeObserverEntry {
  readonly target: Element;
  readonly borderBoxSize: ResizeObserverSize | ResizeObserverSize[];
  readonly contentBoxSize: ResizeObserverSize | ResizeObserverSize[];
  readonly devicePixelContentBoxSize: ResizeObserverSize | ResizeObserverSize[];
} 

interface ResizeObserverSize {
  readonly inlineSize: number;
  readonly blockSize: number;
}