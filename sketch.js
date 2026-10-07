//Chemical and Temp&Humidity Sensor visualization
let table;
let currentRow = 0;
let datasetSelect;
let timelineSlider;
let playButton;
let isPlaying = true;
let dataStatus = "Loading...";

const DATASETS = [
  { label: "Original data", file: "data/DATA.CSV" },
  { label: "Fields", file: "data/Fields.CSV" },
  { label: "Normal Outside", file: "data/NormalOutside.CSV" },
  { label: "Walk to Field", file: "data/Walk2Field.CSV" },
];

let sensorData = {
  temp: 22,
  hum: 50,
  tvoc: 20,
  eco2: 300,
};

const VNAMES = ["TVOC", "eCO2"];

const VCOLS = [
  [70, 210, 130],
  [60, 180, 220],
];

const VSIZES = [1.0, 1.25];
const MAX_P = 150;

let visualW = 460;
let visualH = 420;
let visualX = 20;
let visualY = 60;

let particles = [];
let sliders = {};
let panelX;
let playbackSpeed = 30;

function preload() {
  // CSVs are loaded from setup() so the dropdown can switch between files.
}

function loadDataset(filename) {
  dataStatus = `Loading ${filename}...`;

  loadTable(
    filename,
    "csv",
    "header",
    (loadedTable) => {
      table = loadedTable;
      currentRow = 0;
      particles = [];
      updateTimelineRange();
      dataStatus = `${filename} loaded (${table.getRowCount()} rows)`;
      console.log(dataStatus);
      console.log("Columns:", table.columns);
    },
    (err) => {
      table = null;
      dataStatus = `CSV failed: ${filename}`;
      console.error(dataStatus, err);
    }
  );
}

function setup() {
  createCanvas(760, 570);
  rectMode(CORNER);
  textFont("sans-serif");
  // CSV row count is logged after a dataset finishes loading.

  rectMode(CORNER);
  textFont("sans-serif");

  panelX = visualW + 40;
  makeAllSliders();
  makeDatasetSelector();
  makeTimelineControls();
  loadDataset(DATASETS[0].file);

  frameRate(30);
}

function draw() {
  background(17);

  updateSlidersFromSensors();

  drawVisualizer();

  // overlays stay over visual only, not the panel/sliders
  drawHeatHaze();
  drawVignette();

  // panel drawn last so sliders/UI stay visually on top
  drawPanel();

  fill(140);
  noStroke();
  textSize(11);
  textAlign(LEFT, BOTTOM);
  text(
    "Click visual to enter fullscreen • Press F or ESC to exit",
    20,
    height - 10
  );

}

function updateSlidersFromSensors() {
  if (!table || table.getRowCount() === 0) return;

  currentRow = constrain(currentRow, 0, table.getRowCount() - 1);

  if (timelineSlider && !isPlaying && timelineSlider.value() !== currentRow) {
    currentRow = timelineSlider.value();
  }

  let row = table.getRow(currentRow);

  sensorData.temp = row.getNum("TempF");
  sensorData.hum = row.getNum("Hum");
  sensorData.eco2 = row.getNum("eCO2");
  sensorData.tvoc = row.getNum("TVOC");

  sliders.temp.value(sensorData.temp);
  sliders.hum.value(sensorData.hum);
  sliders.vocs[0].value(sensorData.tvoc);
  sliders.vocs[1].value(sensorData.eco2);

  let aqiMapped = constrain(
    map(sensorData.eco2, 300, 2000, 0, 300),
    0,
    500
  );

  sliders.aqi.value(round(aqiMapped));

  if (isPlaying && frameCount % playbackSpeed === 0) {
    currentRow++;

    if (currentRow >= table.getRowCount()) {
      currentRow = 0;
    }
  }

  if (timelineSlider && timelineSlider.value() !== currentRow) {
    timelineSlider.value(currentRow);
  }
}

function makeAllSliders() {
  sliders.temp = makeSlider(-40, 185, 22, 1, panelX, 70);
  sliders.hum = makeSlider(0, 100, 50, 1, panelX, 120);

  sliders.vocs = [];
  sliders.vocs[0] = makeSlider(0, 2200, 20, 1, panelX, 200);   // TVOC
sliders.vocs[1] = makeSlider(400, 5000, 400, 1, panelX, 242); // eCO2
  sliders.aqi = makeSlider(0, 500, 45, 1, panelX, 340);
}

function makeSlider(min, max, value, step, x, y) {
  let s = createSlider(min, max, value, step);
  s.position(x, y);
  s.size(180);
  return s;
}

function makeDatasetSelector() {
  datasetSelect = createSelect();
  datasetSelect.position(panelX, 425);
  datasetSelect.size(180);

  for (let d of DATASETS) {
    datasetSelect.option(d.label, d.file);
  }

  datasetSelect.changed(() => {
    loadDataset(datasetSelect.value());
  });
}

function makeTimelineControls() {
  timelineSlider = createSlider(0, 1, 0, 1);
  timelineSlider.position(panelX, 470);
  timelineSlider.size(180);
  timelineSlider.input(() => {
    isPlaying = false;
    currentRow = timelineSlider.value();
    playButton.html("Play");
  });

  playButton = createButton("Pause");
  playButton.position(panelX, 495);
  playButton.size(70, 22);
  playButton.mousePressed(() => {
    isPlaying = !isPlaying;
    playButton.html(isPlaying ? "Pause" : "Play");
  });
}

function updateTimelineRange() {
  if (!timelineSlider || !table) return;

  let maxRow = max(0, table.getRowCount() - 1);
  timelineSlider.attribute("max", maxRow);
  timelineSlider.value(0);
}

function drawVisualizer() {
  push();
  translate(visualX, visualY);

  fill(18, 18, 18, 28);
  noStroke();
  rect(0, 0, visualW, visualH, 10);

  let temp = sliders.temp.value();
  let hum = sliders.hum.value();
  let aqi = sliders.aqi.value();

  let vocs = [
    map(sliders.vocs[0].value(), 0, 1000, 0, 100),
    map(sliders.vocs[1].value(), 400, 2000, 0, 100),
  ];

  let spd = map(temp, -10, 50, 0.25, 3.8);
  let clumpStrength = map(hum, 0, 100, 0, 1);

  updateParticles(vocs);

  for (let p of particles) {
    p.update(spd, clumpStrength);
    p.draw(clumpStrength);
  }

  let info = aqiInfo(aqi);

  fill(255, 255, 255, 145);
  textSize(11);
  textAlign(LEFT, BOTTOM);
  text(`AQI ${aqi} · ${info.label}`, 10, visualH - 8);

  pop();
}

function updateParticles(vocs) {
  let total = vocs.reduce((a, b) => a + b, 0) || 1;
  let targets = vocs.map((v) => round((v / total) * MAX_P));

  for (let ci = 0; ci < VNAMES.length; ci++) {
    let current = particles.filter((p) => p.ci === ci);

    while (current.length < targets[ci]) {
      let p = new Particle(ci);
      particles.push(p);
      current.push(p);
    }

    while (current.length > targets[ci]) {
      let removeMe = current.pop();
      particles.splice(particles.indexOf(removeMe), 1);
    }
  }
}

function drawVignette() {
  let aqi = sliders.aqi.value();

  if (aqi < 51) return;

  push();

  let t = constrain((aqi - 51) / (500 - 51), 0, 1);
  let maxDepth = min(width, height) * 0.48;
  let depth = maxDepth * t;

  noStroke();

  // Top edge creeping downward
  for (let i = 0; i < depth; i++) {
    let alpha = map(i, 0, depth, 150, 0); // max 15%
    fill(0, 0, 0, alpha);
    rect(0, i, width, 1);
  }

  // Bottom edge creeping upward
  for (let i = 0; i < depth; i++) {
    let alpha = map(i, 0, depth, 150, 0);
    fill(0, 0, 0, alpha);
    rect(0, height - i, width, 1);
  }

  // Left edge creeping right
  for (let i = 0; i < depth; i++) {
    let alpha = map(i, 0, depth, 150, 0);
    fill(0, 0, 0, alpha);
    rect(i, 0, 1, height);
  }

  // Right edge creeping left
  for (let i = 0; i < depth; i++) {
    let alpha = map(i, 0, depth, 150, 0);
    fill(0, 0, 0, alpha);
    rect(width - i, 0, 1, height);
  }

  pop();
}

function drawHeatHaze() {
  let temp = sliders.temp.value();
  if (temp < 30) return;

  push();
  translate(visualX, visualY);

  let t = constrain((temp - 30) / (50 - 30), 0, 1);
  let alpha = map(t, 0, 1, 12.75, 127.5);

  noStroke();

  fill(136, 8, 8, alpha * 0.7);
  rect(0, 0, visualW, visualH, 10);

  for (let i = 0; i < 50; i++) {
    let edgeT = i / 49;
    let edgeAlpha = alpha * map(edgeT, 0, 1, 0.22, 0);

    fill(136, 8, 8, edgeAlpha);

    rect(0, i, visualW, 1);
    rect(0, visualH - i, visualW, 1);
    rect(i, 0, 1, visualH);
    rect(visualW - i, 0, 1, visualH);
  }

  pop();
}

function drawPanel() {
  fill(26);
  stroke(42);
  rect(panelX - 20, 35, 240, 505, 10);

  noStroke();

  fill(170);
  textSize(15);
  textAlign(CENTER);
  text("Air Quality Particle Visualizer", width / 2, 28);

  textAlign(LEFT);
  drawSection("Environment", 55);
drawLabel("Temperature (°F)", sliders.temp.value(), panelX, 65);  drawLabel("Humidity (%)", sliders.hum.value(), panelX, 115);

  drawSection("Sensor Readings", 175);

  for (let i = 0; i < VNAMES.length; i++) {
    fill(VCOLS[i][0], VCOLS[i][1], VCOLS[i][2]);
    circle(panelX - 8, 193 + i * 42, 9);

    fill(155);
    textSize(12);
    text(VNAMES[i], panelX, 190 + i * 42);

    fill(220);
    textAlign(RIGHT);
    text(sliders.vocs[i].value(), panelX + 205, 190 + i * 42);
    textAlign(LEFT);
  }

  drawSection("Air Quality Index", 315);
  drawLabel("AQI", sliders.aqi.value(), panelX, 335);

  let info = aqiInfo(sliders.aqi.value());

  fill(info.rgb[0], info.rgb[1], info.rgb[2]);
  textSize(13);
  textAlign(CENTER);
  text("● " + info.label, panelX + 90, 385);

  fill(155);
  textSize(12);
  textAlign(LEFT);
  text("Dataset", panelX, 415);

  text("Timeline / Row", panelX, 463);

  fill(220);
  textAlign(RIGHT);
  let totalRows = table ? table.getRowCount() : 0;
  text(totalRows > 0 ? `${currentRow + 1} / ${totalRows}` : "0 / 0", panelX + 205, 463);
  textAlign(LEFT);

  fill(120);
  textSize(10);
  text(dataStatus, panelX, 525);
}


function drawSection(label, y) {
  fill(100);
  textSize(10);
  textStyle(BOLD);
  textAlign(LEFT);
  text(label.toUpperCase(), panelX, y);
  textStyle(NORMAL);
}

function drawLabel(label, value, x, y) {
  fill(155);
  textSize(12);
  textAlign(LEFT);
  text(label, x, y);

  fill(220);
  textAlign(RIGHT);
  text(value, x + 205, y);
  textAlign(LEFT);
}

function aqiInfo(v) {
  if (v <= 50) return { label: "Good (0-50)", rgb: [0, 200, 80] };
  if (v <= 100) return { label: "Moderate (51-100)", rgb: [220, 200, 0] };
  if (v <= 150)
    return { label: "Unhealthy for Sensitive (101-150)", rgb: [255, 140, 0] };
  if (v <= 200) return { label: "Unhealthy (151-200)", rgb: [230, 30, 30] };
  if (v <= 300)
    return { label: "Very Unhealthy (201-300)", rgb: [143, 63, 151] };

  return { label: "Hazardous (301-500)", rgb: [100, 0, 30] };
}

class Particle {
  constructor(ci) {
    this.ci = ci;
    this.init();
  }

  init() {
    this.x = random(visualW);
    this.y = random(visualH);

    this.vx = random(-1, 1);
    this.vy = random(-1, 1);

    let base = random(7, 12);
    this.sz = base * pow(VSIZES[this.ci], 1.8);
  }

  update(spd, clumpStrength) {
    let jitter = map(this.sz, 4, 18, 1.2, 0.4);

    this.vx += random(-jitter, jitter) * 0.08;
    this.vy += random(-jitter, jitter) * 0.08;

    if (clumpStrength > 0.05) {
      let pullX = 0;
      let pullY = 0;
      let count = 0;

      for (let other of particles) {
        if (other !== this && other.ci === this.ci) {
          let d = dist(this.x, this.y, other.x, other.y);

          if (d > 0 && d < 90) {
            pullX += other.x - this.x;
            pullY += other.y - this.y;
            count++;
          }
        }
      }

      if (count > 0) {
        pullX /= count;
        pullY /= count;

        this.vx += pullX * 0.0009 * clumpStrength;
        this.vy += pullY * 0.0009 * clumpStrength;
      }
    }

    this.vx = constrain(this.vx, -1.6, 1.6);
    this.vy = constrain(this.vy, -1.6, 1.6);

    this.x += this.vx * spd;
    this.y += this.vy * spd;

    if (this.x < 0 || this.x > visualW) this.vx *= -1;
    if (this.y < 0 || this.y > visualH) this.vy *= -1;

    this.x = constrain(this.x, 0, visualW);
    this.y = constrain(this.y, 0, visualH);
  }

  draw(clumpStrength) {
    let c = VCOLS[this.ci];

    let concentration = sliders.vocs[this.ci].value();

    if (this.ci === 0) {
      concentration = map(concentration, 0, 1000, 0, 100);
    } else {
      concentration = map(concentration, 400, 2000, 0, 100);
    }

    let concentrationScale = map(concentration, 0, 100, 0.75, 1.65);

    let humiditySize = map(clumpStrength, 0, 1, 1, 1.45);
    let s = this.sz * concentrationScale * humiditySize;

    noStroke();

    fill(c[0], c[1], c[2], 18 + 18 * clumpStrength);
    ellipse(this.x, this.y, s * (2.6 + clumpStrength * 1.4));

    fill(c[0], c[1], c[2], 40);
    ellipse(this.x, this.y, s * (1.8 + clumpStrength * 0.8));

    fill(c[0], c[1], c[2], 170);
    ellipse(this.x, this.y, s);

    fill(255, 255, 255, 55);
    ellipse(this.x - s * 0.15, this.y - s * 0.15, s * 0.28);
  }
}

function mousePressed() {
  if (
    mouseX >= visualX &&
    mouseX <= visualX + visualW &&
    mouseY >= visualY &&
    mouseY <= visualY + visualH
  ) {
    if (!fullscreen()) {
      fullscreen(true);
      resizeCanvas(windowWidth, windowHeight);
      updateSizes();
    }
  }
}

function keyPressed() {
  if (key === "f" || key === "F" || keyCode === ESCAPE) {
    fullscreen(false);
    resizeCanvas(760, 570);
    updateSizes();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateSizes();
}

function updateSizes() {
  if (!sliders.temp || !sliders.hum || !sliders.vocs || !sliders.aqi) {
    return;
  }

  visualX = 20;
  visualY = 60;

  let panelWidth = 260;

  visualW = width - panelWidth - 60;
  visualH = height - 90;

  panelX = visualW + 40;

  sliders.temp.position(panelX, 70);
  sliders.hum.position(panelX, 120);

  for (let i = 0; i < VNAMES.length; i++) {
    if (sliders.vocs[i]) {
      sliders.vocs[i].position(panelX, 200 + i * 42);
    }
  }

  sliders.aqi.position(panelX, 340);

  if (datasetSelect) {
    datasetSelect.position(panelX, 425);
  }

  if (timelineSlider) {
    timelineSlider.position(panelX, 470);
  }

  if (playButton) {
    playButton.position(panelX, 495);
  }

  for (let p of particles) {
    p.x = constrain(p.x, 0, visualW);
    p.y = constrain(p.y, 0, visualH);
  }
}