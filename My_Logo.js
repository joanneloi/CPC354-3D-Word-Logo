'use strict';

var gl, program, canvas;
var glFrontCount = 0;
var glBackCount = 0;
var glSideCount = 0;

var outerVerts = [];
var innerVerts = [];
var outerColors = [];
var innerColors = [];
var outerBuffer;
var innerBuffer;
var outerColorBuffer;
var innerColorBuffer;
var aPosition;
var uColor;

var points = [];
var colors = [];

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

window.onload = function init()
{
    getUIElement();
    configWebGL();
    makeC();
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

    // Add this line:
    uColor = gl.getUniformLocation(program, "uColor");   // <-- FIXED

    // Get uniform locations
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");

    // Set up the projection matrix
    projectionMatrix = perspective(45.0, canvas.width/canvas.height, 0.1, 100.0);
}

function makeCWithFan() {
    let center = vec4(0, 0, 0, 1);
    let outerRadius = 0.5;
    let innerRadius = 0.3;
    let segments = 30;
    let startAngle = 0.25 * Math.PI;   // 45°
    let endAngle   = 1.75 * Math.PI;   // 315°

    points = [];
    colors = [];

    // Outer arc fan
    points.push(center);
    colors.push(vec4(1,0,0,1)); // red center

    for(let i=0; i <= segments; i++){
        let theta = startAngle + (endAngle - startAngle) * i / segments;
        let x = innerRadius * Math.cos(theta);
        let y = outerRadius * Math.sin(theta);
        points.push(vec4(x, y, 0.0, 1.0));
        colors.push(vec4(1,0,0,1)); // red
    }

    // Create buffers
    var posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "uColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
}

function make3DC() {
    let outerRadius = 0.5;
    let innerRadius = 0.2;
    let depth = 0.2;           // thickness in Z
    let segments = 50;         // more segments = smoother
    let startAngle = 0.25 * Math.PI;
    let endAngle = 1.75 * Math.PI;

    let frontOuter = [];
    let frontInner = [];
    let backOuter = [];
    let backInner = [];

    // Generate points
    for (let i = 0; i <= segments; i++) {
        let theta = startAngle + (endAngle - startAngle) * i / segments;

        // Front face
        frontOuter.push(vec4(outerRadius * Math.cos(theta), outerRadius * Math.sin(theta), depth/2, 1.0));
        frontInner.push(vec4(innerRadius * Math.cos(theta), innerRadius * Math.sin(theta), depth/2, 1.0));

        // Back face
        backOuter.push(vec4(outerRadius * Math.cos(theta), outerRadius * Math.sin(theta), -depth/2, 1.0));
        backInner.push(vec4(innerRadius * Math.cos(theta), innerRadius * Math.sin(theta), -depth/2, 1.0));
    }

    points = [];
    colors = [];

    // --- Front Face (TRIANGLE_FAN) ---
    points.push(vec4(0, 0, depth/2, 1.0));      // center
    colors.push(vec4(1,0,0,1));
    for (let v of frontOuter) { points.push(v); colors.push(vec4(1,0,0,1)); }
    glFrontCount = points.length;

    // --- Back Face (TRIANGLE_FAN) ---
    let backCenterIndex = points.length;
    points.push(vec4(0,0,-depth/2,1.0)); 
    colors.push(vec4(1,0,0,1));
    for (let v of backOuter) { points.push(v); colors.push(vec4(1,0,0,1)); }
    glBackCount = points.length - backCenterIndex;

    // --- Side Walls (TRIANGLE_STRIP) ---
    for (let i = 0; i <= segments; i++) {
        // Outer wall
        points.push(frontOuter[i]); colors.push(vec4(0,1,0,1));
        points.push(backOuter[i]);  colors.push(vec4(0,1,0,1));
        // Inner wall
        points.push(backInner[i]);  colors.push(vec4(0,1,0,1));
        points.push(frontInner[i]); colors.push(vec4(0,1,0,1));
    }
    glSideCount = points.length - glFrontCount - glBackCount;

    // --- Upload buffers ---
    var posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    var vColor = gl.getUniformLocation(program, "uColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
}

function makeC() {
    let outerR = 0.5;
    let innerR = 0.3;
    let segments = 100;
    let startAngle = 0.25 * Math.PI;
    let endAngle   = 1.75 * Math.PI;

    outerVerts = [];
    innerVerts = [];

    // CENTER OF FAN
    outerVerts.push(0,0);
    innerVerts.push(0,0);
    outerColors.push(1.0, 0.0, 0.0, 1.0); // near-black center
    innerColors.push(0.984,0.969,0.949,1.0); // off-white center

    // Outer C Fan
    for (let i = 0; i <= segments; i++) {
        let theta = startAngle + (endAngle - startAngle) * i / segments;
        let x = outerR * Math.cos(theta);
        let y = outerR * Math.sin(theta);
        outerVerts.push(x, y);
    }

    // Inner C Fan (reverse direction)
    innerVerts.push(0,0);
    for (let i = segments; i >= 0; i--) {
        let theta = startAngle + (endAngle - startAngle) * i / segments;
        let x = innerR * Math.cos(theta);
        let y = innerR * Math.sin(theta);
        innerVerts.push(x, y);
    }

    // === Create Buffers ===
    outerBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, outerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(outerVerts), gl.STATIC_DRAW);

    outerColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, outerColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(outerColors), gl.STATIC_DRAW);

    innerBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, innerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(innerVerts), gl.STATIC_DRAW);

    innerColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, innerColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(innerColors), gl.STATIC_DRAW);

    // Attribute location
    aPosition = gl.getAttribLocation(program, "vPosition");
    uColor = gl.getUniformLocation(program, "uColor");

}


function makeLogo3D() {

    var depth = -0.1;

    // FRONT rectangle
    var front = [
        vec4(-0.2, -0.5, 0.0, 1.0),
        vec4( 0.0, -0.5, 0.0, 1.0),
        vec4( 0.0,  0.5, 0.0, 1.0),
        vec4(-0.2,  0.5, 0.0, 1.0)
    ];

    // BACK rectangle
    var back = [
        vec4(-0.2, -0.5, depth, 1.0),
        vec4( 0.0, -0.5, depth, 1.0),
        vec4( 0.0,  0.5, depth, 1.0),
        vec4(-0.2,  0.5, depth, 1.0)
    ];

        var vertexColors = [
        vec4(1.0, 0.0, 0.0, 1.0), // Red
        vec4(0.0, 1.0, 0.0, 1.0), // Green
        vec4(0.0, 0.0, 1.0, 1.0), // Blue
        vec4(1.0, 1.0, 0.0, 1.0)  // Yellow
    ];

    // Two triangles per face
    function quad(a,b,c,d, color){
        points.push(a,b,c);
        points.push(a,c,d);
        colors.push(color,color,color,color,color,color);
    }


    quad(front[0], front[1], front[2], front[3], vertexColors[0]);  // front
    quad(back[0], back[1], back[2], back[3], vertexColors[0]);      // back

    // connect sides (left, right, top, bottom)
    quad(front[0], back[0], back[3], front[3], vertexColors[0]);  // left
    quad(front[1], back[1], back[2], front[2], vertexColors[1]);  // right
    quad(front[3], back[3], back[2], front[2], vertexColors[2]);  // top
    quad(front[0], back[0], back[1], front[1], vertexColors[3]);  // bottom

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

function makeLogo(){
    // Vertical rectangle
    var vertices = [
        vec4(-0.2, -0.5,  0.0, 1.0),  
        vec4( 0.0, -0.5,  0.0, 1.0),  
        vec4(-0.2,  0.5,  0.0, 1.0),  
        vec4( 0.0,  0.5,  0.0, 1.0)   
    ];
    
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

    points = vertices;
    // points.push(vertices[0], vertices[1], vertices[2]);
    // colors.push(vertexColors[0], vertexColors[1], vertexColors[2]);

    // // Vertical rectangle (two triangles)
    // points.push(vertices1[0], vertices1[1], vertices1[2]);
    // colors.push(vertexColors[0], vertexColors[0], vertexColors[0]);
    // points.push(vertices1[0], vertices1[2], vertices1[3]);
    // colors.push(vertexColors[0], vertexColors[0], vertexColors[0]);

    // // Horizontal rectangle (two triangles)
    // points.push(vertices2[0], vertices2[1], vertices2[2]);
    // colors.push(vertexColors[0], vertexColors[0], vertexColors[0]);
    // points.push(vertices2[0], vertices2[2], vertices2[3]);
    // colors.push(vertexColors[0], vertexColors[0], vertexColors[0]);    

    // === Create buffers ===
    var posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexColors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
}

function render(){
        // --- Draw ---
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    modelViewMatrix = lookAt(
        vec3(0.0, 0.0, 2.0),
        vec3(0.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0)
    );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    // gl.uniform4f(uColor, 0.06, 0.06, 0.06, 1.0); // near-black
    // gl.drawArrays(gl.TRIANGLE_FAN, 0, outerVerts.length / 2);

    // gl.uniform4f(uColor, 0.984,0.969,0.949,1.0);
    // gl.drawArrays(gl.TRIANGLE_FAN, 0, innerVerts.length / 2);

    //Draw outer C
    gl.bindBuffer(gl.ARRAY_BUFFER, outerBuffer);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, outerVerts.length / 2);

    // Draw inner "hole"
    gl.bindBuffer(gl.ARRAY_BUFFER, innerBuffer);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.uniform4f(uColor, 0.984,0.969,0.949,1.0);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, innerVerts.length / 2);


    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

//     modelViewMatrix = lookAt(
//         vec3(0.0, 0.0, 2.0),
//         vec3(0.0, 0.0, 0.0),
//         vec3(0.0, 1.0, 0.0)
//     );

//     gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
//     gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

//     gl.drawArrays(gl.TRIANGLES_FAN, 0, points.length);
}

