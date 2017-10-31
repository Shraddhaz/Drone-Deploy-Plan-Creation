/**
 * The JSONConverter class implements functions that converts the input file (.shp/.kml/.zip)
 * to geojson and then extracts the coordinates from the geojson file.
 */
class JSONConverter{

    /**
     * getCoordFromPoint() extacts the coordinates obtained from
     * the geojson file for the type: 'Point'
     * @param jsonFile is the user's input file converted to json format
     * @return array of coordinates extracted from the json file of type: 'Point'
     * */
    static getCoordFromPoint(jsonFile){
        var arr = jsonFile.coordinates;
        return [{lat: arr[1], lng:arr[0]}];

    }

    /**
     * getCoordFromLineString() extracts the coordinates obtained from
     * the geojson file for the type: 'LineString'
     * @param jsonFile is the user's input file converted to json format
     * @return array of coordinates extracted from the json file of type: 'LineString'
     * */
    static getCoordFromLineString(jsonFile){
        return JSONConverter.getCoordinates(jsonFile.coordinates);
    }

    /**
     * getCoordFromPolygon() extracts the coordinates from the geojson file for the type: 'Polygon'
     * @param jsonFile is the input file converted to json format
     * @return array of coordinates extracted from the json file for type: 'Polygon'
     * */
    static getCoordFromPolygon(jsonFile){
        var coordArray = JSONConverter.getCoordinates(jsonFile.coordinates[0]);
        var arr = [coordArray[0].lng, coordArray[0].lat];
        var endCoord = {lat: arr[1], lng:arr[0]};
        coordArray.push(endCoord);
        return coordArray;
    }

    /**
     * getCoordFromGeometryCollection() extracts the coordinates the converted
     * geojson file obtained from user's input for the type: 'FeatureCollection'
     * @param jsonFile is the input file converted to json format
     * @return array of coordinates extracted from the json file of type: 'GeometryCollection'
     * */
    static getCoordFromGeometryCollection(jsonFile){
        var coordArray = [];
        if(jsonFile.geometries.length === 0){
            throw new Error("Geometry Collection Empty in file");
        }
        jsonFile.geometries.forEach(function(geometry){
            JSONConverter.getCoordinatesFromJson(geometry).forEach(function (coordinate) {
                coordArray.push(coordinate);
            });
        })
        return coordArray;
    }

    /**
     * getCoordFromFeatureCollection() extracts the coordinates the converted
     * geojson file obtained from user's input for the type: 'FeatureCollection'
     * @param jsonFile is the input file converted to json format
     * @return array of coordinates extracted from the json file of type: 'FeatureCollection'
     * */
    static getCoordFromFeatureCollection(jsonFile) {
        var coordArray = [];
        if(jsonFile.features.length === 0){
            throw new Error("Feature Collection empty in file");
        }
        jsonFile.features.forEach(function (features) {
            JSONConverter.getCoordinatesFromJson(features.geometry).forEach(function (coordinates) {
                coordArray.push(coordinates);
            })
        });
        return coordArray;
    }


    /**
     * getCoordinates() extracts the coordinates from a given array,
     * creates an object array having the latitute and longitude
     * and returns this array
     * @param arr is the array of coordinates with object{long, lat}
     * @return coordArray is the array of coordinates with object{lat,long}
     * */
    static getCoordinates(arr) {
        var coordArray = [];
        arr.forEach(function(currentCoordinate){
            var coordObject = {lat: currentCoordinate[1], lng:currentCoordinate[0]};
            coordArray.push(coordObject);
        });
        return coordArray;
    }

    /**
     * convertFileToJson() is the switch case implementation to convert the
     * user's input file to geojson depending of the file type
     * @param buffer is the input file read as arrayBuffer/textFile
     * @param fileExtension is the extension of the file uploaded by user
     * @return gejson file converted from the user's input file
     * */
    static convertFileToJson(buffer, fileExtension) {
        switch (fileExtension){
            //https://github.com/calvinmetcalf/shapefile-js/issues/43
            case 'shp':
                var out = shp.combine([shp.parseShp(buffer), []]);
                return out;
                break;

            //https://github.com/mapbox/togeojson
            case 'kml':
                var parser = new DOMParser();
                var xmlDoc = parser.parseFromString(buffer,"text/xml");
                var geojson = toGeoJSON.kml(xmlDoc);
                return geojson;
                break;

            //https://github.com/calvinmetcalf/shapefile-js
            case 'zip':
                return shp.parseZip(buffer);
                break;
            default:
                throw new "Invalid file extension found. Upload .shp, .kml or .zip files. ";
        }
    }

    /**
     * getCoordinatesFromJson() is the switch case implementation to call the appropriate function
     * depending on the json file's type
     * @param jsonFile is the user's input file converted to json format
     * @return array of coordinates obtained from the jsonFile
     * */
    static getCoordinatesFromJson(jsonFile) {
        var coord = [];
        switch(jsonFile.type) {
            case 'Point':  //Same for type 'Multipoint'
                coord = JSONConverter.getCoordFromPoint(jsonFile);
                break;
            case 'LineString': //Same for type 'MultiLineString'
                coord = JSONConverter.getCoordFromLineString(jsonFile);
                break;
            case 'Polygon':
                coord = JSONConverter.getCoordFromPolygon(jsonFile);
                break;
            case 'GeometryCollection':
                coord = JSONConverter.getCoordFromGeometryCollection(jsonFile);
                break;
            case 'FeatureCollection':  //Covers type Feature too
                coord = JSONConverter.getCoordFromFeatureCollection(jsonFile);
                break;
            default:
                throw new Error("Corrupted SHP/KML/ZIP file");
        }
        return coord;
    }

}


/**
 * The main function that is called when the application is initialized.
 * It does all the computation i.e. creates the drone plan from the user's uploaded file
 * */
$('document').ready(function() {

    var uploader = document.getElementById('input_file');
    var coord_array, json;

    //Initializes the DroneDeploy() object
    new DroneDeploy({version: 1}).then(function (dronedeployApi) {

        //Function is called when the input is given by the user i.e when the file is uploaded
        $("#input_file").on('change', function (e) {

            //If the input is of the type file, the given function is executed
            if (uploader.files) {

                //'file' is the uploaded user's file
                file = uploader.files[0];

                //Uploaded file's extension is extracted by the split()
                var fileExtension = file.name.split('.').pop().toLowerCase();

                //FileReader is initialized
                var fileReader = new FileReader();

                //If the file is of the type .kml, then it is read as a text else read as array buffer
                if (fileExtension !== "kml")
                    fileReader.readAsArrayBuffer(file);
                else
                    fileReader.readAsText(file);

                //Called after the fileReader reads the file (as text or array buffer)
                fileReader.onload = function () {
                    //Try-catch block for error handling during the conversion and extraction
                    try {
                        //Converts's the user's input file to json file type
                        json = JSONConverter.convertFileToJson(fileReader.result, fileExtension);

                        //Extracts array of coordinates from the json file
                        coord_array = JSONConverter.getCoordinatesFromJson(json);

                        if(coord_array !== null) {
                            var options = {name: 'New Plan', geometry: coord_array};

                            //Gets the curent plan of the Drone Deploy user
                            dronedeployApi.Plans.getCurrentlyViewed()
                                .then(function (planId) {
                                    //For that plan id, updates the coordinates for the flight plan
                                    dronedeployApi.Plans.update(planId.id, options);
                                });
                            }
                        else {
                            throw new Error("Obtained co-ordinates array is empty.");
                        }
                    }
                    //Displays the error to user
                    catch (e) {
                        dronedeployApi.Messaging.showToast(e.message);
                    }
                }
            };
        });
    });
});
