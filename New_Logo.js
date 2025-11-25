'use strict';
var canvas, gl, program;

var modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;

// create torus
var torusVertexBuffer, torusNormalBuffer, torusIndexBuffer;
var numIndices;

var angle = 0.0;
var object = [];

var vPosition, vColor, vNormal;

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
    
    // get attribute and uniform locations
    vPosition = gl.getAttribLocation(program, "vPosition"); //vec4
    vColor = gl.getUniformLocation(program, "vColor"); //uniform vec4
    vNormal = gl.getAttribLocation(program, "vNormal"); //vec3

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");

    projectionMatrix = perspective(45, canvas.width/canvas.height, 0.1, 100);
    // ----------------------------------------------------------------
    // Use ORTHO for PERFECT CIRCLE (not perspective!)
    // ----------------------------------------------------------------
    // projectionMatrix = ortho(-1, 1, -1, 1, -1, 1);
}

function makeLogo() {
    // O (full torus)
    createTorus(0.9, 0.3, 64, 32, 0.0, 2.0 * Math.PI);

    // C (torus with gap)
    createTorus(0.9, 0.3, 64, 32, 0.3 * Math.PI, 1.7 * Math.PI);
}


function createTorus(R, r, segmentsR, segmentsT, startAngle, endAngle) {
    let data = {};
    const positions = [];
    const normals = [];
    const indices = [];

    for (let i = 0; i <= segmentsR; ++i) {
        const u = startAngle + (endAngle - startAngle) * i / segmentsR;
        const cu = Math.cos(u), su = Math.sin(u);

        for (let j = 0; j <= segmentsT; ++j) {
            const v = j / segmentsT * 2.0 * Math.PI;
            const cv = Math.cos(v), sv = Math.sin(v);

            // position
            const x = (R + r * cv) * cu;
            const y = (R + r * cv) * su;
            const z = r * sv;
            positions.push(x, y, z, 1.0);

            // normal (from torus param eq): compute vector from center of tube to surface
            const nx = cv * cu;
            const ny = cv * su;
            const nz = sv;
            // normalize normal (should already be unit if R/r consistency OK, but we normalize)
            const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
            normals.push(nx/len, ny/len, nz/len);
        }
    }

    // build indices (two triangles per quad)
    const vertsPerRow = segmentsT + 1;
    for (let i = 0; i < segmentsR; ++i) {
        for (let j = 0; j < segmentsT; ++j) {
            const a = i * vertsPerRow + j;
            const b = (i + 1) * vertsPerRow + j;
            const c = (i + 1) * vertsPerRow + (j + 1);
            const d = i * vertsPerRow + (j + 1);

            // triangle a,b,d and b,c,d (consistent winding)
            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }

    data.numIndices = indices.length;
    data.positions = positions;
    data.normals = normals;

    // upload position buffer
    data.torusVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, data.torusVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // upload normal buffer
    data.torusNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, data.torusNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    // upload index buffer
    data.torusIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, data.torusIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    object.push(data);
}

function createSylinder(){

}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    angle += 1.0; // rotate 1 degree per frame
    for (let i = 0; i < object.length; i++) {
        let translateVec = [-1.3, 0, 0]; // default
        if (i === 1) translateVec = [1.3, 0, 0]; // move second torus to the right

        modelViewMatrix = mult(
            lookAt(
                vec3(0.0, 0.0, 6.0),
                vec3(0.0, 0.0, 0.0),
                vec3(0.0, 1.0, 0.0)
            ),
            mult(translate(translateVec[0], translateVec[1], translateVec[2]), rotate(angle, [1, 1, 0]))
        );

        //send matrices to GPU
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
        gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
        gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix(modelViewMatrix)));

        // enable vertex arrays
        gl.enableVertexAttribArray(vNormal);
        gl.enableVertexAttribArray(vPosition);
        gl.enableVertexAttribArray(vColor);

        // bind attributes and draw
        gl.bindBuffer(gl.ARRAY_BUFFER, object[i].torusNormalBuffer);  
        gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, object[i].torusVertexBuffer);
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(vColor, flatten(vec4(0.2, 0.6, 0.8, 1.0))); // set color

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object[i].torusIndexBuffer);
        gl.drawElements(gl.TRIANGLES, object[i].numIndices, gl.UNSIGNED_SHORT, 0);

    }
    requestAnimationFrame(render);
} 
