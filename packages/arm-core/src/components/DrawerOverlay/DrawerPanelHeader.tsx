import { Close } from '@amsterdam/asc-assets'
import { Button } from '@amsterdam/asc-ui'
import React, { FunctionComponent } from 'react'
import styled from 'styled-components'

const HeaderContainer = styled.div`
  display: flex;
`

const HeaderContent = styled.div``

const CloseButton = styled(Button)`
  margin-left: auto;
`

export interface DrawerPanelHeaderProps {
  closable?: boolean
  onClose?: () => void
}

const DrawerPanelHeader: FunctionComponent<DrawerPanelHeaderProps> = ({
  children,
  closable = false,
  onClose,
}) => {
  return (
    <HeaderContainer>
      <HeaderContent>{children}</HeaderContent>
      {closable && (
        <CloseButton
          variant="blank"
          title="Sluit paneel"
          type="button"
          size={30}
          onClick={onClose}
          icon={<Close />}
        />
      )}
    </HeaderContainer>
  )
}

export default DrawerPanelHeader
