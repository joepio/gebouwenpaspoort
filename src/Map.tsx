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
  GeolocateControl,
  Layer,
  MapRef,
  Marker,
  NavigationControl,
  Source,
  SymbolLayer,
} from "react-map-gl";
import { LngLatBounds } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { AppContext } from "./App";
import { GBPObject, GBPObjectTypes } from "./schema";
import { useSearchBox } from "react-instantsearch-hooks-web";
import { Header } from "./Header";
import Mapbox from "react-map-gl/dist/esm/mapbox/mapbox";
import marker from "./assets/marker.svg";
import CustomIcons from "./Icons";

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

const recalcBounds = (mapRef, items) => {
  () => {
    if (!mapRef.current) {
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
        //console.info(`bounds from geo_bbox for ${JSON.stringify(item['bag-object-type'])} ${JSON.stringify(item.naam)}: ${JSON.stringify(item.geo_bbox)}`);
        lat0 = Math.min(item.geo_bbox[0].lat, item.geo_bbox[1].lat);
        lat1 = Math.max(item.geo_bbox[0].lat, item.geo_bbox[1].lat);
        lng0 = Math.min(item.geo_bbox[0].lng, item.geo_bbox[1].lng);
        lng1 = Math.max(item.geo_bbox[0].lng, item.geo_bbox[1].lng);
      } else {
        const { lat, lng } = item._geoloc;
        lat0 = lat;
        lat1 = lat;
        lng0 = lng;
        lng1 = lng;
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
    // if any is nan, don't do anything
    if (isNaN(lowLat) || isNaN(highLat) || isNaN(lowLng) || isNaN(highLng)) {
      console.warn("bounds are NaN, not setting bounds");
      return;
    }
    let bounds = new LngLatBounds(
      { lat: highLat, lng: highLng },
      { lat: lowLat, lng: lowLng }
    );
    mapRef.current?.fitBounds(bounds, {
      padding: 250,
    });
  };
};

export function Map() {
  const { items, refine } = useGeoSearch();
  const { query } = useSearchBox();
  const {
    setCurrent,
    current,
    showFilter,
    showResults,
    locationFilter,
    setLocationFilter,
    setShowFilter,
    setShowResults,
  } = useContext(AppContext);
  const mapRef = useRef<MapRef>();
  const [viewState, setViewState] = React.useState(mapStartState);

  // initialize map
  // Load marker icon
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map) {
      CustomIcons.forEach((icon) => {
        const customIcon = new Image(24, 24);
        customIcon.onload = () => map.addImage(icon.name, customIcon)
        customIcon.src = icon.src;
      });
    }
  }, [mapRef.current]);

  // if the users toggles the sidebars, resize the map
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.getMap().resize();
    }
  }, [current, showFilter, showResults]);

  // If user changed the query, move the bounds to the new items
  useEffect(() => recalcBounds(mapRef, items), [query]);

  // If the user moves the map, update the query to filter current area
  const updateBoundsQuery = useCallback((evt) => {
    if (!evt.originalEvent) {
      return;
    }
    const bounds = mapRef.current.getMap().getBounds();
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
        const handleClick = () => {
          setCurrent(item as unknown as GBPObject);
        };
        return (
          <Marker
            onClick={handleClick}
            longitude={item._geoloc.lng}
            latitude={item._geoloc.lat}
            anchor="bottom"
            // We need this key to make sure the content re-renders, for some reason color changes don't trigger an update
            key={`${item.id} ${isCurrent}`}
            color={
              isCurrent
                ? "#000000"
                : GBPObjectTypes["" + item["bag-object-type"]].color
            }
            style={{
              zIndex: isCurrent ? 1 : 0,
            }}
            scale={isCurrent ? 0.8 : 0.6}
          ></Marker>
        );
      }),
    [items, current]
  );

  const data: GeoJSON.FeatureCollection<GeoJSON.Geometry> = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: items.map((item) => {
        const isCurrent = item.id == current?.id;
        const handleClick = () => {
          setCurrent(item as unknown as GBPObject);
        };

        return {
          type: "Feature",
          onClick: { handleClick },
          geometry: {
            type: "Point",
            coordinates: [item._geoloc.lng, item._geoloc.lat],
          },
          properties: {
            id: item.id,
            type: item["bag-object-type"],
            color: isCurrent
              ? "#000000"
              : GBPObjectTypes["" + item["bag-object-type"]].color,
            title: item["naam"],
          },
        };
      }),
    };
  }, [items]);

  const handleMapClick = useCallback(
    (evt: mapboxgl.MapLayerMouseEvent) => {
      if (evt.features) {
        console.log("features", evt.features[0]);
      } else {
        console.log("no feautres", evt);
      }
    },
    [items]
  );

  return (
    <div className="Map__wrapper">
      {!showFilter && (
        <button
          className="header--button header--button-left"
          onClick={() => setShowFilter(!showFilter)}
        >
          Filters
        </button>
      )}
      {!showResults && (
        <button
          className="header--button header--button-right"
          onClick={() => setShowResults(!showResults)}
        >
          Resultaten
        </button>
      )}
      <Header />
      <MapGL
        trackResize={true}
        id="mainMap"
        initialViewState={viewState}
        mapboxAccessToken={mapboxToken}
        // maxBounds={startBounds}
        onClick={handleMapClick}
        onMoveEnd={updateBoundsQuery}
        style={{ width: "100%", height: "100%", flexBasis: "600px", flex: 1 }}
        mapStyle="mapbox://styles/mapbox/streets-v9"
        ref={mapRef}
        attributionControl={false}
      >
        <NavigationControl position={"bottom-right"} />
        <GeolocateControl position={"bottom-left"} />
        <Source type="geojson" data={data}>
          <Layer {...dataLayer} />
        </Source>
        {/* {markers} */}
      </MapGL>
    </div>
  );
}

// For more information on data-driven styles, see https://www.mapbox.com/help/gl-dds-ref/
export const dataLayer: SymbolLayer = {
  id: "points",
  type: "symbol",
  source: "points",
  layout: {
    // get the title name and icon from the source's properties
    "icon-image": ["get", "type"],
    "text-field": ["get", "title"],
    // "text-color": ["get", "color"],
    "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
    // "text-offset": [0, 1.25],
    "text-anchor": "top",
    "icon-padding": 1,
    "icon-size": 0.5,
  },
};
