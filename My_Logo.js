"use strict";

var gl, program, canvas;
var points = [];
var colors = [];

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

// Animation and control variables
var animationAngle = 0;
var isAnimating = false; //default pause
var animationSpeed = 1.0;
var extrusionDepth = 0.1;
var appliedMode = "none"; // "none", "manual", "sequence, left_rotate"
var isManualRotation = false; // The flag to switch modes
var manualX = 0;
var manualY = 0;
var manualZ = 0;
var primaryColor = [1.0, 0.0, 0.0, 1.0];
var secondaryColor = [0.0, 1.0, 0.0, 1.0];
var customText = "L"; // need change later
var targetAspectRatio = 16 / 9;
var lightingMode = "neutral";
var lightingFactor = 1.0;

// 1. The New Assignment Sequence
var assignmentKeyframes = [
  {
    // Step 1: Start Center (Hold briefly)
    name: "start",
    duration: 0.5,
    start: createTransform(0, [0, 0, 0], 1.0),
    end: createTransform(0, [0, 0, 0], 1.0),
  },
  {
    // Step 2: Rotate Right 180 (0 to -180 is Clockwise/Right)
    name: "right_180",
    duration: 1.5,
    start: createTransform(0, [0, 0, 0], 1.0),
    end: createTransform(-180, [0, 0, 0], 1.0),
  },
  {
    // Step 3: Rotate Back to Original
    name: "back_from_right",
    duration: 1.5,
    start: createTransform(-180, [0, 0, 0], 1.0),
    end: createTransform(0, [0, 0, 0], 1.0),
  },
  {
    // Step 4: Rotate Left 180 (0 to 180 is Counter-Clockwise/Left)
    name: "left_180",
    duration: 1.5,
    start: createTransform(0, [0, 0, 0], 1.0),
    end: createTransform(180, [0, 0, 0], 1.0),
  },
  {
    // Step 5: Rotate Back to Original
    name: "back_from_left",
    duration: 1.5,
    start: createTransform(180, [0, 0, 0], 1.0),
    end: createTransform(0, [0, 0, 0], 1.0),
  },
  {
    // Step 6: Gradually Enlarge (Scale 1.0 -> 1.3)
    name: "enlarge",
    duration: 2.0,
    start: createTransform(0, [0, 0, 0], 1.0),
    end: createTransform(0, [0, 0, 0], 1.3),
  },
  {
    // Step 7: Move About (Looping)
    name: "hover_loop",
    duration: 3.0, // Length of one bob/wobble cycle
    loop: true, // Custom flag to make this step repeat forever
    custom: true,
    compute: function (t) {
      // Gentle floating up/down and slight wobble rotation
      var y = 0.1 * Math.sin(t * Math.PI * 2);
      var rot = 10 * Math.sin(t * Math.PI * 2);
      return createTransform(rot, [0, y, 0], 1.3);
    },
  },
];

// TV Ident Sequence
var tvIdentKeyframes = [
  {
    name: "center",
    duration: 0.6,
    start: createTransform(0, [0, 0, 0], 1),
    end: createTransform(0, [0, 0, 0], 1),
  },
  {
    name: "rotate_right",
    duration: 1.0,
    start: createTransform(0, [0, 0, 0], 1),
    end: createTransform(180, [0.25, 0, 0], 1),
  },
  {
    name: "back_track_one",
    duration: 0.8,
    start: createTransform(180, [0.25, 0, 0], 1),
    end: createTransform(180, [0.25, 0, -0.35], 1),
  },
  {
    name: "rotate_left",
    duration: 1.0,
    start: createTransform(180, [0.25, 0, -0.35], 1),
    end: createTransform(360, [-0.25, 0, -0.35], 1),
  },
  {
    name: "back_track_two",
    duration: 0.8,
    start: createTransform(360, [-0.25, 0, -0.35], 1),
    end: createTransform(360, [-0.25, 0, 0], 1),
  },
  {
    name: "enlarge",
    duration: 0.9,
    start: createTransform(360, [-0.25, 0, 0], 1),
    end: createTransform(360, [-0.1, 0, 0], 1.35),
  },
  {
    name: "move_about",
    duration: 1.4,
    custom: true,
    compute: function (p) {
      var wx = -0.1 + 0.2 * Math.sin(p * Math.PI * 2);
      var wy = 0.05 * Math.sin(p * Math.PI);
      var wz = 0.12 * Math.cos(p * Math.PI * 2);
      var r = 360 + 45 * p;
      var s = 1.35 + 0.05 * Math.sin(p * Math.PI * 4);
      return createTransform(r, [wx, wy, wz], s);
    },
  },
];

// 3. Set the default active sequence
var sequenceKeyframes = assignmentKeyframes;
var isSequenceRunning = false;
var sequenceIndex = 0;
var sequenceTime = 0;
var currentSequenceTransform = createTransform(0, [0.0, 0.0, 0.0], 1.0);
var lastFrameTime = 0;

window.onload = function init() {
  getUIElement();
  configWebGL();
  makeL();
  setupUIControls();
  render();
};

function getUIElement() {
  canvas = document.getElementById("gl_canvas");
}

// Configure WebGL Settings
function configWebGL() {
  gl = canvas.getContext("webgl2");
  if (!gl) {
    alert("WebGL 2.0 isn't available");
  }

  // Viewport and clear color
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  // Compile shaders
  program = initShaders(gl, "vertex_shader", "fragment_shader");
  gl.useProgram(program);

  // Get uniform locations
  modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
  projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");

  // Set up the projection matrix
  projectionMatrix = perspective(45.0, targetAspectRatio, 0.1, 100.0);
  resizeCanvasMaintainingAspect();
}

function resizeCanvasMaintainingAspect() {
  if (!gl || !canvas) {
    return;
  }

  var maxWidth = Math.min(window.innerWidth - 80, 1200);
  var maxHeight = Math.min(window.innerHeight - 115, 800);
  var width = maxWidth;
  var height = width / targetAspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * targetAspectRatio;
  }

  width = Math.max(320, width);
  height = width / targetAspectRatio;

  canvas.width = width;
  canvas.height = height;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";

  gl.viewport(0, 0, canvas.width, canvas.height);
  projectionMatrix = perspective(45.0, targetAspectRatio, 0.1, 100.0);
}

function createTransform(rotation, position, scale) {
  return {
    rotation: rotation || 0,
    position: position ? [position[0], position[1], position[2]] : [0, 0, 0],
    scale: scale === undefined ? 1.0 : scale,
  };
}

function cloneTransform(transform) {
  return createTransform(
    transform.rotation,
    transform.position,
    transform.scale
  );
}

function interpolateTransform(start, end, t) {
  var lerp = function (a, b, progress) {
    return a + (b - a) * progress;
  };
  return createTransform(
    lerp(start.rotation, end.rotation, t),
    [
      lerp(start.position[0], end.position[0], t),
      lerp(start.position[1], end.position[1], t),
      lerp(start.position[2], end.position[2], t),
    ],
    lerp(start.scale, end.scale, t)
  );
}

function buildModelMatrix(transform) {
  var translationMatrix = translate(
    transform.position[0],
    transform.position[1],
    transform.position[2]
  );
  var rotationMatrix = rotate(transform.rotation, 0, 1, 0);
  var s = transform.scale;
  var scaleMatrix = mat4(s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1);
  return mult(translationMatrix, mult(rotationMatrix, scaleMatrix));
}

function startSequence() {
  isSequenceRunning = true;
  sequenceIndex = 0;
  sequenceTime = 0;
  currentSequenceTransform = cloneTransform(sequenceKeyframes[0].start);
  lastFrameTime = 0;
}

function stopSequence() {
  isSequenceRunning = false;
  sequenceIndex = 0;
  sequenceTime = 0;
  currentSequenceTransform = cloneTransform(sequenceKeyframes[0].start);
}

function updateSequence(deltaSeconds) {
  if (!isSequenceRunning || sequenceKeyframes.length === 0) {
    return;
  }

  var currentStage = sequenceKeyframes[sequenceIndex];
  if (!currentStage) {
    stopSequence();
    return;
  }

  sequenceTime += deltaSeconds * animationSpeed;
  var duration = Math.max(currentStage.duration, 0.0001);
  var progress = sequenceTime / duration; // Allow progress > 1.0 temporarily for check below

  // Calculate Transform
  var calcProgress = Math.min(progress, 1.0);

  if (currentStage.custom && typeof currentStage.compute === "function") {
    currentSequenceTransform = currentStage.compute(calcProgress);
  } else {
    currentSequenceTransform = interpolateTransform(
      currentStage.start,
      currentStage.end,
      calcProgress
    );
  }

  // Check if stage is complete
  if (progress >= 1.0) {
    if (currentStage.loop) {
      sequenceTime = 0;
    } else {
      sequenceIndex += 1;
      sequenceTime = 0;
      if (sequenceIndex >= sequenceKeyframes.length) {
        stopSequence();
      }
    }
  }
}

function render(now) {
  if (typeof now === "undefined") {
    now = performance.now();
  }
  var deltaSeconds = lastFrameTime ? (now - lastFrameTime) / 1000.0 : 0;
  lastFrameTime = now;

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  modelViewMatrix = lookAt(
    vec3(0.0, 0.0, 2.0),
    vec3(0.0, 0.0, 0.0),
    vec3(0.0, 1.0, 0.0)
  );

  var modelMatrix = mat4(); // Start with Identity (No Rotation)

  // CASE 1: SEQUENCE ANIMATION
  if (isSequenceRunning) {
    updateSequence(deltaSeconds);
    modelMatrix = buildModelMatrix(currentSequenceTransform);
  }

  // CASE 2: LEFT ROTATE MODE
  else if (appliedMode === "left_rotate") {
    if (isAnimating) {
      animationAngle += 50.0 * deltaSeconds * animationSpeed;
      if (animationAngle >= 360) animationAngle -= 360;
    }
    modelMatrix = rotate(animationAngle, 0, 1, 0);
  }

  // CASE 3: MANUAL CONTROL
  else if (appliedMode === "manual") {
    modelMatrix = mult(modelMatrix, rotate(manualX, 1, 0, 0));
    modelMatrix = mult(modelMatrix, rotate(manualY, 0, 1, 0));
    modelMatrix = mult(modelMatrix, rotate(manualZ, 0, 0, 1));
  }

  // CASE 4: NONE (Default)

  modelViewMatrix = mult(modelViewMatrix, modelMatrix);

  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

  gl.drawArrays(gl.TRIANGLES, 0, points.length);

  requestAnimationFrame(render);
}

function makeL() {
  points = [];
  colors = [];

  // Front face vertices
  var frontVertices1 = [
    vec4(-0.4, -0.5, extrusionDepth, 1.0),
    vec4(-0.2, -0.5, extrusionDepth, 1.0),
    vec4(-0.2, 0.5, extrusionDepth, 1.0),
    vec4(-0.4, 0.5, extrusionDepth, 1.0),
  ];

  var frontVertices2 = [
    vec4(-0.4, -0.5, extrusionDepth, 1.0),
    vec4(0.2, -0.5, extrusionDepth, 1.0),
    vec4(0.2, -0.25, extrusionDepth, 1.0),
    vec4(-0.4, -0.25, extrusionDepth, 1.0),
  ];

  // Back face vertices
  var backVertices1 = [
    vec4(-0.4, -0.5, -extrusionDepth, 1.0),
    vec4(-0.2, -0.5, -extrusionDepth, 1.0),
    vec4(-0.2, 0.5, -extrusionDepth, 1.0),
    vec4(-0.4, 0.5, -extrusionDepth, 1.0),
  ];

  var backVertices2 = [
    vec4(-0.4, -0.5, -extrusionDepth, 1.0),
    vec4(0.2, -0.5, -extrusionDepth, 1.0),
    vec4(0.2, -0.25, -extrusionDepth, 1.0),
    vec4(-0.4, -0.25, -extrusionDepth, 1.0),
  ];

  function applyLighting(colorArr) {
    var r = Math.min(Math.max(colorArr[0] * lightingFactor, 0.0), 1.0);
    var g = Math.min(Math.max(colorArr[1] * lightingFactor, 0.0), 1.0);
    var b = Math.min(Math.max(colorArr[2] * lightingFactor, 0.0), 1.0);
    return vec4(r, g, b, colorArr[3]);
  }

  var primaryColorVec = applyLighting(primaryColor);
  var secondaryColorVec = applyLighting(secondaryColor);

  function addQuad(v1, v2, v3, v4, color) {
    points.push(v1, v2, v3);
    colors.push(color, color, color);
    points.push(v1, v3, v4);
    colors.push(color, color, color);
  }

  function addSideFaces(
    frontV1,
    frontV2,
    frontV3,
    frontV4,
    backV1,
    backV2,
    backV3,
    backV4,
    color
  ) {
    addQuad(frontV1, frontV2, backV2, backV1, color);
    addQuad(frontV2, frontV3, backV3, backV2, color);
    addQuad(frontV3, frontV4, backV4, backV3, color);
    addQuad(frontV4, frontV1, backV1, backV4, color);
  }

  // Front faces
  addQuad(
    frontVertices1[0],
    frontVertices1[1],
    frontVertices1[2],
    frontVertices1[3],
    primaryColorVec
  );
  addQuad(
    frontVertices2[0],
    frontVertices2[1],
    frontVertices2[2],
    frontVertices2[3],
    primaryColorVec
  );

  // Back faces
  addQuad(
    backVertices1[3],
    backVertices1[2],
    backVertices1[1],
    backVertices1[0],
    secondaryColorVec
  );
  addQuad(
    backVertices2[3],
    backVertices2[2],
    backVertices2[1],
    backVertices2[0],
    secondaryColorVec
  );

  // Side faces
  var sideColor = vec4(
    (primaryColor[0] + secondaryColor[0]) / 2,
    (primaryColor[1] + secondaryColor[1]) / 2,
    (primaryColor[2] + secondaryColor[2]) / 2,
    1.0
  );
  addSideFaces(
    frontVertices1[0],
    frontVertices1[1],
    frontVertices1[2],
    frontVertices1[3],
    backVertices1[0],
    backVertices1[1],
    backVertices1[2],
    backVertices1[3],
    sideColor
  );
  addSideFaces(
    frontVertices2[0],
    frontVertices2[1],
    frontVertices2[2],
    frontVertices2[3],
    backVertices2[0],
    backVertices2[1],
    backVertices2[2],
    backVertices2[3],
    sideColor
  );

  // === Create buffers ===
  var posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  var colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
  var vColor = gl.getAttribLocation(program, "vColor");
  gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vColor);
}

// UI Control Functions
function setupUIControls() {
  // Get UI elements
  var textInput = document.getElementById("text_input"); //attention
  var extrusionSlider = document.getElementById("extrusion_slider");
  var speedSlider = document.getElementById("speed_slider");
  var colorPicker1 = document.getElementById("color_picker");
  var colorPicker2 = document.getElementById("color_picker_2");
  var presetSelect = document.getElementById("color_preset");
  var playPauseButton = document.getElementById("play_pause_button");
  var rotationSelect = document.getElementById("rotation_sequence_select");
  var applyRotationButton = document.getElementById("apply_rotation_button");
  var lightingModeSelect = document.getElementById("lighting_mode_select");
  var applyLightingButton = document.getElementById("apply_lighting_button");
  var resetButton = document.getElementById("reset_button");
  var extrusionValueDisplay = document.getElementById("extrusion_value");
  var speedValueDisplay = document.getElementById("speed_value");
  var rotationXSlider = document.getElementById("rot_x");
  var rotationYSlider = document.getElementById("rot_y");
  var rotationZSlider = document.getElementById("rot_z");

  // Function to update extrusion depth display and enforce limits
  function updateExtrusionDepth(newDepth) {
    extrusionDepth = Math.max(0.0, Math.min(0.5, newDepth));
    extrusionValueDisplay.textContent = extrusionDepth.toFixed(2);
    if (extrusionSlider) {
      extrusionSlider.value = extrusionDepth;
    }
    makeL();
  }

  // Function to update speed display and enforce limits
  function updateSpeed(newSpeed) {
    animationSpeed = Math.max(0.1, Math.min(5.0, newSpeed));
    speedValueDisplay.textContent = animationSpeed.toFixed(1);
    if (speedSlider) {
      speedSlider.value = animationSpeed;
    }
  }

  // Helper functions
  function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16) / 255.0,
          parseInt(result[2], 16) / 255.0,
          parseInt(result[3], 16) / 255.0,
          1.0,
        ]
      : [1.0, 0.0, 0.0, 1.0];
  }

  function rgbToHex(rgb) {
    var r = Math.round(rgb[0] * 255)
      .toString(16)
      .padStart(2, "0");
    var g = Math.round(rgb[1] * 255)
      .toString(16)
      .padStart(2, "0");
    var b = Math.round(rgb[2] * 255)
      .toString(16)
      .padStart(2, "0");
    return "#" + r + g + b;
  }

  function randomColor() {
    return [Math.random(), Math.random(), Math.random(), 1.0];
  }

  function applyColorPreset(preset) {
    switch (preset) {
      case "sunset_glow":
        // Warm, cinema-style colors
        primaryColor = [1.0, 0.5, 0.2, 1.0]; // sunset orange
        secondaryColor = [0.9, 0.2, 0.4, 1.0]; // rosy pink
        break;
      case "ocean_wave":
        // Comforting blue-green gradient
        primaryColor = [0.0, 0.6, 0.9, 1.0]; // ocean blue
        secondaryColor = [0.0, 0.85, 0.7, 1.0]; // turquoise
        break;
      case "galaxy_mix":
        // Cosmic neon look
        primaryColor = [0.4, 0.0, 0.6, 1.0]; // violet
        secondaryColor = [0.0, 0.8, 1.0, 1.0]; // neon cyan
        break;
      case "candy_pastel":
        // Soft, pretty pastel tones
        primaryColor = [1.0, 0.75, 0.85, 1.0]; // pink pastel
        secondaryColor = [0.7, 0.9, 1.0, 1.0]; // blue pastel
        break;
      case "random":
        primaryColor = randomColor();
        secondaryColor = randomColor();
        break;
    }
    colorPicker1.value = rgbToHex(primaryColor);
    colorPicker2.value = rgbToHex(secondaryColor);
    makeL();
  }

  function updatePlayPauseButton() {
    var isRunning = isSequenceRunning || isAnimating;
    if (isRunning) {
      // Stop state (red)
      playPauseButton.classList.remove("play_state");
      playPauseButton.classList.add("pause_state");
      playPauseButton.textContent = "Stop";
    } else {
      // Start state (green)
      playPauseButton.classList.remove("pause_state");
      playPauseButton.classList.add("play_state");
      playPauseButton.textContent = "Start";
    }
  }

  // Event listeners
  // Text input  attention
  textInput.addEventListener("input", function (e) {
    customText = e.target.value || "L";
    makeL();
  });

  // Extrusion depth slider
  extrusionSlider.addEventListener("input", function (e) {
    var newDepth = parseFloat(e.target.value);
    updateExtrusionDepth(newDepth);
  });

  // Animation speed slider
  speedSlider.addEventListener("input", function (e) {
    var newSpeed = parseFloat(e.target.value);
    updateSpeed(newSpeed);
  });

  colorPicker1.addEventListener("input", function (e) {
    primaryColor = hexToRgb(e.target.value);
    presetSelect.value = "custom";
    makeL();
  });

  colorPicker2.addEventListener("input", function (e) {
    secondaryColor = hexToRgb(e.target.value);
    presetSelect.value = "custom";
    makeL();
  });

  presetSelect.addEventListener("change", function (e) {
    if (e.target.value !== "custom") {
      applyColorPreset(e.target.value);
    }
  });

  playPauseButton.addEventListener("click", function () {
    if (appliedMode === "sequence") {
      isSequenceRunning = !isSequenceRunning;
      isAnimating = false;
    } else if (appliedMode === "manual") {
      // doesn't play
    } else if (appliedMode === "left_rotate") {
      isAnimating = !isAnimating; // Toggle spin for Left Rotate
    }
    // If appliedMode is "none", clicking start does nothing (or you can make it alert user)

    updatePlayPauseButton();
  });

  rotationXSlider.addEventListener("input", function (e) {
    manualX = e.target.value;
  });

  rotationYSlider.addEventListener("input", function (e) {
    manualY = e.target.value;
  });

  rotationZSlider.addEventListener("input", function (e) {
    manualZ = e.target.value;
  });

  if (applyRotationButton) {
    if (applyLightingButton) {
      applyLightingButton.addEventListener("click", function () {
        var selectedMode = lightingModeSelect
          ? lightingModeSelect.value
          : "neutral";
        lightingMode = selectedMode;
        switch (selectedMode) {
          case "soft_glow":
            lightingFactor = 1.2;
            break;
          case "dramatic":
            lightingFactor = 0.8;
            break;
          default:
            lightingFactor = 1.0;
            break;
        }
        makeL();
      });
    }
    if (applyRotationButton) {
      applyRotationButton.addEventListener("click", function () {
        var selected = rotationSelect.value;
        isSequenceRunning = false; // Stop any running sequence
        isAnimating = false; // Stop the auto-spin

        if (selected === "manual_360") {
          appliedMode = "manual";
          isManualRotation = true;
        } else if (selected === "left_rotate") {
          appliedMode = "left_rotate";
          isManualRotation = false;
        } else {
          appliedMode = "sequence";
          isManualRotation = false;

          if (selected === "tv_ident_seq") {
            sequenceKeyframes = tvIdentKeyframes;
          } else {
            sequenceKeyframes = assignmentKeyframes;
          }

          startSequence();
          isSequenceRunning = false; // Pause immediately
        }

        updatePlayPauseButton();
      });
    }

    // Initialize button state
    updatePlayPauseButton();

    resetButton.addEventListener("click", function () {
      animationAngle = 0;
      animationSpeed = 1.0;
      extrusionDepth = 0.1;
      primaryColor = [1.0, 0.0, 0.0, 1.0];
      secondaryColor = [0.0, 1.0, 0.0, 1.0];
      customText = "L";

      // Reset Modes
      stopSequence();
      appliedMode = "none"; // Go back to default/static state
      isManualRotation = false;
      isAnimating = false;

      lightingMode = "neutral";
      lightingFactor = 1.0;
      manualX = 0;
      manualY = 0;
      manualZ = 0;

      // Reset text input
      textInput.value = customText; // attention

      // Reset sliders
      extrusionSlider.value = extrusionDepth;
      speedSlider.value = animationSpeed;
      rotationXSlider.value = 0;
      rotationYSlider.value = 0;
      rotationZSlider.value = 0;

      updateExtrusionDepth(extrusionDepth);
      updateSpeed(animationSpeed);
      colorPicker1.value = "#ff0000";
      colorPicker2.value = "#00ff00";
      presetSelect.value = "custom";
      if (typeof window.refreshColorCircles === "function") {
        window.refreshColorCircles();
      }

      makeL();
    });

    // Keyboard events
    window.addEventListener("keydown", function (e) {
      switch (e.code) {
        case "Space":
          e.preventDefault();
          isAnimating = !isAnimating;
          updatePlayPauseButton();
          break;
        case "KeyR":
          resetButton.click();
          break;
      }
    });

    // Window resize event (maintain aspect ratio)
    window.addEventListener("resize", resizeCanvasMaintainingAspect);
  }
}
