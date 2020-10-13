import { Enlarge, Minimise } from '@amsterdam/asc-assets'
import { Button } from '@amsterdam/asc-ui'
import { useMapInstance } from '@amsterdam/react-maps'
import React, { FunctionComponent } from 'react'
import styled from 'styled-components'
import Control from './Control'

enum ZoomDirection {
  In = 1,
  Out = -1,
}

const ZoomButton = styled(Button)`
  margin-bottom: 2px;

  &:last-of-type {
    margin-bottom: 0;
  }
`

const ZoomControl: FunctionComponent = () => {
  const mapInstance = useMapInstance()

  const handleZoom = (direction: ZoomDirection) => {
    mapInstance.setZoom(mapInstance.getZoom() + direction)
  }

  return (
    <Control>
      <ZoomButton
        type="button"
        variant="blank"
        title="Inzoomen"
        size={44}
        iconSize={20}
        onClick={() => handleZoom(ZoomDirection.In)}
        icon={<Enlarge />}
      />
      <ZoomButton
        type="button"
        variant="blank"
        title="Uitzoomen"
        size={44}
        iconSize={20}
        onClick={() => handleZoom(ZoomDirection.Out)}
        icon={<Minimise />}
      />
    </Control>
  )
}

export default ZoomControl
