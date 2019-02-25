var q = function(item) {
  var svalue = location.search.match(
    new RegExp("[?&]" + item + "=([^&]*)(&?)", "i")
  );
  return svalue ? svalue[1] : svalue;
};

//main configuration
c = {
  orign: q("orign") ? [+q("orign").split(",")[0],+q("orign").split(",")[1]] : [-75.18368555231567,40.01231780433909],
  destination: q("destination") ? [+q("destination").split(",")[0],+q("destination").split(",")[1]] : [-75.12775501525252,40.025288504863425],
  center: q("center") ? [+q("center").split(",")[0],+q("center").split(",")[1]] : [-75.17826974331649,40.012921147425146], //galton's starting point && center of the map on start
  zoom: q("zoom") ? q("zoom") : 11,
  height: q("height") ? q("height") : 4.11,
  weight: q("weight") ? q("weight") : 11.79
};

function updateURLParams() {
  var u = "./?",
    t;
  for (i in c) {
    u += "&" + i + "=" + c[i];
  }
  window.history.pushState(null, "Galton", u);
}

//set params in form
d3.select("#maxweight").attr("value", c.weight);
d3.select("#maxheight").attr("value", c.height);

updateURLParams();

console.log("c");
console.log(c);

mapboxgl.accessToken = 'pk.eyJ1IjoidXJiaWNhIiwiYSI6ImNpamFhZXNkOTAwMnp2bGtxOTFvMTNnNjYifQ.jUuvgnxQCuUBUpJ_k7xtkQ';
var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/mapbox/light-v9', // stylesheet location
    center: c.center, // starting position [lng, lat]
    zoom: c.zoom // starting zoom
});


var panel = d3.select("#panel");


var colors = {
  maxheight: "#3751D5",
  hgv_no: "#B43434",
  maxweight: "#45A86E"
}

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

requestRoutes = () => {

  var maxweight = d3.select("#maxweight").property("value");
  var maxheight = d3.select("#maxheight").property("value");
  c.height = maxweight;
  c.weight = maxheight;
  updateURLParams();

  //process mapbox route
  requestJson = {
    "locations": [
        { "lat": c.orign[1], "lon": c.orign[0] },
        { "lat": c.destination[1], "lon": c.destination[0] }
      ],
    "costing": "truck",
    "costing_options": {
      "truck": {
        "height": maxheight,
        "width": "2.6",
        "length": "21.64",
        "weight": maxweight,
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
   var here_url = 'https://route.api.here.com/routing/7.2/calculateroute.json?app_id='+app_id+'&app_code='+app_code+'&waypoint0=geo!'+c.orign[1]+','+c.orign[0]+'&waypoint1=geo!'+c.destination[1]+','+c.destination[0]+'&mode=fastest;truck;traffic:disabled&limitedWeight='+maxweight+'&height='+maxheight+'&shippedHazardousGoods=harmfulToWater&routeAttributes=waypoints,shape'

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


map.on("load", () => {
  map.addControl(new MapboxGeocoder({ accessToken: mapboxgl.accessToken }));

  map.addSource("locations", { type: "geojson",  data: { type: "FeatureCollection", features: [] }});
  map.addSource("mapbox_route", { type: "geojson",  data: { type: "FeatureCollection", features: [] }})
  map.addSource("here_route", { type: "geojson",  data: { type: "FeatureCollection", features: [] }})
  map.addSource("maxweight", { type: "geojson",  data: './data/weights.geojson'})
  map.addSource("maxheight", { type: "geojson",  data: './data/heights.geojson'})
  map.addSource("hgv_no", { type: "geojson",  data: './data/hgv_no.geojson'})


  if(c.orign && c.destination) {
    var locationsJson = turf.featureCollection([]);
    locationsJson.features.push(turf.point(c.orign, { "color": "#b0b" }))
    locationsJson.features.push(turf.point(c.destination, { "color": "#09f" }));
    console.log(map.getSource("locations"));
    map.getSource("locations").setData(locationsJson);
    requestRoutes();
  }


  map.addLayer({
    id: "maxweight_lines",
    source: "maxweight",
    type: "line",
    filter: ["==", ["geometry-type"], "LineString"],
    paint: {
      "line-color": colors.maxweight,
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
      "line-color": colors.maxheight,
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
      "line-color": colors.hgv_no,
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
      "circle-color": colors.maxheight,
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
      "circle-color": colors.hgv_no,
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
      "circle-color": colors.maxweight,
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
      "text-color": colors.maxweight,
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
      "text-color": colors.maxheight,
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
      "text-color": colors.hgv_no,
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

map.on("dragend", ()=>{
  var cr = map.getCenter();
  c.center = [cr.lng,cr.lat];
  c.zoom = map.getZoom();
  updateURLParams();
});

map.on("zoomend", ()=>{
  var cr = map.getCenter();
  c.center = [cr.lng,cr.lat];
  c.zoom = map.getZoom();
  updateURLParams();
});



map.on("click", (e) => {
  map.getSource("mapbox_route").setData({ type: "FeatureCollection", features: [] });
  map.getSource("here_route").setData({ type: "FeatureCollection", features: [] });
  var locationsJson = { type: "FeatureCollection", features: [] };

  if(newRoute) {
    c.orign =  [e.lngLat.lng,e.lngLat.lat];
    d3.select("#o").text("O: " + c.orign);
    d3.select("#d").text("D: ---");
    c.destination = null;
    updateURLParams();
    newRoute = false;
  } else {
    c.destination = [e.lngLat.lng,e.lngLat.lat];
    d3.select("#d").text("D: " + c.destination);
    newRoute = true;
    updateURLParams();
    requestRoutes();
  }
  locationsJson.features.push(turf.point(c.orign, { "color": "#b0b" }))
  if(c.destination) locationsJson.features.push(turf.point(c.destination, { "color": "#09f" }));

  map.getSource("locations").setData(locationsJson)


});
