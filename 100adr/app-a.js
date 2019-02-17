

var points = [],
    output = [],
    resultsPanel = d3.select("#results"),
    currentPoint = 0,
    currentLocation = 0,
    locations = [],
    center = [37.627183862426424, 55.73485197977672];

function init () {

  // Создаем карту с добавленной на нее кнопкой.
  var map = new ymaps.Map('map', {
      center: center,
      zoom: 14.2,
      controls: []
  });

  var infoBlock = d3.select("#info");

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

  d3.tsv("data/100.tsv")
    .then(data=>{


      locations = data;
      nextLocation();

      data.forEach(d=>{
        d3.select("#list")
          .append("div")
          .attr("class", "item")
          .attr("id", "i-"+d.item_id)
          .append("div")
          .attr("class", "item-title")
          .text(d.address)
          .on("click", ()=>{
            getInfo(d);
          });

      })
    })

  getInfo = (item) => {
    d3.selectAll(".item-selected").attr("class", "item");
    d3.select("#i-"+item.item_id).attr("class", "item-selected");
    center = [+item.longitude,+item.latitude];
    map.setCenter(center);
    processLocation();

    infoBlock.append("div").text(item.title).style("font-weight", "bold");
    infoBlock.append("div").text(item.address).style("font-weight", "bold").style("margin-bottom", "8px");

    infoBlock.append("div").text(item.description);



  }

  processLocation = () => {
    centerPoint.geometry.setCoordinates(center);
    infoBlock.text("");
    resultsPanel.text("");
    var url = "https://router.dev.urbica.co/api/rpc/metro_geojson?x1="+center[0]+"&y1="+center[1]+"&num_stations=3"
    routesOverlay.removeAll();
    routesYandexOverlay.removeAll();
    metroPointsOverlay.removeAll();

    points = [];

    fetch(url)
      .then(function(response) {
        if(!response.ok) {
          resultsPanel.text("Ошибка :( Попробуйте другую локацию");
          currentLocation++;
          nextLocation();
       }
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
          var urbica_time = Math.round(((Math.round(f.properties.route_cost)/1000)/4.85)*60);
          row.append("div").attr("class", "station-name").text(f.properties.name);
          f.properties["urbica_time"] = urbica_time;
          row.append("div").attr("class", "time-result").attr("id", "urbica-result-"+f.properties["id"]).text(urbica_time);
          row.append("div").attr("class", "time-result").attr("id", "yandex-result-"+f.properties["id"]);
          row.append("div").attr("class", "time-result").attr("id", "diff-result-"+f.properties["id"]);
        });

      //make yandex routing
      //console.log(points);
      currentPoint = 0;
      nextPoint();
      });
  }

  nextLocation = () => {
    if(currentLocation < locations.length) {
      center = [+locations[currentLocation].longitude, +locations[currentLocation].latitude];
      processLocation();
    } else {
      //console.log("END");
    }
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
            points[currentPoint].properties["yandex_time"] = yandex_time;
            diff = points[currentPoint].properties["urbica_time"] - yandex_time;
            d3.select("#yandex-result-"+points[currentPoint].properties.id).text(yandex_time);
            d3.select("#diff-result-"+points[currentPoint].properties.id).text(diff);

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
      } else {
        points.map(p=>p.properties).forEach(point => {
          var diff = point.urbica_time-point.yandex_time;
          var c = "#000";
          if(diff>0) c = "blue";
          if(diff<0) c = "purple"
          d3.select("#i-"+locations[currentLocation].item_id).append("div")
            .attr("class", "list-time-result")
            .text(diff)
            .style("color", c)
        })
        currentLocation++;
        nextLocation();
      }
  }
  //start app
  processLocation();
}
ymaps.ready(init);
