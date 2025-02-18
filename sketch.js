let circleX = 200;
let circleY = 150;
let circleRadius = 75;

let graphX = 50;
let graphY = 300;
let graphAmplitude = 50;
let graphPeriod = 300;

let isAnimating = false;
let currentAngle = 0;

function toggleAnimation() {
    isAnimating = !isAnimating;
    const btn = select('.animate-btn');
    if (isAnimating) {
        btn.html('Stop Animation');
    } else {
        btn.html('Start Animation');
    }
}

function setup() {
    const canvas = createCanvas(400, 400);
    canvas.parent('canvas-container');
    angleMode(DEGREES);
    describe(
        'Animated demonstration of a point moving around the unit circle, together with the corresponding sine and cosine values moving along their graphs.'
    );
}



function draw() {
    background(0);

    // Update angle if animating
    if (isAnimating) {
        currentAngle = (currentAngle + 2) % 360;  // Made animation slightly faster
    }

    // Display current angle
    fill(255);
    textSize(20);
    textAlign(LEFT, CENTER);
    text(`angle: ${currentAngle}`, 25, 25);

    // Draw circle and diameters
    noFill();
    stroke(128);
    strokeWeight(3);
    circle(circleX, circleY, 2 * circleRadius);
    line(circleX, circleY - circleRadius, circleX, circleY + circleRadius);
    line(circleX - circleRadius, circleY, circleX + circleRadius, circleY);

    // Draw moving points
    let pointX = circleX + circleRadius * cos(currentAngle);
    let pointY = circleY - circleRadius * sin(currentAngle);

    line(circleX, circleY, pointX, pointY);

    noStroke();

    fill('white');
    circle(pointX, pointY, 10);

    fill('orange');
    circle(pointX, circleY, 10);

    fill('red');
    circle(circleX, pointY, 10);

    // Draw graph
    stroke('grey');
    strokeWeight(3);
    line(graphX, graphY, graphX + 300, graphY);
    line(graphX, graphY - graphAmplitude, graphX, graphY + graphAmplitude);
    line(
        graphX + graphPeriod,
        graphY - graphAmplitude,
        graphX + graphPeriod,
        graphY + graphAmplitude
    );

    fill('grey');
    strokeWeight(1);
    textAlign(CENTER, CENTER);
    text('0', graphX, graphY + graphAmplitude + 20);
    text('360', graphX + graphPeriod, graphY + graphAmplitude + 20);
    text('1', graphX / 2, graphY - graphAmplitude);
    text('0', graphX / 2, graphY);
    text('-1', graphX / 2, graphY + graphAmplitude);

    fill('orange');
    text('cos', graphX + graphPeriod + graphX / 2, graphY - graphAmplitude);
    fill('red');
    text('sin', graphX + graphPeriod + graphX / 2, graphY);

    // Draw cosine curve
    noFill();
    stroke('orange');
    beginShape();
    for (let t = 0; t <= 360; t++) {
        let x = map(t, 0, 360, graphX, graphX + graphPeriod);
        let y = graphY - graphAmplitude * cos(t);
        vertex(x, y);
    }
    endShape();

    // Draw sine curve
    noFill();
    stroke('red');
    beginShape();
    for (let t = 0; t <= 360; t++) {
        let x = map(t, 0, 360, graphX, graphX + graphPeriod);
        let y = graphY - graphAmplitude * sin(t);
        vertex(x, y);
    }
    endShape();

    // Draw moving line
    let lineX = map(currentAngle, 0, 360, graphX, graphX + graphPeriod);
    stroke('grey');
    line(lineX, graphY - graphAmplitude, lineX, graphY + graphAmplitude);

    // Draw moving points on graph
    let orangeY = graphY - graphAmplitude * cos(currentAngle);
    let redY = graphY - graphAmplitude * sin(currentAngle);

    noStroke();

    fill('orange');
    circle(lineX, orangeY, 10);

    fill('red');
    circle(lineX, redY, 10);
}
