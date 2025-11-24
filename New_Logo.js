'use strict';
var canvas, gl, program;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var angle = 0;

//for makeLogo O
// var outerVerts = [];
// var innerVerts = [];
// var outerBuffer, innerBuffer;

// Torus parameters
var vertices = [];
var indices = [];
var torusVertexBuffer, torusIndexBuffer;
var vPosition, vColor;

window.onload = function init() {
    getUIElements();
    configureWEBGL();
    makeLogo();
    render();
}

function getUIElements() {
    canvas = document.getElementById("gl-canvas");
}

function configureWEBGL() {
    gl = canvas.getContext('webgl2');
    if(!gl) alert("WebGL 2.0 isn't available");
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    projectionMatrix = perspective(45, canvas.width/canvas.height, 0.1, 100);

    // ----------------------------------------------------------------
    // Use ORTHO for PERFECT CIRCLE (not perspective!)
    // ----------------------------------------------------------------
    // projectionMatrix = ortho(-1, 1, -1, 1, -1, 1);

    vPosition = gl.getAttribLocation(program, "vPosition");
    vColor = gl.getUniformLocation(program, "vColor");
}

function makeLogo() {
    var R = 0.5;  // major radius
    var r = 0.2;  // minor radius
    var segmentsR = 50; 
    var segmentsT = 30;

    // Generate torus vertices
    for (let i = 0; i <= segmentsR; i++) {
        let theta = i * 2 * Math.PI / segmentsR; 
        let cosT = Math.cos(theta);
        let sinT = Math.sin(theta);

        for (let j = 0; j <= segmentsT; j++) {
            let phi = j * 2 * Math.PI / segmentsT;
            let cosP = Math.cos(phi);
            let sinP = Math.sin(phi);

            let x = (R + r * cosP) * cosT;
            let y = (R + r * cosP) * sinT;
            let z = r * sinP;

            vertices.push(x, y, z);
        }
    }

    // Generate indices
    for (let i = 0; i < segmentsR; i++) {
        for (let j = 0; j < segmentsT; j++) {

            let a = i * (segmentsT + 1) + j;
            let b = a + segmentsT + 1;

            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
        }
    }

    // Create vertex buffer
    torusVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, torusVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Create index buffer
    torusIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, torusIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
}

function makeLogoO() {
    //cannot run if with enable DEPTH_TEST
    outerVerts = createCircle(0.5);
    innerVerts = createCircle(0.3);

    // OUTER
    outerBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, outerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(outerVerts), gl.STATIC_DRAW);


    // INNER
    innerBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, innerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(innerVerts), gl.STATIC_DRAW);
}

function createCircle(radius) {
    const Segments = 100;
    let arr = [];

    arr.push(0.0, 0.0); // center point

    for (let i = 0; i <= Segments; i++) {
        let t = i * 2 * Math.PI / Segments;
        arr.push(radius * Math.cos(t), radius * Math.sin(t));
    }
    return arr;
}


function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    angle += 0.5;
    modelViewMatrix = mult(
        lookAt(
            vec3(0.0, 0.0, 3.0),
            vec3(0.0, 0.0, 0.0),
            vec3(0.0, 1.0, 0.0)
        ),
        rotate(angle, [1, 1, 1])   // rotate in X/Y
    );

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, torusIndexBuffer);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, torusIndexBuffer);
    gl.uniform4f(vColor, 1.0, 0.0, 0.0, 1.0);

    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
    
    // for makelogoO only
    // // ------------------------------------------
    // // DRAW OUTER CIRCLE
    // // ------------------------------------------
    // gl.bindBuffer(gl.ARRAY_BUFFER, outerBuffer);
    // gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    // gl.enableVertexAttribArray(vPosition);
    // gl.uniform4f(vColor, 1.0, 0.0, 0.0, 1.0);
    // gl.drawArrays(gl.TRIANGLE_FAN, 0, outerVerts.length / 2);

    // // ------------------------------------------
    // // DRAW INNER CIRCLE
    // // ------------------------------------------
    // gl.bindBuffer(gl.ARRAY_BUFFER, innerBuffer);
    // gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    // gl.enableVertexAttribArray(vPosition);
    // gl.uniform4f(vColor, 1.0, 1.0, 1.0, 1.0); // white hole
    // gl.drawArrays(gl.TRIANGLE_FAN, 0, innerVerts.length / 2);
} 
