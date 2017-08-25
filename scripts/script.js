var iitsApp = {};
iitsApp.pageIndex = 0;
iitsApp.inputLng = 0;
iitsApp.inputLat = 0;
iitsApp.inputLoc = '';
iitsApp.passes = [];
iitsApp.passWeather = [];
iitsApp.sunRiseSet = {};


//needs to be its own function for *reasons* (runs when the google maps JS api is loaded, won't work if run at later time)
iitsApp.initGoogleMaps = function() {
  // Create the autocomplete object, restricting the search to geographical
  // location types.
  iitsApp.autocomplete = new google.maps.places.Autocomplete(
      /** @type {!HTMLInputElement} */(document.getElementById('autocomplete')),
      {types: ['(cities)']});
  //create a geocoder object 
  iitsApp.geocoder =  new google.maps.Geocoder();
  // When the user selects an address from the dropdown  
  iitsApp.autocomplete.addListener('place_changed', iitsApp.cleanStart);
  
}
//ripped from the google example code 
// Bias the autocomplete object to the user's geographical location,
// as supplied by the browser's 'navigator.geolocation' object.
iitsApp.geolocate = function() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var geolocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      var circle = new google.maps.Circle({
        center: geolocation,
        radius: position.coords.accuracy
      });
      iitsApp.autocomplete.setBounds(circle.getBounds());
    });
  }
}
iitsApp.cleanStart = function(){
	iitsApp.pageIndex = 0;
	iitsApp.inputLat = 0;
	iitsApp.inputLng = 0;
	iitsApp.inputLoc = '';
	iitsApp.passes = [];
	iitsApp.passWeather = [];
	iitsApp.sunRiseSet = {};

	iitsApp.getLocation();
}
iitsApp.getLocation = function() {
	console.log('getLocation GO');
	// Get the place details from the autocomplete object.
	var place = iitsApp.autocomplete.getPlace();
	console.log(place);
	if(place.formatted_address != null){
		iitsApp.inputLat = place.geometry.location.lat();
		iitsApp.inputLng = place.geometry.location.lng();
		iitsApp.inputLoc = place.formatted_address
		iitsApp.getPass()
	}else{
		iitsApp.geocoder.geocode({ 'address': place.name}, function(results, status) {
			if (status == 'OK') {
				$('#autocomplete').val(results[0].formatted_address);
				console.log(results);
				iitsApp.inputLat = results[0].geometry.location.lat();
				iitsApp.inputLng = results[0].geometry.location.lng();
				iitsApp.inputLoc = results[0].formatted_address;
				iitsApp.getPass();
			}else{
				console.log('Geocode was not successful for the following reason: ' + status);
			}
		});
	}
}
iitsApp.getPass = function(){
	console.log("getPass GO");
	$.ajax({
	  url : `http://api.open-notify.org/iss-pass.json`,
	  dataType : 'jsonp',
	  method: 'GET',
	  data: {
  	"lat": iitsApp.inputLat,
    "lon": iitsApp.inputLng,
    "n":25
	  }
	}).then(function(res){
		iitsApp.parseDate(res)
	}).fail(function(error){
		console.log('error',error);
	});
}
iitsApp.parseDate = function(issRes){
	console.log(issRes);
	iitsApp.passes = issRes.response;
	console.log(iitsApp.passes);
	iitsApp.getSunRiseSet();
}
iitsApp.getSunRiseSet = function(){
	console.log('getSunRiseSet GO');
	let date = iitsApp.passes[0].risetime;
	console.log('weatherAPI call');
	$.ajax({
		url: `https://api.darksky.net/forecast/122583d9670d1bda0d310f91a9c4c870/${iitsApp.inputLat},${iitsApp.inputLng},${date}`,
		dataType : 'jsonp',
	  method: 'GET',
	}).then(function(res){
		console.log(res);
		iitsApp.sunRiseSet.sunrise = res.daily.data[0].sunriseTime;
		iitsApp.sunRiseSet.sunset = res.daily.data[0].sunsetTime;
	}).fail(function(error){
		alert('weather API call failed', error);
	});

}
iitsApp.getWeather = function(){
	console.log('getWeather GO');
	let date = iitsApp.passes[iitsApp.pageIndex].risetime;
	if (iitsApp.passWeather[iitsApp.pageIndex] === undefined) {
		console.log('weatherAPI call');
		$.ajax({
			url: `https://api.darksky.net/forecast/122583d9670d1bda0d310f91a9c4c870/${iitsApp.inputLat},${iitsApp.inputLng},${date}`,
			dataType : 'jsonp',
		  method: 'GET',
		}).then(function(res){
			console.log(res);
			iitsApp.parseWeather(res)
		}).fail(function(error){

		});
	}else{
		iitsApp.displayResults();
	}
}
iitsApp.parseWeather = function(weatherData){
	let weatherSumm = weatherData.currently.summary
	let cloudCover = weatherData.currently.cloudCover
	let date = weatherData.currently.time;
	let sunrise = weatherData.daily.data[0].sunriseTime;
	let sunset = weatherData.daily.data[0].sunsetTime;
	let timezone = weatherData.timezone
	let night = false;
	if(date < sunrise || date > sunset){
		night = true;
	};
	iitsApp.passWeather[iitsApp.pageIndex] = {
		summary: weatherSumm,
		clouds: cloudCover,
		night:night,
		timezone:timezone
	}
	iitsApp.displayResults();
}
iitsApp.displayResults = function(){
	let timezone = iitsApp.passWeather[iitsApp.pageIndex].timezone;
	let unixStartTime = iitsApp.passes[iitsApp.pageIndex].risetime;
	let tzStartTime = moment.tz(unixStartTime*1000,timezone);
	let engStartTime = tzStartTime.format("dddd, MMMM Do YYYY, HH:mm:ss ZZ (z)");
	// let UTCStartTime = engStartTime.toUTCString();
	let unixEndTime = iitsApp.passes[iitsApp.pageIndex].risetime + iitsApp.passes[iitsApp.pageIndex].duration;
	let tzEndTime =  moment.tz(unixStartTime*1000,timezone);
	let engEndTime = tzEndTime.format("HH:mm:ss ZZ (z)");
	let summary = iitsApp.passWeather[iitsApp.pageIndex].summary;
	let clouds = iitsApp.passWeather[iitsApp.pageIndex].clouds;
	let night = iitsApp.passWeather[iitsApp.pageIndex].night;
	$('.output__nextPass').html(`<p>The next pass of the International Space Station over ${iitsApp.inputLoc} will be between ${engStartTime} and ${engEndTime}</p>`);
	$('.output__weather').html(`<p>The weather will be ${summary} with a cloud cover of ${clouds*100}%</p>`);
	$('.output__page').html(`<p>${(iitsApp.pageIndex + 1)} / 5</p>`);
	if (night == false){
		$('.output__night').html(`<p>But the sun will be out so you won't be able to see it 😞</p>`);
	};
}


iitsApp.init = function(){
	console.log('ISSapp engaged');
	iitsApp.events();
}
iitsApp.events = function(){
	$('form').on('submit', function(event){
		event.preventDefault();
	});

	$('#prevButton').on('click', function(event){
		if(iitsApp.pageIndex > 0){
			iitsApp.pageIndex--
			console.log(iitsApp.pageIndex);
			iitsApp.getWeather();
		}
	});
	$('#nextButton').on('click', function(event){
		if(iitsApp.pageIndex < 4){
			iitsApp.pageIndex++
			console.log(iitsApp.pageIndex);
			iitsApp.getWeather();
		}
	});
}


//user inputs city name
	//city names are autofilled by google
	//validate users input
		//if invalid don't progress
		//otherwise 
			//store the city Name in a variable
			//call google api to get LocData

//pass the google geolocation api the city name
	//You access the Google Maps API geocoding service within your code via the google.maps.Geocoder object. The Geocoder.geocode() method initiates a request to the geocoding service
	//recieve the LonLat data and split
	//store each value in a variable
	//pass the LonLat values to the ISS API

//pass the LonLat to the ISS API
	//receive response as Unix Epoch time in UTC
	//receive duration response as seconds
	//store date received and duration in variables
	//pass the date to the google along with the location to get the timezone

//call the google timezone API, pass it the date and the LonLat data
	//https://maps.googleapis.com/maps/api/timezone/outputFormat?parameters
	//parameters:
	//location: a comma-separated lat,lng tuple (eg. location=-33.86,151.20)
	//timestamp specifies the desired time as seconds since midnight, January 1, 1970 UTC. 
	//key

//call the iss api return lots of results
//call the weather api with the first result to get sunset and sunrise
//move through the results until one result is less then sunrise or greater then sunset


$(function(){
	iitsApp.init();
});