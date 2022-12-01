import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
  useMemo,
} from "react";
import "./Map.css";
import { useGeoSearch } from "./useGeoSearch";
import MapGL, {
  FullscreenControl,
  GeolocateControl,
  MapRef,
  Marker,
  NavigationControl,
} from "react-map-gl";
import { LngLatBounds } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { AppContext } from "./App";
import { GBPObject } from "./schema";
import { useSearchBox } from "react-instantsearch-hooks-web";

const mapboxToken =
  "pk.eyJ1Ijoiam9lcGlvIiwiYSI6ImNqbTIzanZ1bjBkanQza211anFxbWNiM3IifQ.2iBrlCLHaXU79_tY9SVpXA";

export const mapStartState = {
  latitude: 52.0907,
  longitude: 5.1213,
  zoom: 11,
};

export const startBoundsInstant = {
  northEast: { lng: 5.2739270893989385, lat: 52.173599476147416 },
  southWest: { lng: 4.975922939008171, lat: 52.013504913663525 },
};

export const startBounds = new LngLatBounds(
  startBoundsInstant.northEast,
  startBoundsInstant.southWest
);

export function Map() {
  const { items, refine } = useGeoSearch();
  const { query } = useSearchBox();
  const { setCurrent, current } = useContext(AppContext);
  const mapRef = useRef<MapRef>();
  const [viewState, setViewState] = React.useState(mapStartState);
  const [prisine, setPristine] = useState(true);

  // If user changed the query, move the bounds to the new items
  useEffect(() => {
    if (!prisine || !mapRef.current) {
      return;
    }
    // Don't set the bounds if there are no items
    if (items.length == 0) {
      return;
    }
    const center = mapRef.current.getMap().getBounds().getCenter();
    let lowLat = center.lat;
    let highLat = center.lat;
    let lowLng = center.lng;
    let highLng = center.lng;
    items.forEach((item, i) => {
      let lat0, lat1, lng0, lng1;
      if (item.geo_bbox) {
        console.info(`bounds from geo_bbox: ${JSON.stringify(item.geo_bbox)}`);
        lat0 = Math.min(item.geo_bbox[0].lat, item.geo_bbox[1].lat);
        lat1 = Math.max(item.geo_bbox[0].lat, item.geo_bbox[1].lat);
        lng0 = Math.min(item.geo_bbox[0].lng, item.geo_bbox[1].lng);
        lng1 = Math.max(item.geo_bbox[0].lng, item.geo_bbox[1].lng);
      } else {
        const { lat, lng } = item._geoloc;
        lat0 = lat;
        lat1 = lat;
        lng0 = lng;
        lng1 = lng
      }
      if (i == 0) {
        lowLat = lat0;
        highLat = lat1;
        lowLng = lng0;
        highLng = lng1;
      } else {
        // For some reason the extend method doesn't work, so we do it manually
        // bounds.extend(item._geoloc);
        if (lat0 < lowLat) {
          lowLat = lat0;
        }
        if (lat1 > highLat) {
          highLat = lat1;
        }
        if (lng0 < lowLng) {
          lowLng = lng0;
        }
        if (lng1 > highLng) {
          highLng = lng1;
        }
      }
    });
    let bounds = new LngLatBounds(
      { lat: highLat, lng: highLng },
      { lat: lowLat, lng: lowLng }
    );
    console.log("bounds", bounds);

    mapRef.current?.fitBounds(bounds, {
      padding: 250,
    });
  }, [prisine, query]);

  // If the user moves the map, update the query to filter current area
  const updateBoundsQuery = useCallback((evt) => {
    if (!evt.originalEvent) {
      return;
    }
    const bounds = mapRef.current.getMap().getBounds();
    console.log("bounds", bounds);
    refine({
      northEast: bounds.getNorthEast(),
      southWest: bounds.getSouthWest(),
    });
    setViewState(evt.viewState);
  }, []);

  // Memoize markers to prevent rerendering
  const markers = useMemo(
    () =>
      items.map((item) => {
        const isCurrent = item.id == current?.id;
        return (
          <Marker
            onClick={() => setCurrent(item as unknown as GBPObject)}
            longitude={item._geoloc.lng}
            latitude={item._geoloc.lat}
            anchor="bottom"
            // We need this key to make sure the content re-renders, for some reason color changes don't trigger an update
            key={`${item.id} ${isCurrent}`}
            color={isCurrent ? "#000000" : "#FF0000"}
            style={{
              zIndex: isCurrent ? 1 : 0,
            }}
          ></Marker>
        );
      }),
    [items, current]
  );

  return (
    <MapGL
      id="mainMap"
      initialViewState={viewState}
      mapboxAccessToken={mapboxToken}
      // maxBounds={startBounds}
      onMoveEnd={updateBoundsQuery}
      style={{ width: "100%", height: "100%", flexBasis: "600px", flex: 1 }}
      mapStyle="mapbox://styles/mapbox/streets-v9"
      ref={mapRef}
      attributionControl={false}
    >
      <NavigationControl position={"bottom-right"} />
      <GeolocateControl position={"bottom-left"} />
      {markers}
    </MapGL>
  );
}