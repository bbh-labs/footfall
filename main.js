//var Kinect2 = require('kinect2');
var fs = require('fs');
var express = require('express');
var app = express();

var date = new Date();
var timeline = new Array(1440);
var tracks = {};
var PPM = 0;
var currentVisitors = 0;
var peopleEntered = 0;
var peopleExited = 0;

const ENTER_DEPTH = 2;
const EXIT_DEPTH = 3.5;

if (fs.existsSync(date.toDateString() + '.json')) {
	var dateString = date.toDateString();
	var data = fs.readFileSync(dateString + '.json');
	try {
		timeline = JSON.parse(data);
		console.log('Loaded timeline ' + dateString);
		
		var index = date.getHours() * 60 + date.getMinutes();
		if (typeof(timeline[index]) == 'number') {
			PPM = timeline[index];
		}
	} catch (error) {
		console.log('Didn\'t find timeline for the date:', dateString);
	}
}

app.use(express.static('public'));

app.get('/timeline', function(r, w) {
	if (typeof(r.query.date) == 'number') {
		if (date.getTime() != r.query.date) {
			var tmpDate = new Date(r.query.date);
			try {
				var data = fs.readFileSync(tmpDate.toDateString() + '.json');
				date = tmpDate;
				timeline = JSON.parse(data);
				w.send(timeline);
				return;
			} catch (error) {
				w.sendStatus(404);
			}
		}
	}

	if (typeof(timeline) == 'object') {
		w.send(timeline);
	} else {
		w.sendStatus(404);
	}
});

app.get('/tracks', function(r, w) {
	w.send({ tracks: tracks, count: PPM, peopleEntered: peopleEntered, peopleExited: peopleExited });
});

app.get('/current', function(r, w) {
	w.send({ count: currentVisitors });
});

server = app.listen(8080, function() {
	var host = server.address().address;
	var port = server.address().port;
	console.log('PeopleTracker is listening at http://%s:%s', host, port);
});

/*
kinect = new Kinect2();
if (kinect.open()) {
	kinect.on('bodyFrame', function(bodyFrame) {
		checkPeople(bodyFrame.bodies);
	});
	kinect.openBodyReader();

	setTimeout(tick, 60000);
}
*/

function tick() {
	date = new Date();
	var index = date.getHours() * 60 + date.getMinutes();

	// Clear timeline if new day started
	if (index == 0) {
		timeline = new Array(1440);
		currentVisitors = 0;
	}

	// Save to file
	var filename = date.toDateString() + '.json';
	timeline[index] = PPM;
	fs.writeFile(filename, JSON.stringify(timeline));

	// Reset numbers
	PPM = 0;
	peopleEntered = 0;
	peopleExited = 0;

	setTimeout(tick, 60000);
}

/*
function checkPeople(bodies) {
	// Register people who are being tracked
	for (var body of bodies) {
		if (!body.tracked) {
			continue;
		}

		var x = body.joints[3].cameraX;
		var z = body.joints[3].cameraZ;
		if (tracks.hasOwnProperty(body.trackingId)) {
			var track = tracks[body.trackingId];
			track.x = x;
			if (z >= 0.5) {
				track.z2 = z;
			}
			tracks[body.trackingId] = track;
		} else {
			if (z < ENTER_DEPTH || z > EXIT_DEPTH) {
				tracks[body.trackingId] = {
					z1: z,
					z2: z,
					x: x,
					state: z < ENTER_DEPTH ? 'exiting' : 'entering',
				};
			}
		}
	}

	// Check if anyone entered or left
	for (var id of Object.keys(tracks)) {
		var found = false;
		for (var body of bodies) {
			if (body.trackingId == id) {
				found = true;
				break;
			}
		}

		if (!found) {
			var z1 = tracks[id].z1;
			var z2 = tracks[id].z2;
			var dz = tracks[id].z1 - tracks[id].z2;
			if (z1 > EXIT_DEPTH && z2 < ENTER_DEPTH) {
				PPM++;
				currentVisitors++;
				peopleEntered++;
			} else if (z2 > EXIT_DEPTH) {
				PPM = Math.max(PPM - 1, 0);
				currentVisitors = Math.max(currentVisitors - 1, 0);
				peopleExited++;
			}
			delete tracks[id];
		}
	}
}
*/
