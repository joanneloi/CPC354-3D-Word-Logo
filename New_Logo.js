'use strict';
var canvas, gl, program;

var modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;

// create torus
var vertexBuffer, normalBuffer, indexBuffer;
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
    makeU();
    // make second torus for C
    makeC();
    createTorus(0.8, 0.2, 36, 36, Math.PI/6, 11 * Math.PI / 6);
}

function makeC(){
    let data = createTorus(0.8, 0.2, 36, 36, Math.PI/6, 11 * Math.PI / 6);
    object.push(data);
}

function makeU(){
    let U = { parts: [] };

    // left cylinder
    let left = createCylinder(0.2, 2.0, 36);
    left.localMatrix = mult(translate(-0.6, 0, 0), rotate(90, [0,0,1]));
    U.parts.push(left);

    // right cylinder
    let right = createCylinder(0.2, 2.0, 36);
    right.localMatrix = mult(translate(0.6, 0, 0), rotate(90, [0,0,1]));
    U.parts.push(right);

    // bottom torus (half circle)
    let bottom = createTorus(0.6, 0.2, 36, 36, 0, Math.PI);
    bottom.localMatrix = translate(0, -1.0, 0); // shift downward
    U.parts.push(bottom);
    object.push(U);
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
    data.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, data.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // upload normal buffer
    data.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, data.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    // upload index buffer
    data.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, data.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return data;
}

function createCylinder(radius, height, segments) {
    let data = {};
    const positions = [];
    const normals = [];
    const indices = [];

    // Cylinder along Y axis (centered at origin)
    for (let i = 0; i <= segments; ++i) {
        const theta = 2.0 * Math.PI * i / segments;
        const x = radius * Math.cos(theta);
        const z = radius * Math.sin(theta);

        // top vertex
        positions.push(x, height / 2, z, 1.0);
        normals.push(x, 0, z); // side normal
        // bottom vertex
        positions.push(x, -height / 2, z, 1.0);
        normals.push(x, 0, z); 
    }

    // Build side indices
    for (let i = 0; i < segments; ++i) {
        const top1 = i * 2;
        const bottom1 = top1 + 1;
        const top2 = ((i + 1) % segments) * 2;
        const bottom2 = top2 + 1;

        // two triangles per quad
        indices.push(top1, bottom1, top2);
        indices.push(bottom1, bottom2, top2);
    }

    // Optionally, add top and bottom caps
    const topCenterIndex = positions.length / 4;
    positions.push(0, height / 2, 0, 1.0);  // top center
    normals.push(0, 1, 0);
    const bottomCenterIndex = topCenterIndex + 1;
    positions.push(0, -height / 2, 0, 1.0); // bottom center
    normals.push(0, -1, 0);

    for (let i = 0; i < segments; ++i) {
        const top1 = i * 2;
        const top2 = ((i + 1) % segments) * 2;
        indices.push(top1, top2, topCenterIndex);

        const bottom1 = i * 2 + 1;
        const bottom2 = ((i + 1) % segments) * 2 + 1;
        indices.push(bottom2, bottom1, bottomCenterIndex);
    }

    data.numIndices = indices.length;
    data.positions = positions;
    data.normals = normals;

    // Upload buffers to GPU
    data.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, data.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    data.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, data.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    data.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, data.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return data;
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // enable vertex arrays
    gl.enableVertexAttribArray(vNormal);
    gl.enableVertexAttribArray(vPosition);
    gl.enableVertexAttribArray(vColor);

    angle += 1.0; // rotate 1 degree per frame
    for (let i = 0; i < object.length; i++) {
        let translateVec = [-1.3, 0, 0]; // default
        if (i === 1) translateVec = [1.3, 0, 0]; // move second torus to the right
        if (i === 2) translateVec = [1.2, 0, 0]; // move cylinder to close C

        for (let obj of object) {
            if (obj.parts) {
                // This is a grouped object (like U)
                obj.parentMatrix = mult(rotate(angle, [1,1,0]), translate(0,0,0));
                for (let part of obj.parts) {
                    let mv = mult(
                        lookAt(
                            vec3(0,0,6), 
                            vec3(0,0,0), 
                            vec3(0,1,0)),
                        mult(obj.parentMatrix, part.localMatrix)
                    );
                    drawPart(part, mv);
                }
            }
            else {
                // This is a standalone object
                let mv = mult(
                    lookAt(
                        vec3(0,0,6), 
                        vec3(0,0,0), 
                        vec3(0,1,0)),
                    rotate(angle, [1,1,0])
                );
                drawPart(obj, mv);
            }
        }
    }
    requestAnimationFrame(render);
} 

function drawPart(part, mv) {
    //send matrices to GPU
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix(mv)));

    gl.bindBuffer(gl.ARRAY_BUFFER, part.normalBuffer);
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, part.vertexBuffer);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

    gl.uniform4fv(vColor, flatten(vec4(0.2, 0.6, 0.8, 1.0)));

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.indexBuffer);
    gl.drawElements(gl.TRIANGLES, part.numIndices, gl.UNSIGNED_SHORT, 0);
}

