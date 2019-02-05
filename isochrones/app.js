

var points = [],
    output = [],
    outputPanel = d3.select("#results"),
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
    getIsochrone();
  });

  isocrhoneOverlay = new ymaps.GeoObjectCollection(null, {	});
  randomPointsOverlay = new ymaps.GeoObjectCollection(null, {	preset: 'islands#greyStretchyIcon' });


  map.geoObjects.add(isocrhoneOverlay);
  map.geoObjects.add(randomPointsOverlay);
  map.geoObjects.add(centerPoint);

  // var buffer = turf.buffer(turf.point(center), 1, {units: 'kilometers'});
  // console.log(buffer);
  // console.log('bbox');
  // console.log(turf.bbox(buffer));
  // var points = turf.randomPoint(100, {bbox: turf.bbox(buffer)});
  // console.log(points.features.map(p=>p.geometry.coordinates));
  //
  //

  d3.select("#requestBtn").on("click", ()=>{
    //center = centerPoint.geometry.getCoordinates();
    getIsochrone();
  });

  makePolygons = (poly) => {
    var polys = [];
    polys = poly.features[0].geometry.coordinates.map(c=>c[0]);
    return polys;
  }

  makeRandomPoints = (polys) => {
    var all = [];
    var randomPoints = [];
    polys.forEach(p=>{ p.forEach(e=> { all.push(e)}); });
    for(i=0; i<maxRandomPoints; i++) {
      randomPoints.push(all[Math.floor(Math.random()*(all.length-1))])
    }
    return randomPoints;
  }


  getIsochrone = () => {
    var time = document.getElementById("time").value;

    var url = "http://178.132.206.5/api/isochrones/?lng="+center[0]+"&lat="+center[1]+"&network=current&timeOfDay=morning&travelTime="+time
    console.log(url);

    isocrhoneOverlay.removeAll();
    randomPointsOverlay.removeAll();

    fetch(url)
      .then(function(response) {
        return response.json();
      })
      .then(function(json) {

        var polys = makePolygons(json);
        points = makeRandomPoints(polys);

        polys.forEach(p=>{
          var poly = new ymaps.GeoObject({
            // Описываем геометрию геообъекта.
            geometry: {
              type: "Polygon",
              coordinates: [p,[]]
            },
            properties: { }
          }, {
            fillColor: '#00aaff',
            strokeColor: '#0088dd',
            opacity: 0.6,
            strokeWidth: 1
          });

          isocrhoneOverlay.add(poly);

      });

      //make routing
      currentPoint = 0;
      nextPoint();

      });
  }

  nextPoint = () => {
    //console.log(points);
    if(currentPoint < points.length) {
      console.log(points[currentPoint]);
        ymaps.route([center, points[currentPoint]], {
            mapStateAutoApply: false,
            multiRoute: true,
            routingMode: "masstransit"
        }).then(function(route) {
        var activeRoute = route.getActiveRoute(),
            d = activeRoute.properties.get("duration");
            t = Math.floor(d.value/60);
            output.push({ ll: points[currentPoint], t: Math.floor(d.value/60) });

//            add points with time
            randomPointsOverlay.add(new ymaps.GeoObject({
                      // Описание геометрии.
                      geometry: { type: "Point", coordinates: points[currentPoint] },
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
        console.log("END");

      }
  }
}


//start

ymaps.ready(init);
