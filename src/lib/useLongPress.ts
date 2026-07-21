import { useCallback, useRef } from 'react';

export function useLongPress(
  onLongPress: (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => void,
  onClick?: (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => void,
  { shouldPreventDefault = true, delay = 500 } = {}
) {
  const timeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const target = useRef<EventTarget | undefined>(undefined);

  const start = useCallback(
    (event: any) => {
      // Don't prevent default on pointer events if we want native scrolling to work
      // Framer Motion drag handles it if we pass it properly
      if (shouldPreventDefault && event.target) {
        event.target.addEventListener('touchend', preventDefault, {
          passive: false
        });
        target.current = event.target;
      }
      timeout.current = setTimeout(() => {
        onLongPress(event);
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault]
  );

  const clear = useCallback(
    (event: any, shouldTriggerClick = true) => {
      timeout.current && clearTimeout(timeout.current);
      if (shouldTriggerClick && onClick) {
        onClick(event);
      }
      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener('touchend', preventDefault);
      }
    },
    [shouldPreventDefault, onClick]
  );

  return {
    onPointerDown: (e: any) => start(e),
    onPointerUp: (e: any) => clear(e),
    onPointerLeave: (e: any) => clear(e, false),
    onPointerCancel: (e: any) => clear(e, false),
  };
}

const preventDefault = (event: Event) => {
  if ('touches' in event && (event as unknown as TouchEvent).touches.length < 2 && event.preventDefault) {
    event.preventDefault();
  }
};
