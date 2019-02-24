mapboxgl.accessToken = 'pk.eyJ1IjoidXJiaWNhIiwiYSI6ImNpamFhZXNkOTAwMnp2bGtxOTFvMTNnNjYifQ.jUuvgnxQCuUBUpJ_k7xtkQ';
var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/mapbox/light-v9', // stylesheet location
    center: [-75.15343294154864, 39.98538128466194], // starting position [lng, lat]
    zoom: 9 // starting zoom
});

var panel = d3.select("#panel");
var locations = {
  o: [-75.11566743860915,39.99800684348918],
  d: [-75.01267061243713,39.97170096242655]
};

var app_id = 'oo8vWnUj250z0MsyBMjp', app_code = '0wlGsC5OVxjmseHa9JTyhw';


newRoute = true;

decode = (str, precision) => {
    var index = 0,
        lat = 0,
        lng = 0,
        coordinates = [],
        shift = 0,
        result = 0,
        byte = null,
        latitude_change,
        longitude_change,
        factor = Math.pow(10, precision || 6);

    // Coordinates have variable length when encoded, so just keep
    // track of whether we've hit the end of the string. In each
    // loop iteration, a single coordinate is decoded.
    while (index < str.length) {

        // Reset shift, result, and byte
        byte = null;
        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        shift = result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += latitude_change;
        lng += longitude_change;
        coordinates.push([lat / factor, lng / factor]);

    }

    return coordinates;
};

var popup = new mapboxgl.Popup({
  closeButton: false,
  closeOnClick: false
});



map.on("load", () => {
  map.addControl(new MapboxGeocoder({ accessToken: mapboxgl.accessToken }));

  map.addSource("locations", { type: "geojson",  data: { type: "FeatureCollection", features: [] }});
  map.addSource("mapbox_route", { type: "geojson",  data: { type: "FeatureCollection", features: [] }})
  map.addSource("here_route", { type: "geojson",  data: { type: "FeatureCollection", features: [] }})
  map.addSource("maxweight", { type: "geojson",  data: './data/weights.geojson'})
  map.addSource("maxheight", { type: "geojson",  data: './data/heights.geojson'})
  map.addSource("hgv_no", { type: "geojson",  data: './data/hgv_no.geojson'})


  map.addLayer({
    id: "maxweight_lines",
    source: "maxweight",
    type: "line",
    filter: ["==", ["geometry-type"], "LineString"],
    paint: {
      "line-color": "#a70",
      "line-width": 2,
      "line-opacity": 0.5
    }
  });
  map.addLayer({
    id: "maxheight_lines",
    source: "maxheight",
    type: "line",
    filter: ["==", ["geometry-type"], "LineString"],
    paint: {
      "line-color": "#98AA27",
      "line-width": 2,
      "line-opacity": 0.5
    }
  });
  map.addLayer({
    id: "hgv_no_lines",
    source: "hgv_no",
    type: "line",
    filter: ["==", ["geometry-type"], "LineString"],
    paint: {
      "line-color": "#822",
      "line-width": 2,
      "line-opacity": 0.5
    }
  });



    map.addLayer({
      id: "mapbox_route",
      source: "mapbox_route",
      type: "line",
      paint: {
        "line-color": "#09F",
        "line-width": 2,
        "line-opacity": 0.6
      }
    });

    map.addLayer({
      id: "here_route",
      source: "here_route",
      type: "line",
      paint: {
        "line-color": "#b3F",
        "line-width": 2,
        "line-opacity": 0.6
      }
    });

  map.addLayer({
    id: "maxheight_points",
    source: "maxheight",
    type: "circle",
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-color": "#349",
      "circle-radius": 3,
      "circle-opacity": 0.7
    }
  });

  map.addLayer({
    id: "hgv_no_points",
    source: "hgv_no",
    type: "circle",
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-color": "#822",
      "circle-radius": 3,
      "circle-opacity": 0.7
    }
  });

  map.addLayer({
    id: "maxweight_points",
    source: "maxweight",
    type: "circle",
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-color": "#98AA27",
      "circle-radius": 3,
      "circle-opacity": 0.7
    }
  });





  map.addLayer({
    id: "locations",
    source: "locations",
    type: "circle",
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": 5
    }
  });

  map.addLayer({
    id: "maxweight_labels",
    source: "maxweight",
    type: "symbol",
    layout: {
      "text-field": ["get", "maxweight"],
      "text-offset": [0,1],
      "text-size": [
        'interpolate',
        ['exponential', 1.15],
        ['zoom'],
        11, 10,
        18, 12
      ]
    },
    paint: {
      "text-color": "#98AA27",
      "text-opacity": [
        'interpolate',
        ['exponential', 1.15],
        ['zoom'],
        10, 0,
        11, 1
      ]
    }
  });

  map.addLayer({
    id: "maxheight_labels",
    source: "maxheight",
    type: "symbol",
    layout: {
      "text-field": ["get", "maxheight"],
      "text-offset": [0,1],
      "text-size": [
        'interpolate',
        ['exponential', 1.15],
        ['zoom'],
        11, 10,
        18, 12
      ]
    },
    paint: {
      "text-color": "#349",
      "text-opacity": [
        'interpolate',
        ['exponential', 1.15],
        ['zoom'],
        10, 0,
        11, 1
      ]
    }
  });

  map.addLayer({
    id: "hgv_no_labels",
    source: "hgv_no",
    type: "symbol",
    layout: {
      "text-field": ["get", "maxheight"],
      "text-offset": [0,1],
      "text-size": [
        'interpolate',
        ['exponential', 1.15],
        ['zoom'],
        11, 10,
        18, 12
      ]
    },
    paint: {
      "text-color": "#822",
      "text-opacity": [
        'interpolate',
        ['exponential', 1.15],
        ['zoom'],
        10, 0,
        11, 1
      ]
    }
  });

  map.on('mousemove', function(e) {
    // Change the cursor style as a UI indicator.

    var bbox = [[e.point.x - 5, e.point.y - 5], [e.point.x + 5, e.point.y + 5]];
    var features = map.queryRenderedFeatures(bbox, { layers: ['maxheight_points','maxweight_points','hgv_no_points', 'maxheight_lines','maxweight_lines','hgv_no_lines'] });
    var coordinates = [e.lngLat.lng,e.lngLat.lat];

    if(features.length>0) {
      map.getCanvas().style.cursor = 'pointer';
      var description = '<div class="params">';
      for(k in features[0].properties) {
        if(features[0].properties[k] !== "null") description += "<div class='key'>" + k + ": " + features[0].properties[k] + "</div>"
      }
      description += '</div>';

      // based on the feature found.
        popup.setLngLat(coordinates)
          .setHTML(description)
          .addTo(map);
    } else {
      map.getCanvas().style.cursor = '';
      popup.remove();
    }
  });

});

map.on("click", (e) => {
  console.log(e.lngLat);
  map.getSource("mapbox_route").setData({ type: "FeatureCollection", features: [] });
  map.getSource("here_route").setData({ type: "FeatureCollection", features: [] });
  var locationsJson = { type: "FeatureCollection", features: [] };

  if(newRoute) {
    locations.o =  [e.lngLat.lng,e.lngLat.lat];
    d3.select("#o").text("O: " + locations.o);
    d3.select("#d").text("D: ---");
    locations.d = null;
    newRoute = false;
  } else {
    locations.d = [e.lngLat.lng,e.lngLat.lat];
    d3.select("#d").text("D: " + locations.d);
    newRoute = true;
    requestRoutes();
  }
  locationsJson.features.push(turf.point(locations.o, { "color": "#b0b" }))
  if(locations.d) locationsJson.features.push(turf.point(locations.d, { "color": "#09f" }))

  map.getSource("locations").setData(locationsJson)


  //locations.push([e.lngLat.lng,e.lngLat.lat]);
  //if(locations.length>1) requestRoutes();
});

requestRoutes = () => {

  //process mapbox route
  requestJson = {
    "locations": [
        { "lat": locations.o[1], "lon": locations.o[0] },
        { "lat": locations.d[1], "lon": locations.d[0] }
      ],
    "costing": "truck",
    "costing_options": {
      "truck": {
        "height": "4.11",
        "width": "2.6",
        "length": "21.64",
        "weight": "11.79",
        "axle_load": "9.07",
        "hazmat": false
      }
    }
  }

  url = 'https://api.mapbox.com/valhalla/v1/route?json='+JSON.stringify(requestJson)+'&access_token='+mapboxgl.accessToken;
  fetch(url)
    .then(function(response) {
      return response.json();
    })
    .then(function(json) {
      var mroute = turf.featureCollection([]);
      json.trip.legs.forEach(l=>{
        mroute.features.push(turf.lineString(decode(l.shape).map(s=>[s[1],s[0]])))
      });
      map.getSource("mapbox_route").setData(mroute);
   });

   //limitedWeight=21.77&height=4.11
   //process here route
   var here_url = 'https://route.api.here.com/routing/7.2/calculateroute.json?app_id='+app_id+'&app_code='+app_code+'&waypoint0=geo!'+locations.o[1]+','+locations.o[0]+'&waypoint1=geo!'+locations.d[1]+','+locations.d[0]+'&mode=fastest;truck;traffic:disabled&limitedWeight=11.79&height=4.11&shippedHazardousGoods=harmfulToWater&routeAttributes=waypoints,shape'

   fetch(here_url)
     .then(function(response) {
       return response.json();
     })
     .then(function(json) {

       var hroute = turf.featureCollection([]);
       //console.log(json.response.route);
       json.response.route.forEach(r=>{
         hroute.features.push(turf.lineString(r.shape.map(s=>[+s.split(",")[1],+s.split(",")[0]])));
       });
       //console.log(hroute);
       map.getSource("here_route").setData(hroute);
    });

}
