'use strict';

var canvas, gl, program;
var modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var vPosition, vNormal, vColor;

var extrusionDepth = 0.2;
var object = [];
var angle = 0.0;

window.onload = function init() {
    configureWEBGL();
    makeLetters();
    render();
}

function configureWEBGL() {
    canvas = document.getElementById("gl_canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex_shader", "fragment_shader");
    gl.useProgram(program);

    vPosition = gl.getAttribLocation(program, "vPosition");
    vNormal = gl.getAttribLocation(program, "vNormal");
    vColor = gl.getAttribLocation(program, "vColor");

    gl.enableVertexAttribArray(vPosition);
    gl.enableVertexAttribArray(vNormal);
    gl.enableVertexAttribArray(vColor);

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");

    projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 100);
}

// --- Make Letters ---
function makeLetters() {
    makeL();
    makeO();
}

function makeL() {
    let L2D = [
        [ vec2(-0.4,-0.5), vec2(-0.2,-0.5), vec2(-0.2,0.5), vec2(-0.4,0.5) ],
        [ vec2(-0.4,-0.5), vec2(0.2,-0.5), vec2(0.2,-0.25), vec2(-0.4,-0.25) ]
    ];

    let L = extrudeIndexed(L2D, extrusionDepth, 
        vec4(1,0,0,1), vec4(0.7,0,0,1), vec4(0.5,0,0,1));
    object.push(L);
}

function makeO() {
    let loops = generateOOutline(64, 0.5, 0.25);
    let O = extrudeIndexed(loops, extrusionDepth, 
        vec4(0,1,1,1), vec4(0,1,0.7,1), vec4(0,1,0.5,1));
    object.push(O);
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

// --- Extrude function ---
function extrudeIndexed(loops2D, depth, colorFront, colorBack, colorSide) {
    let positions=[], normals=[], colors=[], indices=[];
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
        for (let i=1; i<loop.length-1; i++) {
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

// --- Render ---
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    angle += 1.0;

    for (let i = 0; i < object.length; i++) {
        let obj = object[i];
        let translateVec = [-1.2 + i*1.5, 0, 0]; // space letters

        let mv = mult(
            lookAt(vec3(0,0,5), vec3(0,0,0), vec3(0,1,0)),
            mult(rotate(angle, [0,1,0]), translate(translateVec[0],translateVec[1],translateVec[2]))
        );

        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv));
        gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
        gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix(mv)));

        gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer);
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
        gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, obj.colorBuffer);
        gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
        gl.drawElements(gl.TRIANGLES, obj.numIndices, gl.UNSIGNED_SHORT, 0);
    }

    requestAnimationFrame(render);
}
