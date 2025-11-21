'use strict';

var gl, program, canvas;
var points = [];
var colors = [];

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

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
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    modelViewMatrix = lookAt(
        vec3(0.0, 0.0, 2.0),
        vec3(0.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0)
    );

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    gl.drawArrays(gl.TRIANGLES, 0, points.length);
}

function makeL(){
    // Vertical rectangle
    var vertices1 = [
        vec4(-0.4, -0.5,  0.0, 1.0),
        vec4(-0.2, -0.5,  0.0, 1.0),
        vec4(-0.2,  0.5,  0.0, 1.0),
        vec4(-0.4,  0.5,  0.0, 1.0)
    ];

    // Horizontal rectangle
    var vertices2 = [
        vec4(-0.4, -0.5,  0.0, 1.0),
        vec4( 0.2, -0.5,  0.0, 1.0),
        vec4( 0.2, -0.25,  0.0, 1.0),
        vec4(-0.4, -0.25,  0.0, 1.0)
    ];

    var vertexColors = [
        vec4(1.0, 0.0, 0.0, 1.0), // Red
        vec4(0.0, 1.0, 0.0, 1.0), // Green
        vec4(0.0, 0.0, 1.0, 1.0), // Blue
        vec4(1.0, 1.0, 0.0, 1.0)  // Yellow
    ];

    // Vertical rectangle (two triangles)
    points.push(vertices1[0], vertices1[1], vertices1[2]);
    colors.push(vertexColors[0], vertexColors[0], vertexColors[0]);
    points.push(vertices1[0], vertices1[2], vertices1[3]);
    colors.push(vertexColors[0], vertexColors[0], vertexColors[0]);

    // Horizontal rectangle (two triangles)
    points.push(vertices2[0], vertices2[1], vertices2[2]);
    colors.push(vertexColors[0], vertexColors[0], vertexColors[0]);
    points.push(vertices2[0], vertices2[2], vertices2[3]);
    colors.push(vertexColors[0], vertexColors[0], vertexColors[0]);    

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

