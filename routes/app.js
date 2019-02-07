

var points = [],
    output = [],
    resultsPanel = d3.select("#results"),
    currentPoint = 0,
    maxRandomPoints = 25,
    center = [37.627183862426424, 55.73485197977672];

function init () {

  // Создаем карту с добавленной на нее кнопкой.
  var map = new ymaps.Map('map', {
      center: center,
      zoom: 14.2,
      controls: []
  });

  var objectManager = new ymaps.ObjectManager({ clusterize: false });
  map.geoObjects.add(objectManager);

  var centerPoint = new ymaps.GeoObject({
            geometry: { type: "Point", coordinates: center }
        }, {
            preset: 'islands#blackDotIcon',
            draggable: true
        });
  centerPoint.events.add("dragend", function () {
    center = centerPoint.geometry.getCoordinates();
    //console.log(center);
    processLocation();
  });

  map.events.add('click', function (e) {
        var coords = e.get('coords');
        //console.log(coords);
//        centerPoint.setCoordinates
        centerPoint.geometry.setCoordinates(coords);
        center = coords;
        processLocation();
  });

  routesOverlay = new ymaps.GeoObjectCollection(null, {
    strokeColor: '#05E',
    opacity: 0.7,
    strokeWidth: 2
  });
  routesYandexOverlay = new ymaps.GeoObjectCollection(null, {
    strokeColor: '#f0a',
    opacity: 0.5,
    strokeWidth: 1.5
  });
  metroPointsOverlay = new ymaps.GeoObjectCollection(null, {
      preset: 'islands#blueStretchyIcon',
      draggable: false
  });

  map.geoObjects.add(routesOverlay);
  map.geoObjects.add(routesYandexOverlay);
  map.geoObjects.add(metroPointsOverlay);
  map.geoObjects.add(centerPoint);


  processLocation = () => {

    resultsPanel.text("");
    var url = "https://router.dev.urbica.co/api/rpc/metro_geojson?x1="+center[0]+"&y1="+center[1]+"&num_stations=10"
    routesOverlay.removeAll();
    routesYandexOverlay.removeAll();
    metroPointsOverlay.removeAll();

    points = [];

    fetch(url)
      .then(function(response) {
        if(!response.ok) { resultsPanel.text("Ошибка :( Попробуйте другую локацию"); }
        return response.json();
      })
      .then(function(json) {

        points = [];

        json.features.sort((a,b)=>a.properties.route_cost - b.properties.route_cost).forEach(f=>{
          var route = new ymaps.GeoObject({
            geometry: f.geometry,
            properties: { hintContent: "Маршрут Urbica" }
          }, { });
          routesOverlay.add(route);

          var point_geom, p1, p2;
          p1 = turf.point(f.geometry.coordinates[0]);
          p2 = turf.point(f.geometry.coordinates.slice(-1)[0]);
          point_geom = (turf.distance(turf.point(center),p1) >= turf.distance(turf.point(center),p2)) ? p1.geometry : p2.geometry
          f.properties["distance"] = turf.distance(turf.point(center),{type:"Feature", geometry: point_geom, properties: {}})
          //add points
          f.properties["id"] = points.length;

          points.push({
            type: "Feature",
            geometry: point_geom,
            properties: f.properties
          });

          //add row
          var row = resultsPanel.append("div").attr("class", "result-row");
          var urbica_time = Math.round(((Math.round(f.properties.route_cost)/1000)/4.5)*60);
          row.append("div").attr("class", "station-name").text(f.properties.name);
          row.append("div").attr("class", "time-result").attr("id", "urbica-result-"+f.properties["id"]).text(urbica_time);
          row.append("div").attr("class", "time-result").attr("id", "yandex-result-"+f.properties["id"]);
        });

      //make yandex routing
      //console.log(points);
      currentPoint = 0;
      nextPoint();
      });
  }

  nextPoint = () => {
    //console.log(points);
    if(currentPoint < points.length) {
        ymaps.route([center, points[currentPoint].geometry.coordinates], {
            mapStateAutoApply: false,
            multiRoute: true,
            routingMode: "pedestrian"
        })
        .done(function(route) {
        //  console.log(route);

        var activeRoute = route.getActiveRoute(),
            yandex_duration = activeRoute.properties.get("duration");
            yandex_time = Math.floor(yandex_duration.value/60);
            d3.select("#yandex-result-"+points[currentPoint].properties.id).text(yandex_time);
            activeRoute.getPaths().each(function(path) {
              routesYandexOverlay.add(path.getSegments());
            });

              var urbica_time = Math.round(((Math.round(points[currentPoint].properties.route_cost)/1000)/4.5)*60)
              var t = urbica_time + " / " + yandex_time;
//            add points with time
            metroPointsOverlay.add(new ymaps.GeoObject({
                      geometry: { type: "Point", coordinates: points[currentPoint].geometry.coordinates },
                      properties: { iconContent: t }
              }));
            currentPoint++;
            nextPoint();
          });
      }
  }
  //start app
  processLocation();
}
ymaps.ready(init);
