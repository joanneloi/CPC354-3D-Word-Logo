'use strict';

var gl, program, canvas;
var points = [];
var colors = [];

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

// Animation and control variables
var animationAngle = 0;
var isAnimating = true;
var animationSpeed = 1.0;
var extrusionDepth = 0.1;
var primaryColor = [1.0, 0.0, 0.0, 1.0];
var secondaryColor = [0.0, 1.0, 0.0, 1.0];

window.onload = function init()
{
    getUIElement();
    configWebGL();
    makeL();
    render();
}

function getUIElement(){
    canvas = document.getElementById("gl-canvas");
}

// Configure WebGL Settings
function configWebGL(){
    gl = canvas.getContext('webgl2');
    if(!gl){
        alert("WebGL 2.0 isn't available");
    }

    // Viewport and clear color
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Compile shaders
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Get uniform locations
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");

    // Set up the projection matrix
    projectionMatrix = perspective(45.0, canvas.width/canvas.height, 0.1, 100.0);
}

function render(){
    if(isAnimating) {
        animationAngle += 0.5 * animationSpeed;
        if(animationAngle >= 360) animationAngle -= 360;
    }
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create rotation matrix
    var rotationMatrix = rotate(animationAngle, 0, 1, 0);
    
    modelViewMatrix = lookAt(
        vec3(0.0, 0.0, 2.0),
        vec3(0.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0)
    );
    modelViewMatrix = mult(modelViewMatrix, rotationMatrix);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    gl.drawArrays(gl.TRIANGLES, 0, points.length);
    
    requestAnimationFrame(render);
}

function makeL(){
    points = [];
    colors = [];
    
    // Front face vertices
    var frontVertices1 = [
        vec4(-0.4, -0.5,  extrusionDepth, 1.0),
        vec4(-0.2, -0.5,  extrusionDepth, 1.0),
        vec4(-0.2,  0.5,  extrusionDepth, 1.0),
        vec4(-0.4,  0.5,  extrusionDepth, 1.0)
    ];

    var frontVertices2 = [
        vec4(-0.4, -0.5,  extrusionDepth, 1.0),
        vec4( 0.2, -0.5,  extrusionDepth, 1.0),
        vec4( 0.2, -0.25, extrusionDepth, 1.0),
        vec4(-0.4, -0.25, extrusionDepth, 1.0)
    ];

    // Back face vertices
    var backVertices1 = [
        vec4(-0.4, -0.5, -extrusionDepth, 1.0),
        vec4(-0.2, -0.5, -extrusionDepth, 1.0),
        vec4(-0.2,  0.5, -extrusionDepth, 1.0),
        vec4(-0.4,  0.5, -extrusionDepth, 1.0)
    ];

    var backVertices2 = [
        vec4(-0.4, -0.5, -extrusionDepth, 1.0),
        vec4( 0.2, -0.5, -extrusionDepth, 1.0),
        vec4( 0.2, -0.25, -extrusionDepth, 1.0),
        vec4(-0.4, -0.25, -extrusionDepth, 1.0)
    ];

    var primaryColorVec = vec4(primaryColor[0], primaryColor[1], primaryColor[2], primaryColor[3]);
    var secondaryColorVec = vec4(secondaryColor[0], secondaryColor[1], secondaryColor[2], secondaryColor[3]);

    function addQuad(v1, v2, v3, v4, color) {
        points.push(v1, v2, v3);
        colors.push(color, color, color);
        points.push(v1, v3, v4);
        colors.push(color, color, color);
    }

    function addSideFaces(frontV1, frontV2, frontV3, frontV4, backV1, backV2, backV3, backV4, color) {
        addQuad(frontV1, frontV2, backV2, backV1, color);
        addQuad(frontV2, frontV3, backV3, backV2, color);
        addQuad(frontV3, frontV4, backV4, backV3, color);
        addQuad(frontV4, frontV1, backV1, backV4, color);
    }

    // Front faces
    addQuad(frontVertices1[0], frontVertices1[1], frontVertices1[2], frontVertices1[3], primaryColorVec);
    addQuad(frontVertices2[0], frontVertices2[1], frontVertices2[2], frontVertices2[3], primaryColorVec);

    // Back faces
    addQuad(backVertices1[3], backVertices1[2], backVertices1[1], backVertices1[0], secondaryColorVec);
    addQuad(backVertices2[3], backVertices2[2], backVertices2[1], backVertices2[0], secondaryColorVec);

    // Side faces
    var sideColor = vec4(
        (primaryColor[0] + secondaryColor[0]) / 2,
        (primaryColor[1] + secondaryColor[1]) / 2,
        (primaryColor[2] + secondaryColor[2]) / 2,
        1.0
    );
    addSideFaces(
        frontVertices1[0], frontVertices1[1], frontVertices1[2], frontVertices1[3],
        backVertices1[0], backVertices1[1], backVertices1[2], backVertices1[3],
        sideColor
    );
    addSideFaces(
        frontVertices2[0], frontVertices2[1], frontVertices2[2], frontVertices2[3],
        backVertices2[0], backVertices2[1], backVertices2[2], backVertices2[3],
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

function rectangle(){
    var vertices = [
        vec4(-0.5, -0.5,  0.0, 1.0),
        vec4( 0.5, -0.5,  0.0, 1.0),
        vec4( 0.5,  0.5,  0.0, 1.0),
        vec4(-0.5,  0.5,  0.0, 1.0)
    ];

    var vertexColors = [
        vec4(1.0, 0.0, 0.0, 1.0), // Red
        vec4(0.0, 1.0, 0.0, 1.0), // Green
        vec4(0.0, 0.0, 1.0, 1.0), // Blue
        vec4(1.0, 1.0, 0.0, 1.0)  // Yellow
    ];

    // Two triangles for a square
    points.push(vertices[0], vertices[1], vertices[2]);
    colors.push(vertexColors[0], vertexColors[1], vertexColors[2]);
    points.push(vertices[0], vertices[2], vertices[3]);
    colors.push(vertexColors[0], vertexColors[2], vertexColors[3]);

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

