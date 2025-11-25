'use strict';

var gl, program, canvas;
var points = [];
var colors = [];
var object = [];

var modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;

var vPosition, vColor, vNormal;

// Animation and control variables
var animationAngle = 0;
var isAnimating = false; //default pause
var animationSpeed = 1.0;
var extrusionDepth = 0.1;
var appliedMode = "none"; // "none", "manual", "sequence", "left_rotate"
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

window.onload = function init(){
    configWebGL();
    makeLetter();
    setupUIControls();
    render();
}

// Configure WebGL Settings
function configWebGL(){
    canvas = document.getElementById("gl_canvas");
    gl = canvas.getContext('webgl2');
    if(!gl){
        alert("WebGL 2.0 isn't available");
    }
    // Compile shaders
    program = initShaders(gl, "vertex_shader", "fragment_shader");
    gl.useProgram(program);

    vPosition = gl.getAttribLocation(program, "vPosition");
    vColor = gl.getAttribLocation(program, "vColor");
    vNormal = gl.getAttribLocation(program, "vNormal");

    // Get uniform locations
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");

    // Set up the projection matrix
    resizeCanvasMaintainingAspect();
}

function resizeCanvasMaintainingAspect() {
    if(!gl || !canvas) {
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

    // Viewport and clear color
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    projectionMatrix = perspective(45.0, targetAspectRatio, 0.1, 100.0);
}

function createTransform(rotation, position, scale) {
    return {
        rotation: rotation || 0,
        position: position ? [position[0], position[1], position[2]] : [0, 0, 0],
        scale: scale === undefined ? 1.0 : scale
    };
}

function cloneTransform(transform) {
    return createTransform(transform.rotation, transform.position, transform.scale);
}

function interpolateTransform(start, end, t) {
    var lerp = function(a, b, progress) { return a + (b - a) * progress; };
    return createTransform(
        lerp(start.rotation, end.rotation, t),
        [
            lerp(start.position[0], end.position[0], t),
            lerp(start.position[1], end.position[1], t),
            lerp(start.position[2], end.position[2], t)
        ],
        lerp(start.scale, end.scale, t)
    );
}

function buildModelMatrix(transform) {
    var translationMatrix = translate(transform.position[0], transform.position[1], transform.position[2]);
    var rotationMatrix = rotate(transform.rotation, 0, 1, 0);
    var s = transform.scale;
    var scaleMatrix = mat4(
        s, 0, 0, 0,
        0, s, 0, 0,
        0, 0, s, 0,
        0, 0, 0, 1
    );
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

function offsetVertex(vertex, xOffset) {
    return vec4(vertex[0] + xOffset, vertex[1], vertex[2], vertex[3]);
}

// UI Control Functions
function setupUIControls() {
    // Get UI elements
    var textInput = document.getElementById("text_input");  //attention
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
        if(extrusionSlider) {
            extrusionSlider.value = extrusionDepth;
        }
        makeLetter();
    }
    
    // Function to update speed display and enforce limits
    function updateSpeed(newSpeed) {
        animationSpeed = Math.max(0.1, Math.min(5.0, newSpeed));
        speedValueDisplay.textContent = animationSpeed.toFixed(1);
        if(speedSlider) {
            speedSlider.value = animationSpeed;
        }
    }

    // Helper functions
    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255.0,
            parseInt(result[2], 16) / 255.0,
            parseInt(result[3], 16) / 255.0,
            1.0
        ] : [1.0, 0.0, 0.0, 1.0];
    }

    function rgbToHex(rgb) {
        var r = Math.round(rgb[0] * 255).toString(16).padStart(2, '0');
        var g = Math.round(rgb[1] * 255).toString(16).padStart(2, '0');
        var b = Math.round(rgb[2] * 255).toString(16).padStart(2, '0');
        return '#' + r + g + b;
    }

    function randomColor() {
        return [
            Math.random(),
            Math.random(),
            Math.random(),
            1.0
        ];
    }

    function applyColorPreset(preset) {
        switch(preset) {
            case 'sunset_glow':
                // Warm, cinema-style colors
                primaryColor = [1.0, 0.5, 0.2, 1.0];   // sunset orange
                secondaryColor = [0.9, 0.2, 0.4, 1.0];   // rosy pink
                break;
            case 'ocean_wave':
                // Comforting blue-green gradient
                primaryColor = [0.0, 0.6, 0.9, 1.0];   // ocean blue
                secondaryColor = [0.0, 0.85, 0.7, 1.0];  // turquoise
                break;
            case 'galaxy_mix':
                // Cosmic neon look
                primaryColor = [0.4, 0.0, 0.6, 1.0];   // violet
                secondaryColor = [0.0, 0.8, 1.0, 1.0];   // neon cyan
                break;
            case 'candy_pastel':
                // Soft, pretty pastel tones
                primaryColor = [1.0, 0.75, 0.85, 1.0]; // pink pastel
                secondaryColor = [0.7, 0.9, 1.0, 1.0];   // blue pastel
                break;
            case 'random':
                primaryColor = randomColor();
                secondaryColor = randomColor();
                break;
        }
        colorPicker1.value = rgbToHex(primaryColor);
        colorPicker2.value = rgbToHex(secondaryColor);
        makeLetter();
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
    textInput.addEventListener('input', function(e) {
        customText = e.target.value || "L";
        makeLetter();
    });

    // Extrusion depth slider
    extrusionSlider.addEventListener('input', function(e) {
        var newDepth = parseFloat(e.target.value);
        updateExtrusionDepth(newDepth);
    });

    // Animation speed slider
    speedSlider.addEventListener('input', function(e) {
        var newSpeed = parseFloat(e.target.value);
        updateSpeed(newSpeed);
    });

    colorPicker1.addEventListener('input', function(e) {
        primaryColor = hexToRgb(e.target.value);
        presetSelect.value = 'custom';
        makeLetter();
    });

    colorPicker2.addEventListener('input', function(e) {
        secondaryColor = hexToRgb(e.target.value);
        presetSelect.value = 'custom';
        makeLetter();
    });

    presetSelect.addEventListener('change', function(e) {
        if(e.target.value !== 'custom') {
            applyColorPreset(e.target.value);
        }
    });

    playPauseButton.addEventListener("click", function () {
        if (appliedMode === "sequence") {
            isSequenceRunning = !isSequenceRunning;
            isAnimating = false;
        } else if (appliedMode === "manual") {
            // Manual usually doesn't play
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
                makeLetter();
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
        if (lightingModeSelect) {
            lightingModeSelect.value = "neutral";
        }
        makeLetter();
    });

    // Keyboard events
    window.addEventListener('keydown', function(e) {
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                isAnimating = !isAnimating;
                updatePlayPauseButton();
                break;
            case 'KeyR':
                resetButton.click();
                break;
        }
    });

    // Window resize event (maintain aspect ratio)
    window.addEventListener('resize', resizeCanvasMaintainingAspect);
}

//----------------new 3D letter generation code----------------//
function makeLetter() {
    object = []; // reset all objects

    var text = customText.toUpperCase();
    var letterSpacing = 1.0; // spacing between letters
    var totalWidth = text.length * letterSpacing;
    var startXOffset = -totalWidth / 2 + letterSpacing / 2;

    for (let i = 0; i < text.length; i++) {
        let letter = text.charAt(i);
        let letterObj;

        // Create the letter object
        switch (letter) {
            case 'L':
                letterObj = makeL();
                break;
            case 'E':
                letterObj = makeE();
                break;
            case 'V':
                letterObj = makeV();
                break;
            case 'O':
                letterObj = makeO();
                break;
            default:
                letterObj = makeL();
                break;
        }

        // Apply X-offset as a per-object model matrix
        letterObj.modelMatrix = translate(startXOffset + i * letterSpacing, 0, 0);

        object.push(letterObj);
    }
}

// Example makeL() using extrudeIndexed
function makeL() {
    let L2D = [
        [ vec2(-0.4,-0.5), vec2(-0.2,-0.5), vec2(-0.2,0.5), vec2(-0.4,0.5) ],
        [ vec2(-0.4,-0.5), vec2(0.2,-0.5), vec2(0.2,-0.25), vec2(-0.4,-0.25) ]
    ];

    return extrudeIndexed(L2D, extrusionDepth,
        primaryColor, secondaryColor, secondaryColor);
}

// Example makeE()
function makeE() {
    let E2D = [
        [ vec2(-0.4,-0.5), vec2(-0.2,-0.5), vec2(-0.2,0.5), vec2(-0.4,0.5) ],
        [ vec2(-0.4, 0.3), vec2(0.15,0.3), vec2(0.15,0.5), vec2(-0.4,0.5) ],
        [ vec2(-0.4,-0.1), vec2(0.15,-0.1), vec2(0.15,0.1), vec2(-0.4,0.1) ],
        [ vec2(-0.4,-0.5), vec2(0.2,-0.5), vec2(0.2,-0.3), vec2(-0.4,-0.3) ]
    ];

    return extrudeIndexed(E2D, extrusionDepth,
        primaryColor, secondaryColor, secondaryColor);
}

// Example makeV()
function makeV() {
    let V2D = [
        [ vec2(-0.4,0.5), vec2(-0.2,0.5), vec2(0.0,-0.5), vec2(-0.25,-0.5) ],
        [ vec2(0.2,0.5), vec2(0.4,0.5), vec2(0.25,-0.5), vec2(0.0,-0.5) ],
        [ vec2(-0.25,-0.5), vec2(0.25,-0.5), vec2(0.25,-0.55), vec2(-0.25,-0.55) ]
    ];

    return extrudeIndexed(V2D, extrusionDepth,
        primaryColor, secondaryColor, secondaryColor);
}

function makeO() {
    let loops = generateOOutline(64, 0.5, 0.25);
    return extrudeIndexed(loops, extrusionDepth, 
        primaryColor, secondaryColor, secondaryColor);
}

function generateOOutline(segments, outerRadius, innerRadius) {
    let loops = [];
    let outer = [], inner = [];
    for (let i = 0; i < segments; ++i) {
        let t = 2*Math.PI*i/segments;
        outer.push(vec2(Math.cos(t)*outerRadius, Math.sin(t)*outerRadius));
        inner.push(vec2(Math.cos(t)*innerRadius, Math.sin(t)*innerRadius));
    }
    inner.reverse();
    loops.push(outer);
    loops.push(inner);
    return loops;
}

function extrudeIndexed(loops2D, depth, colorFront, colorBack, colorSide) {
    let positions = [], normals = [], colors = [], indices = [];
    let index = 0;

    function addVertex(p, n, c) {
        positions.push(p[0], p[1], p[2], 1.0);
        normals.push(n[0], n[1], n[2]);
        colors.push(c[0], c[1], c[2], c[3]);
        return index++;
    }

    // FRONT & BACK faces
    for (let k = 0; k < loops2D.length; k++) {
        let loop = loops2D[k];

        for (let i = 1; i < loop.length-1; i++) {
            let v0f = addVertex([loop[0][0], loop[0][1], depth], [0,0,1], colorFront);
            let v1f = addVertex([loop[i][0], loop[i][1], depth], [0,0,1], colorFront);
            let v2f = addVertex([loop[i+1][0], loop[i+1][1], depth], [0,0,1], colorFront);
            indices.push(v0f, v1f, v2f);

            let v0b = addVertex([loop[0][0], loop[0][1], -depth], [0,0,-1], colorBack);
            let v1b = addVertex([loop[i+1][0], loop[i+1][1], -depth], [0,0,-1], colorBack);
            let v2b = addVertex([loop[i][0], loop[i][1], -depth], [0,0,-1], colorBack);
            indices.push(v0b, v1b, v2b);
        }
    }

    // SIDE walls
    for (let k = 0; k < loops2D.length; k++) {
        let loop = loops2D[k];
        for (let i = 0; i < loop.length; i++) {
            let j = (i+1)%loop.length;
            let dx = loop[j][0]-loop[i][0];
            let dy = loop[j][1]-loop[i][1];
            let len = Math.sqrt(dx*dx+dy*dy);
            let nx = dy/len, ny = -dx/len;
            let sideNormal = [nx, ny, 0];

            let v0 = addVertex([loop[i][0], loop[i][1], depth], sideNormal, colorSide);
            let v1 = addVertex([loop[j][0], loop[j][1], depth], sideNormal, colorSide);
            let v2 = addVertex([loop[j][0], loop[j][1], -depth], sideNormal, colorSide);
            let v3 = addVertex([loop[i][0], loop[i][1], -depth], sideNormal, colorSide);

            indices.push(v0,v1,v2, v0,v2,v3);
        }
    }

    let data = { numIndices: indices.length };
    data.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, data.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    data.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, data.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    data.colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, data.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    data.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, data.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return data;
}

function render(now) {
    if (typeof now === "undefined") now = performance.now();
    let deltaSeconds = lastFrameTime ? (now - lastFrameTime)/1000 : 0;
    lastFrameTime = now;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Base camera
    modelViewMatrix = lookAt(
        vec3(0,0,3),
        vec3(0,0,0),
        vec3(0,1,0)
    );

    let baseModelMatrix = mat4();

    // Apply animation mode
    if (isSequenceRunning) {
        updateSequence(deltaSeconds);
        baseModelMatrix = buildModelMatrix(currentSequenceTransform);
    } else if (appliedMode === "left_rotate") {
        if (isAnimating) {
            animationAngle += 50 * deltaSeconds * animationSpeed;
            if (animationAngle >= 360) animationAngle -= 360;
        }
        baseModelMatrix = rotate(animationAngle, 0, 1, 0);
    } else if (appliedMode === "manual") {
        baseModelMatrix = mult(baseModelMatrix, rotate(manualX, 1, 0, 0));
        baseModelMatrix = mult(baseModelMatrix, rotate(manualY, 0, 1, 0));
        baseModelMatrix = mult(baseModelMatrix, rotate(manualZ, 0, 0, 1));
    }

    modelViewMatrix = mult(modelViewMatrix, baseModelMatrix);

    // Draw all letters
    for (let i = 0; i < object.length; i++) {
        let obj = object[i];

        let finalMatrix = mult(modelViewMatrix, obj.modelMatrix);

        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(finalMatrix));
        gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
        gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix(finalMatrix)));

        gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer);
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
        gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, obj.colorBuffer);
        gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vColor);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
        gl.drawElements(gl.TRIANGLES, obj.numIndices, gl.UNSIGNED_SHORT, 0);
    }

    requestAnimationFrame(render);
}
