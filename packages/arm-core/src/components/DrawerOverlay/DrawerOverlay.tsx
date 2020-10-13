import { ChevronRight } from '@amsterdam/asc-assets'
import { Button, themeColor, themeSpacing } from '@amsterdam/asc-ui'
import React, {
  Children,
  cloneElement,
  CSSProperties,
  Fragment,
  FunctionComponent,
  isValidElement,
  ReactComponentElement,
  TouchEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import styled, { css } from 'styled-components'
import useObserveSize from '../../utils/useObserveSize'
import Control from '../controls/Control'
import MapOverlay from '../MapOverlay'

const HANDLE_SIZE_MOBILE = 70
const HANDLE_SIZE_DESKTOP = 30
// The height of the preview area in pixels, handle and controls excluded.
const PREVIEW_SIZE = 200
const SNAP_OFFSET = 0.5 // 0 - 1, increase this to snap quicker to bottom or top, instead of middle

export enum DeviceMode {
  Desktop = 'DESKTOP',
  Mobile = 'MOBILE',
}

export enum DrawerState {
  Open = 'OPEN',
  Closed = 'CLOSED',
  Preview = 'PREVIEW',
}

export const isMobile = (mode: DeviceMode) => mode === DeviceMode.Mobile
export const isDesktop = (mode: DeviceMode) => mode === DeviceMode.Desktop

const DrawerMapOverlay = styled(MapOverlay)`
  flex-direction: column;
`

const ControlsContainer = styled.div<{ mode: DeviceMode }>`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: ${themeSpacing(4)};

  ${({ mode }) =>
    isDesktop(mode) &&
    css`
      flex-direction: column;
      height: 100%;
    `}
`

const OtherControlsContainer = styled(ControlsContainer)`
  ${({ mode }) =>
    isDesktop(mode) &&
    css`
      margin-left: auto;
    `}
`

const DrawerHandleMobile = styled(Button)`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  width: 100%;
  height: ${HANDLE_SIZE_MOBILE}px;
  padding-bottom: 20px;

  &::before {
    content: '';
    display: block;
    width: 200px;
    height: 4px;
    border-radius: 3px;
    background-color: ${themeColor('tint', 'level4')};
  }
`

const DrawerHandleDesktop = styled(Button)`
  flex-shrink: 0;
  width: ${HANDLE_SIZE_DESKTOP}px;
  height: 100%;
`

const HandleIcon = styled(ChevronRight)<{ isOpen: boolean }>`
  transition: transform 0.25s ease-in-out;
  ${({ isOpen }) =>
    isOpen &&
    css`
      transform: rotate(180deg);
    `}
`

const DrawerContainer = styled.div<{ mode: DeviceMode; animate: boolean }>`
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 0; /* The top value will be overwritten with the size of the locked controls */
  bottom: 0;
  right: 0;
  left: 0;
  will-change: transform;

  ${({ mode }) =>
    isDesktop(mode) &&
    css`
      right: initial;
      left: initial;
      flex-direction: row-reverse;
    `}

  ${({ animate }) =>
    animate &&
    css`
      transition: transform 0.25s ease-in-out;
    `}
`

const Drawer = styled.div<{ mode: DeviceMode }>`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
  pointer-events: all;

  ${({ mode }) =>
    isDesktop(mode) &&
    css`
      flex-direction: row-reverse;
    `}
`

const DrawerContent = styled.div`
  display: flex;
  flex-grow: 1;
  min-height: 0;
  position: relative;
`

function sortControls(mode: DeviceMode, controls: DrawerControl[]) {
  return controls.sort((control) => {
    if (isMobile(mode)) {
      return control.hAlign === 'left' ? 0 : 1
    }

    return control.vAlign === 'top' ? 0 : 1
  })
}

export interface DrawerControl {
  id: string
  hAlign: 'left' | 'right'
  vAlign: 'top' | 'bottom'
  node: ReactComponentElement<typeof Control>
}

export interface DrawerOverlayProps {
  mode?: DeviceMode
  state?: DrawerState
  controls?: DrawerControl[]
  onStateChange?: (state: DrawerState) => void
}

function useAnimationFrame(): (callback: FrameRequestCallback) => void {
  const isPendingRef = useRef(false)
  const callbackRef = useRef<FrameRequestCallback | null>(null)

  function handleFrame(time: number) {
    if (callbackRef.current) {
      callbackRef.current(time)
    }

    callbackRef.current = null
    isPendingRef.current = false
  }

  return (callback: FrameRequestCallback) => {
    callbackRef.current = callback

    if (isPendingRef.current) {
      return
    }

    isPendingRef.current = true
    window.requestAnimationFrame(handleFrame)
  }
}

const DrawerOverlay: FunctionComponent<DrawerOverlayProps> = ({
  children,
  controls,
  onStateChange,
  mode = DeviceMode.Mobile,
  state = DrawerState.Closed,
}) => {
  const initialDrawerPositionRef = useRef<number | null>(null)
  const initialDragPositionRef = useRef<number | null>(null)
  const lastDragPositionRef = useRef<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const numChildren = Children.toArray(children).length

  const drawerContainerRef = useRef<HTMLDivElement>(null)
  const drawerContainerSize = useObserveSize(drawerContainerRef)
  const drawerContainerHeight = drawerContainerSize?.blockSize ?? 0

  const lockedControlsRef = useRef<HTMLDivElement>(null)
  const lockedControlsSize = useObserveSize(lockedControlsRef)
  const lockedControlsWidth = lockedControlsSize?.inlineSize ?? 0
  const lockedControlsHeight = lockedControlsSize?.blockSize ?? 0

  const drawerContentRef = useRef<HTMLDivElement>(null)
  const DrawerHandle = isMobile(mode) ? DrawerHandleMobile : DrawerHandleDesktop
  const requestFrame = useAnimationFrame()

  // Force close the drawer if no children are present.
  useEffect(() => {
    if (numChildren === 0 && state !== DrawerState.Closed) {
      onStateChange?.(DrawerState.Closed)
    }
  }, [numChildren])

  // These are the controls that are locked to the position of the drawer.
  const lockedControls = sortControls(
    mode,
    controls?.filter((control) =>
      isMobile(mode) ? control.vAlign === 'bottom' : control.hAlign === 'left',
    ) ?? [],
  )

  // The other controls do not need to be locked to the drawer.
  const otherControls = sortControls(
    mode,
    controls?.filter((control) =>
      isMobile(mode) ? control.vAlign === 'top' : control.hAlign === 'right',
    ) ?? [],
  )

  function handleToggle() {
    if (!onStateChange) {
      return
    }

    if (isMobile(mode)) {
      onStateChange(
        state === DrawerState.Preview
          ? DrawerState.Closed
          : DrawerState.Preview,
      )
    } else {
      onStateChange(
        state === DrawerState.Closed ? DrawerState.Open : DrawerState.Closed,
      )
    }
  }

  function getPositionDelta() {
    if (
      lastDragPositionRef.current === null ||
      initialDragPositionRef.current === null
    ) {
      return 0
    }

    return lastDragPositionRef.current - initialDragPositionRef.current
  }

  function getDrawerPositionTransform(drawerState = state) {
    if (isDesktop(mode)) {
      if (drawerState !== DrawerState.Open) {
        return `translateX(calc(-100% + ${
          lockedControlsWidth + (numChildren > 0 ? HANDLE_SIZE_DESKTOP : 0)
        }px))`
      }

      return ''
    }

    // We're no longer dragging the drawer, use a finalized position calculated with CSS.
    if (initialDrawerPositionRef.current === null) {
      switch (drawerState) {
        case DrawerState.Closed:
          return `translateY(calc(100% - ${
            lockedControlsHeight + (numChildren > 0 ? HANDLE_SIZE_MOBILE : 0)
          }px))`
        case DrawerState.Preview:
          return `translateY(calc(100% - ${
            lockedControlsHeight + HANDLE_SIZE_MOBILE + PREVIEW_SIZE
          }px))`
        default:
          return ''
      }
    }

    // We're still dragging the drawer, calculate a position based on the movement delta.
    const drawerPosition = Math.max(
      0,
      initialDrawerPositionRef.current + getPositionDelta(),
    )

    return `translateY(${drawerPosition}px)`
  }

  function getDrawerPositionFromState(drawerState: DrawerState) {
    if (drawerState === DrawerState.Open) {
      return 0
    }

    const closedPosition =
      drawerContainerHeight - (HANDLE_SIZE_MOBILE + lockedControlsHeight)

    if (drawerState === DrawerState.Closed) {
      return closedPosition
    }

    return closedPosition - PREVIEW_SIZE
  }

  function getStateFromPosition() {
    if (!initialDrawerPositionRef.current) {
      return DrawerState.Closed
    }

    const drawerPosition = initialDrawerPositionRef.current + getPositionDelta()
    const previewPosition = getDrawerPositionFromState(DrawerState.Preview)
    const previewThresholdTop = previewPosition * SNAP_OFFSET
    const previewThresholdBottom = previewPosition * (1 + SNAP_OFFSET)

    if (drawerPosition < previewThresholdTop) {
      return DrawerState.Open
    }

    if (drawerPosition > previewThresholdBottom) {
      return DrawerState.Closed
    }

    return DrawerState.Preview
  }

  function updateDrawerPositionTransform(drawerState = state) {
    requestFrame(() => {
      if (!drawerContainerRef.current) {
        return
      }

      drawerContainerRef.current.style.transform = getDrawerPositionTransform(
        drawerState,
      )
    })
  }

  function handleGestureStart(event: TouchEvent<HTMLDivElement>) {
    if (
      isDesktop(mode) ||
      !(event.target instanceof Node) ||
      !drawerContentRef.current
    ) {
      return
    }

    const currentDrawerPanel = drawerContentRef.current.lastElementChild

    if (!(currentDrawerPanel instanceof Element)) {
      return
    }

    // Determine if the event originated from the content of the drawer, not the handle.
    const isDrawerContent = drawerContentRef.current.contains(event.target)

    // Prevent dragging if the drawer content is not scrolled to the top.
    if (isDrawerContent && currentDrawerPanel.scrollTop > 0) {
      return
    }

    const drawerPosition = getDrawerPositionFromState(state)
    const { clientY } = event.targetTouches[0]

    initialDrawerPositionRef.current = drawerPosition
    initialDragPositionRef.current = clientY
    lastDragPositionRef.current = clientY

    updateDrawerPositionTransform()
    setIsDragging(true)
  }

  function handleGestureMove(event: TouchEvent<HTMLDivElement>) {
    if (lastDragPositionRef.current === null) {
      return
    }

    // We need to use a ref here to prevent unnecessary re-renders.
    lastDragPositionRef.current = event.targetTouches[0].clientY

    updateDrawerPositionTransform()
  }

  function handleGestureEnd() {
    if (lastDragPositionRef.current === null) {
      return
    }

    const newState = getStateFromPosition()

    initialDrawerPositionRef.current = null
    initialDragPositionRef.current = null
    lastDragPositionRef.current = null

    updateDrawerPositionTransform(newState)
    setIsDragging(false)

    if (onStateChange && newState !== state) {
      onStateChange(newState)
    }
  }

  const drawerContainerStyle: CSSProperties = {}

  if (isMobile(mode)) {
    // The drawer needs to be completely visible in the open position, but without the controls that are locked to it in the viewport.
    drawerContainerStyle.top = `-${lockedControlsHeight}px`
  }

  drawerContainerStyle.transform = getDrawerPositionTransform()

  return (
    <DrawerMapOverlay>
      {otherControls.length > 0 && (
        <OtherControlsContainer mode={mode}>
          {otherControls.map((control) => (
            <Fragment key={control.id}>{control.node}</Fragment>
          ))}
        </OtherControlsContainer>
      )}
      <DrawerContainer
        ref={drawerContainerRef}
        mode={mode}
        style={drawerContainerStyle}
        animate={!isDragging}
      >
        <ControlsContainer ref={lockedControlsRef} mode={mode}>
          {lockedControls.map((control) => (
            <Fragment key={control.id}>{control.node}</Fragment>
          ))}
        </ControlsContainer>
        <Drawer
          mode={mode}
          onTouchStart={handleGestureStart}
          onTouchMove={handleGestureMove}
          onTouchEnd={handleGestureEnd}
          onTouchCancel={handleGestureEnd}
        >
          <DrawerHandle
            type="button"
            variant="blank"
            icon={
              isDesktop(mode) ? (
                <HandleIcon isOpen={state === DrawerState.Open} />
              ) : null
            }
            size={32}
            iconSize={20}
            title="Open paneel"
            onClick={handleToggle}
          />
          <DrawerContent ref={drawerContentRef}>
            {Children.map(children, (child, index) => {
              if (!isValidElement(child)) {
                return child
              }

              return cloneElement(child, {
                stackLevel: index,
              })
            })}
          </DrawerContent>
        </Drawer>
      </DrawerContainer>
    </DrawerMapOverlay>
  )
}

export default DrawerOverlay