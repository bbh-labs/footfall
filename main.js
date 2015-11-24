var Kinect2 = require('kinect2');
var bodies = {};

const ENTER_DEPTH = 2;
const EXIT_DEPTH = 3.5;

kinect = new Kinect2();
if (kinect.open()) {
	kinect.on('bodyFrame', function(bodyFrame) {
		checkPeople(bodyFrame.bodies);
	});
	kinect.openBodyReader();
}

function checkPeople(bodies) {
	// Register people who are being tracked
	for (var body of bodies) {
		if (!body.tracked) {
			continue;
		}

		var x = body.joints[3].cameraX;
		var z = body.joints[3].cameraZ;
		if (bodies.hasOwnProperty(body.trackingId)) {
			var track = bodies[body.trackingId];
			track.x = x;
			if (z >= 0.5) {
				track.z2 = z;
			}
			bodies[body.trackingId] = track;
		} else {
			if (z < ENTER_DEPTH || z > EXIT_DEPTH) {
				bodies[body.trackingId] = {
					z1: z,
					z2: z,
					x: x,
					state: z < ENTER_DEPTH ? 'exiting' : 'entering',
				};
			}
		}
	}

	// Check if anyone entered or left
	for (var id of Object.keys(bodies)) {
		var found = false;
		for (var body of bodies) {
			if (body.trackingId == id) {
				found = true;
				break;
			}
		}

		if (!found) {
			var z1 = bodies[id].z1;
			var z2 = bodies[id].z2;
			var dz = bodies[id].z1 - bodies[id].z2;
			if (z1 > EXIT_DEPTH && z2 < ENTER_DEPTH) {
				$.ajax({ url: '/data', method: 'POST' });
			} else if (z2 > EXIT_DEPTH) {
				$.ajax({ url: '/data', method: 'DELETE' });
			}
			delete bodies[id];
		}
	}

	// Update server
	$.ajax({
		url: '/bodies',
		method: 'POST',
		data: { bodies: JSON.stringify(bodies) },
	}).done(function(resp) {
		console.log('Updated bodies');
	}).fail(function(resp) {
		console.log('Failed to update bodies');
	});
}

function newArray(length) {
	if (!length) {
		return new Array();
	}

	var array = new Array(length);
	for (var i in array) {
		array[i] = 0;
	}
	return array;
}
