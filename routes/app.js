

var points = [],
    output = [],
    resultsPanel = d3.select("#results"),
    currentPoint = 0,
    maxRandomPoints = 25,
    center = [37.628118,55.740905];

function init () {

  // Создаем карту с добавленной на нее кнопкой.
  var map = new ymaps.Map('map', {
      center: center,
      zoom: 12,
      controls: []
  });

  var objectManager = new ymaps.ObjectManager({ clusterize: false });
  map.geoObjects.add(objectManager);

  var centerPoint = new ymaps.GeoObject({
            geometry: { type: "Point", coordinates: [37.628118,55.740905,37.628118,55.740905] }
        }, {
            preset: 'islands#blackDotIcon',
            draggable: true
        });
  centerPoint.events.add("dragend", function () {
    center = centerPoint.geometry.getCoordinates();
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

  routesOverlay = new ymaps.GeoObjectCollection(null, {	});
  routesYandexOverlay = new ymaps.GeoObjectCollection(null, {	});
  metroPointsOverlay = new ymaps.GeoObjectCollection(null, {	preset: 'islands#greyStretchyIcon' });



  map.geoObjects.add(routesOverlay);
  map.geoObjects.add(routesYandexOverlay);
  map.geoObjects.add(metroPointsOverlay);
  map.geoObjects.add(centerPoint);

  d3.select("#requestBtn").on("click", ()=>{
    //center = centerPoint.geometry.getCoordinates();
    processLocation();
  });

processLocation = () => {

    resultsPanel.text("");

    var url = "http://dev.urbica.co:35004/api/rpc/metro_geojson?x1="+center[0]+"&y1="+center[1]+"&num_stations=5"

    routesOverlay.removeAll();
    routesYandexOverlay.removeAll();
    metroPointsOverlay.removeAll();

    points = [];

    fetch(url)
      .then(function(response) {
        return response.json();
      })
      .then(function(json) {

        points = [];
        json.features.forEach(f=>{
          var route = new ymaps.GeoObject({
            geometry: f.geometry,
            properties: { hintContent: "Маршрут Urbica" }
          }, {
            strokeColor: '#a0a',
            opacity: 0.6,
            strokeWidth: 2
          });
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
        }).then(function(route) {

        var activeRoute = route.getActiveRoute(),
            yandex_duration = activeRoute.properties.get("duration");

            yandex_time = Math.floor(yandex_duration.value/60);
            d3.select("#yandex-result-"+points[currentPoint].properties.id).text(yandex_time);
//            output.push({ ll: points[currentPoint], t: Math.floor(yandex_duration.value/60) });
            var paths = activeRoute.getPaths();


            // paths.each(function(path) {
            //     path.options.set({
            //         //  В балуне выводим только информацию о времени движения с учетом пробок.
            //         balloonContentLayout: ymaps.templateLayoutFactory.createClass('{{ properties.humanJamsTime }}'),
            //         // Можно выставить настройки графики маршруту.
            //         strokeColor: '#0000DD',
            //         strokeWidth: 2,
            //         opacity: 0.5
            //       });
            //     routesYandexOverlay.add(path);
            // });
            var urbica_time = Math.round(((Math.round(points[currentPoint].properties.route_cost)/1000)/4.5)*60)
            var t = urbica_time + " / " + yandex_time;
//            add points with time
            metroPointsOverlay.add(new ymaps.GeoObject({
                      // Описание геометрии.
                      geometry: { type: "Point", coordinates: points[currentPoint].geometry.coordinates },
                      // Свойства.
                      properties: {
                          // Контент метки.
                          iconContent: t
                    }
                  }, {
                      preset: 'islands#blueStretchyIcon',
                      draggable: false
            }));

            currentPoint++;
            nextPoint();
          });
      } else {
        //console.log("END");


      }
  }
}


//start

ymaps.ready(init);
