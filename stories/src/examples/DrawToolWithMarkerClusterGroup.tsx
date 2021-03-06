import { MarkerClusterGroup } from '@amsterdam/arm-cluster'
import { BaseLayer, Map, useStateRef } from '@amsterdam/arm-core'
import { DrawTool, ExtendedLayer, PolygonType } from '@amsterdam/arm-draw'
import { ascDefaultTheme, themeColor, ViewerContainer } from '@amsterdam/asc-ui'
import L, { LatLng, LatLngTuple, Polygon } from 'leaflet'
import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import getDataSelection from './api/getDataSelection'

const StyledViewerContainer = styled(ViewerContainer)`
  z-index: 400;
`

type MarkerGroup = {
  id: string
  markers: LatLngTuple[]
}

type Props = {
  hasInitialDrawings: boolean
}

const DATA_SELECTION_ENDPOINT =
  'https://api.data.amsterdam.nl/dataselectie/bag/geolocation/'

const DrawToolWithMarkerClusterGroup: React.FC<Props> = ({
  hasInitialDrawings = false,
}) => {
  const [showDrawTool, setShowDrawTool] = useState(true)
  const [mapInstance, setMapInstance] = useState<L.Map>()
  const [markerGroups, setMarkerGroups, markerGroupsRef] = useStateRef<
    MarkerGroup[]
  >([])

  const fetchData = async (latLngs: LatLng[][]) =>
    getDataSelection(DATA_SELECTION_ENDPOINT, {
      shape: JSON.stringify(latLngs[0].map(({ lat, lng }) => [lng, lat])),
    })

  const getMarkerGroup = async (layer: ExtendedLayer): Promise<null | void> => {
    if (!(layer instanceof Polygon)) {
      return null
    }
    try {
      const latLngs = layer.getLatLngs() as LatLng[][]
      const res = await fetchData(latLngs)

      if (markerGroupsRef.current) {
        setMarkerGroups([
          ...markerGroupsRef.current.filter(
            ({ id }: MarkerGroup) => id !== layer.id,
          ),
          {
            id: layer.id,
            markers: res.markers,
          },
        ])
      }
    } catch (e) {
      // Handle error
      // eslint-disable-next-line no-console
      console.warn(e)
    }
  }

  const editVertex = async (e: L.DrawEvents.EditVertex) => {
    await getMarkerGroup(e.poly as ExtendedLayer)
  }

  const getTotalDistance = (latLngs: LatLng[]) => {
    return latLngs.reduce(
      (total, latlng, i) => {
        if (i > 0) {
          const dist = latlng.distanceTo(latLngs[i - 1])
          return total + dist
        }
        return total
      },
      latLngs.length > 2
        ? latLngs[0].distanceTo(latLngs[latLngs.length - 1])
        : 0,
    )
  }

  const bindDistanceAndAreaToTooltip = (layer: ExtendedLayer) => {
    const latLngs = layer.getLatLngs().flat().flat()
    const distance = getTotalDistance(latLngs)

    let toolTipText: string

    if (distance >= 1000) {
      toolTipText = `${L.GeometryUtil.formattedNumber(
        `${distance / 1000}`,
        2,
      )} km`
    } else {
      toolTipText = `${L.GeometryUtil.formattedNumber(`${distance}`, 2)} m`
    }

    if (layer instanceof Polygon) {
      toolTipText = `${L.GeometryUtil.readableArea(
        L.GeometryUtil.geodesicArea(latLngs),
        true,
        {
          m: 1,
        },
      )}, ${toolTipText}`
    }
    if (toolTipText) {
      layer.bindTooltip(toolTipText, { direction: 'bottom' }).openTooltip()
    }
  }

  useEffect(() => {
    if (mapInstance) {
      // @ts-ignore
      mapInstance.on(L.Draw.Event.EDITVERTEX, editVertex)
    }

    return () => {
      if (mapInstance) {
        // @ts-ignore
        mapInstance.off(L.Draw.Event.EDITVERTEX, editVertex)
      }
    }
  }, [mapInstance])

  // The same result can be achieved for a Polyline
  const initalDrawnItems = useMemo(
    () =>
      [
        L.polygon(
          [
            [52.37000756868467, 4.894187572618143],
            [52.36638286187091, 4.893981190127323],
            [52.369541390869465, 4.89828766015057],
          ],
          {
            color: themeColor('support', 'invalid')({ theme: ascDefaultTheme }),
            bubblingMouseEvents: false,
          },
        ),
        L.polygon(
          [
            [52.37594820185194, 4.892147803888032],
            [52.37206742179071, 4.888490687556837],
            [52.373527030104974, 4.89814504712679],
          ],
          {
            color: themeColor('support', 'invalid')({ theme: ascDefaultTheme }),
            bubblingMouseEvents: false,
          },
        ),
      ] as Array<PolygonType>,
    [],
  )

  return (
    <Map setInstance={setMapInstance} fullScreen>
      {showDrawTool &&
        markerGroups.map(({ markers, id }: MarkerGroup) => (
          <MarkerClusterGroup key={id} markers={markers} />
        ))}
      <BaseLayer />
      <StyledViewerContainer
        topRight={
          <DrawTool
            onDrawEnd={async (layer: ExtendedLayer) => {
              await getMarkerGroup(layer)
              bindDistanceAndAreaToTooltip(layer)
            }}
            onDelete={(layersInEditMode: Array<ExtendedLayer>) => {
              const editLayerIds = layersInEditMode.map(({ id }) => id)

              // remove the markerGroups.
              if (markerGroupsRef.current) {
                setMarkerGroups(
                  markerGroupsRef.current.filter(
                    ({ id }: MarkerGroup) => !editLayerIds.includes(id),
                  ),
                )
              }
            }}
            isOpen={showDrawTool}
            onToggle={setShowDrawTool}
            drawnItems={hasInitialDrawings && initalDrawnItems}
          />
        }
      />
    </Map>
  )
}

export default DrawToolWithMarkerClusterGroup
