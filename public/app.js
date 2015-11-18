var TIMELINE_HEIGHT = 200;

var PPM, // People per minute
    PPH, // People per hour
    tracks = {},
    maxPPH = 0, // Max PPH
    minPPH = 0, // Min PPH
    totalVisits = 0,
    peopleEntered = 0,
    peopleExited = 0,
    currentVisitors = 0,
    popularHours = [],
    unpopularHours = [];

var fetchTimelineID,
    fetchTracksID;

var stepX,
    stepY;

var bShouldRedraw = false;

var popularHoursElement,
    unpopularHoursElement,
    totalVisitsElement,
    currentVisitorsElement,
    dayElement;

function setup() {
	noLoop();

	var canvas = createCanvas(windowWidth, 260);
	canvas.parent('canvas-container');
	background(255);
	stroke(245);
	textAlign(CENTER);

	fetchTimeline();
	fetchCurrent();

	popularHoursElement = document.getElementById('popular-hours');
	unpopularHoursElement = document.getElementById('unpopular-hours');
	totalVisitsElement = document.getElementById('total-visits');
	currentVisitorsElement = document.getElementById('current-visitors');
	dayElement = document.getElementById('day');
}

function windowResized() {
	resizeCanvas(windowWidth, 260);
	background(255);
	stroke(245);
	textAlign(CENTER);

	drawTimeline();
}

function drawTimeline() {
	if (typeof(PPM) != 'object') {
		return;
	}

	// Calculate stepX
	stepX = (windowWidth * 0.8) / 25;

	push();
		translate(windowWidth * 0.1, 0);

		// Grid
		for (var i = 0; i < 26; i++) {
			line(i * stepX, 0, i * stepX, TIMELINE_HEIGHT); // Row
			line(0, 0, i * stepX, 0); // Top line
			line(0, TIMELINE_HEIGHT, i * stepX, TIMELINE_HEIGHT); // Below line
		}


		// Legend
		fill(50);
		textSize(12);
		var legendText = 'Number of people inside the store';
		var legendWidth = textWidth(legendText);
		textAlign(LEFT);
		text(legendText, windowWidth * 0.475 - legendWidth - 10, 22);
		textAlign(CENTER);
		fill(185, 235, 223, 200)
		rect(windowWidth * 0.475 - legendWidth - 30, 10, 15, 15);


		// Number of people 
		beginShape();
		fill(185, 235, 223, 200); // Light green
		noStroke();
		for (var i = 0; i < 24; i++) {
			vertex((i + 1) * stepX, TIMELINE_HEIGHT - PPH[i] * stepY); // Shape
		};
		vertex(24 * stepX, 200);
		vertex(stepX, 200);
		endShape(CLOSE);	

		// Dots
		fill(90, 180, 160);
		stroke(255);
		textSize(10);
		for(var i = 0; i < 24; i++) {
			ellipse((i+1) * stepX, TIMELINE_HEIGHT - PPH[i] * stepY, 8, 8);
		}

		// Y-axis
		fill(50);
		text(maxPPH, 0, TIMELINE_HEIGHT * 0.2);
		text(maxPPH/2, 0, TIMELINE_HEIGHT * 0.6);
		text(0, 0, TIMELINE_HEIGHT * 1);

		// Time Bar
		fill(17, 56, 83);
		rect(0, TIMELINE_HEIGHT, 25 * stepX, 55);
		noStroke();
		fill(255);
		textSize(14);
		for(var i = 0; i < 24; i++) {
			var x = (i + 1) * stepX;
			var y = TIMELINE_HEIGHT + 20;
			text(i % 12 + 1, x, y);
			if (i == 0 || i == 23) {
				text('AM', x, y + 20);
			} else if (i == 11) {
				text('PM', x, y + 20);
			}
		}

	pop();
}

function mouseMoved() {
	if (typeof(PPM) != 'object') {
		return;
	}

	for (var i = 0; i < 24; i++) {
		var x = windowWidth * 0.1 + (i + 1) * stepX;
		var y = TIMELINE_HEIGHT - (PPH[i] * stepY);
		if (dist(x, y, mouseX, mouseY) <= 8) {
			fill(90, 180, 160);
			text(PPH[i].toFixed(), x, y - 10);
			bShouldRedraw = true;
			return;
		}
	}

	if (bShouldRedraw) {
		background(255);
		drawTimeline();
		bShouldRedraw = false;
	}

}

function fetchTimeline(date) {
	$.ajax({
		url: '/timeline',
		method: 'GET',
		data: date ? { date: date.getTime() } : undefined,
		dataType: 'json',
	}).done(function(data) {
		PPM = data;

		// Count PPH, max and min PPH
		PPH = new Array(24);
		for (var i = 0; i < 24; i++) {
			var tmpCount = 0;
			for (var j = 0; j < 60; j++) {
				var index = i * 60 + j;
				if (PPM[index]) {
					tmpCount += PPM[index];
				}
			}

			PPH[i] = tmpCount;
			maxPPH = Math.max(maxPPH, tmpCount);
			minPPH = Math.min(minPPH, tmpCount);
		}

		// Query popular and unpopular hour
		if (maxPPH > 0) {
			// Get popular hour ranges
			var range = [];
			var prev = -1;
			for (var i = 0; i < 24; i++) {
				if (PPH[i] >= maxPPH * 0.8) {
					if (prev == i - 1) {
						range.push(i);
					} else {
						if (range.length > 0) {
							popularHours.push(range);
						}
						range = [];
						range.push(i);
					}
					prev = i;
				}

				if (i == 23 && range.length > 0) {
					popularHours.push(range);
				}
			}
			var maxHoursPPH = 0, maxHoursPPHRange;
			for (var i = 0; i < popularHours.length; i++) {
				var hours = popularHours[i];
				var hoursPPH = 0;
				for (var j = 0; j < hours.length; j++) {
					var index = hours[j];
					hoursPPH += PPH[index];
				}
				if (maxHoursPPH < hoursPPH) {
					maxHoursPPH = hoursPPH;
					maxHoursPPHRange = popularHours[i];
				}
			}
			if (maxHoursPPHRange) {
				if (maxHoursPPHRange.length > 1) {
					var start = maxHoursPPHRange[0];
					var startSuffix = start < 12 ? 'AM' : 'PM';
					var end = maxHoursPPHRange[maxHoursPPHRange.length - 1];
					var endSuffix = end < 12 ? 'AM' : 'PM';
					popularHoursElement.innerHTML = ((start % 12) + 1) + startSuffix + ' - ' + end + endSuffix;
				} else if (maxHoursPPHRange.length == 1) {
					var start = maxHoursPPHRange[0];
					var startSuffix = start < 12 ? 'AM' : 'PM';
					popularHoursElement.innerHTML = ((start % 12) + 1) + startSuffix;
				} else {
					popularHoursElement.innerHTML = 'N/A';
				}
			}

			// Get unpopular hour ranges
			range = [];
			prev = -1;
			for (var i = 0; i < 24; i++) {
				if (PPH[i] > 0 && PPH[i] <= maxPPH * 0.2) {
					if (prev == i - 1) {
						range.push(i);
					} else {
						if (range.length > 0) {
							unpopularHours.push(range);
						}
						range = [];
						range.push(i);
					}
					prev = i;
				}

				if (i == 23 && range.length > 0) {
					unpopularHours.push(range);
				}
			}
			var minHoursPPH = 99999999, minHoursPPHRange;
			for (var i = 0; i < unpopularHours.length; i++) {
				var hours = unpopularHours[i];
				var hoursPPH = 0;
				for (var j = 0; j < hours.length; j++) {
					var index = hours[j];
					hoursPPH += PPH[index];
				}
				if (minHoursPPH > hoursPPH) {
					minHoursPPH = hoursPPH;
					minHoursPPHRange = unpopularHours[i];
				}
			}
			if (minHoursPPHRange) {
				if (minHoursPPHRange.length > 1) {
					var start = minHoursPPHRange[0];
					var startSuffix = start < 12 ? 'AM' : 'PM';
					var end = minHoursPPHRange[minHoursPPHRange.length - 1];
					var endSuffix = end < 12 ? 'AM' : 'PM';
					unpopularHoursElement.innerHTML = ((start % 12) + 1) + startSuffix + ' - ' + end + endSuffix;
				} else if (minHoursPPHRange.length == 1) {
					var start = minHoursPPHRange[0];
					var startSuffix = start < 12 ? 'AM' : 'PM';
					unpopularHoursElement.innerHTML = ((start % 12) + 1) + startSuffix;
				} else {
					unpopularHoursElement.innerHTML = 'N/A';
				}
			}
		}

		// Count total visits
		totalVisits = 0;
		for (var i = 0; i < 24; i++) {
			totalVisits += PPH[i]
		}
		totalVisitsElement.innerHTML = totalVisits;

		// Update stepY
		stepY = maxPPH > 0 ? TIMELINE_HEIGHT * 0.8 / maxPPH : 0;

		// Update day element if necessary
		var day;
		switch (new Date().getDay()) {
		case 0: day = 'Sunday'; break;
		case 1: day = 'Monday'; break;
		case 2: day = 'Tuesday'; break;
		case 3: day = 'Wednesday'; break;
		case 4: day = 'Thursday'; break;
		case 5: day = 'Friday'; break;
		case 6: day = 'Saturday'; break;
		}
		dayElement.innerHTML = day;

		// Redraw
		drawTimeline();

		fetchTimelineID = setTimeout(fetchTimeline, 60000);
	}).fail(function(response) {
		fetchTimelineID = setTimeout(fetchTimeline, 60000);
	});
}

function fetchTracks() {
	$.ajax({
		url: '/tracks',
		method: 'GET',
		dataType: 'json',
	}).done(function(data) {
		tracks = data.tracks;
		peopleEntered = data.peopleEntered;
		peopleExited = data.peopleExited;
		fetchTracksID = window.setTimeout(fetchTracks, 33);
	}).fail(function(response) {
		fetchTracksID = window.setTimeout(fetchTracks, 1000);
	});
}

function fetchCurrent() {
	$.ajax({
		url: '/current',
		method: 'GET',
		dataType: 'json',
	}).done(function(data) {
		currentVisitors = data.count;
		currentVisitorsElement.innerHTML = currentVisitors;
		fetchCurrentID = window.setTimeout(fetchCurrent, 33);
	}).fail(function(response) {
		fetchCurrentID = window.setTimeout(fetchCurrent, 1000);
	});
}

function keyReleased() {
	if (key == ' ') {
		state = state == 'timeline' ? 'tracks' : 'timeline';
		if (state == 'timeline') {
			clearTimeout(fetchTracksID);
			fetchTimeline();
		} else {
			clearTimeout(fetchTimelineID);
			fetchTracks();
		}
	}
}

