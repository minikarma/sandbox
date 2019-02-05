

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



  makeRandomPoints = (geojson) => {

    var all = geojson.features.map(f=>{ return { id: f.properties.id, ll: [f.properties.lon,f.properties.lat] } });
    var randomPoints = [];
    //polys.forEach(p=>{ p.forEach(e=> { all.push(e)}); });
    for(i=0; i<maxRandomPoints; i++) {
      randomPoints.push(all[Math.floor(Math.random()*(all.length-1))])
    }
    console.log(randomPoints);
    return all;
  }


  getIsochrone = () => {
    var time = document.getElementById("time").value;


    isocrhoneOverlay.removeAll();
    randomPointsOverlay.removeAll();

    fetch("./data/grid_500_karma.geojson")
      .then(function(response) {
        return response.json();
      })
      .then(function(json) {

        points = makeRandomPoints(json);
        console.log('random');
        json.features.forEach(p=>{
          var poly = new ymaps.GeoObject({
            // Описываем геометрию геообъекта.
            geometry: {
              type: "Polygon",
              coordinates: [p.geometry.coordinates,[]]
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
      currentPoint = 1093;
      console.log(points);
      nextPoint();



      });
  }

  nextPoint = () => {
    if(currentPoint < points.length) {
        ymaps.route([center, points[currentPoint].ll], {
            mapStateAutoApply: false,
            multiRoute: true,
            routingMode: "masstransit"
        }).then(function(route) {
        var activeRoute = route.getActiveRoute(),
            d = activeRoute.properties.get("duration");
            t = Math.floor(d.value/60);
            output.push({ ll: points[currentPoint], t: Math.floor(d.value/60) });
            console.log(currentPoint+"/"+points.length,points[currentPoint].id,Math.floor(d.value/60));

            outputPanel.append("div").text(points[currentPoint].id + "," + Math.floor(d.value/60));

            //add points with time
            // randomPointsOverlay.add(new ymaps.GeoObject({
            //           // Описание геометрии.
            //           geometry: { type: "Point", coordinates: points[currentPoint].ll },
            //           // Свойства.
            //           properties: {
            //               // Контент метки.
            //               iconContent: t
            //           }
            //       }, {
            //           preset: 'islands#blueStretchyIcon',
            //           draggable: false
            // }));


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
