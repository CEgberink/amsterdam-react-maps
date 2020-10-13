import { themeColor, themeSpacing } from '@amsterdam/asc-ui'
import styled, { css } from 'styled-components'
import { DeviceMode, isMobile } from '../DrawerOverlay'

const STACK_SPACING = 8

export interface DrawerPanelProps {
  stackLevel?: number
  deviceMode?: DeviceMode
}

const DrawerPanel = styled.div<DrawerPanelProps>`
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  overflow-y: scroll;
  animation: slidein 0.25s ease-in-out;
  background-color: ${themeColor('tint', 'level1')};

  ${({ stackLevel = 0 }) => css`
    margin-top: ${themeSpacing(STACK_SPACING * stackLevel)};

    ${stackLevel > 0 &&
    css`
      box-shadow: 0 0 0 ${themeSpacing(1)} rgba(0, 0, 0, 0.1);
    `}
  `}

  ${({ deviceMode = DeviceMode.Mobile }) =>
    isMobile(deviceMode)
      ? css`
          @keyfames slidein {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
        `
      : css`
          @keyfames slidein {
            from {
              transform: translateX(-100%);
            }
            to {
              transform: translateX(0);
            }
          }
        `}
`

export default DrawerPanel