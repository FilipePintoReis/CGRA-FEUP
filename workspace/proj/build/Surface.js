function zComputeSurfaceNormal(zfunction, X, Y, delta) {
	const Point = {X: X, Y: Y, Z: zfunction(X, Y)};

	function sub(a, b) {
		let subX = a.X - b.X;
		let subY = a.Y - b.Y;
		let subZ = a.Z - b.Z;
		return {X: subX, Y: subY, Z: subZ};
	}

	function xTangent(delta) {
		let deltaX = X + delta;
		let deltaY = Y;
		let deltaZ = zfunction(deltaX, deltaY);
		return {X: deltaX, Y: deltaY, Z: deltaZ};
	}

	function yTangent(delta) {
		let deltaX = X;
		let deltaY = Y + delta;
		let deltaZ = zfunction(deltaX, deltaY);
		return {X: deltaX, Y: deltaY, Z: deltaZ};
	}

	function cross(a, b) {
		let crossX = a.Y * b.Z - a.Z * b.Y;
		let crossY = a.Z * b.X - a.X * b.Z;
		let crossZ = a.X * b.Y - a.Y * b.X;
		return {X: crossX, Y: crossY, Z: crossZ};
	}

	function normalize(vec) {
		let N = Math.sqrt(vec.X * vec.X + vec.Y * vec.Y + vec.Z * vec.Z);
		let normX = vec.X / N;
		let normY = vec.Y / N;
		let normZ = vec.Z / N;
		return {X: normX, Y: normY, Z: normZ};
	}

	let xTangentVector = sub(xTangent(delta), Point);
	let yTangentVector = sub(yTangent(delta), Point);
	let normalV = normalize(cross(xTangentVector, yTangentVector));

	return normalV;
}



function uvComputeSurfaceNormal(uvfunction, U, V, delta) {
	const Point = uvfunction(U, V);

	function sub(a, b) {
		let subX = a.X - b.X;
		let subY = a.Y - b.Y;
		let subZ = a.Z - b.Z;
		return {X: subX, Y: subY, Z: subZ};
	}

	function uTangent(delta) {
		return uvfunction(U + delta, V);
	}

	function vTangent(delta) {
		return uvfunction(U, V + delta);
	}

	function cross(a, b) {
		let crossX = a.Y * b.Z - a.Z * b.Y;
		let crossY = a.Z * b.X - a.X * b.Z;
		let crossZ = a.X * b.Y - a.Y * b.X;
		return {X: crossX, Y: crossY, Z: crossZ};
	}

	function normalize(vec) {
		let N = Math.sqrt(vec.X * vec.X + vec.Y * vec.Y + vec.Z * vec.Z);
		let normX = vec.X / N;
		let normY = vec.Y / N;
		let normZ = vec.Z / N;
		return {X: normX, Y: normY, Z: normZ};
	}

	let uTangentVector = sub(uTangent(delta), Point);
	let vTangentVector = sub(vTangent(delta), Point);
	let normalV = normalize(cross(uTangentVector, vTangentVector));

	return normalV;
}



class zSurface extends CGFobject
{
	constructor(scene, zfunction, boundary = [-1, 1, -1, 1], slices = 16, coords = [0, 1, 0, 1])
	{
		super(scene);
		this.zfunction = zfunction;
		this.boundary = {
			minX: boundary[0],
			maxX: boundary[1],
			minY: boundary[2],
			maxY: boundary[3]
		}
		this.slices = slices;
		this.coords = {
			minS: coords[0],
			maxS: coords[1],
			minT: coords[2],
			maxT: coords[3]
		};
		this.initBuffers();
	};

	initBuffers()
	{
        
        const zfunction = this.zfunction, b = this.boundary,
        	slices = this.slices, coords = this.coords;

        const delta = Math.min(b.maxX - b.minX, b.maxY - b.minY) / (256 * slices);

        this.vertices = [];
        this.indices = [];
        this.normals = [];

        // j = 5  . . . . . .
        // j = 4  . . . . . .
        // j = 3  . . . . . .   Y
        // j = 2  . . . . . .   ^
        // j = 1  . . . . . .   |
        // j = 0  . . . . . .   ---> X
        //    i = 0 1 2 3 4 5

        for (let j = 0; j <= slices; ++j) { // iterate Y (line)
        	for (let i = 0; i <= slices; ++i) { // iterate X (column)
        		let X = ((slices - i) * b.minX + i * b.maxX) / slices;
        		let Y = ((slices - j) * b.minY + j * b.maxY) / slices;
        		let Z = zfunction(X, Y);
        		let normalV = zComputeSurfaceNormal(zfunction, X, Y, delta);

        		this.vertices.push(X, Y, Z);
        		this.normals.push(normalV.X, normalV.Y, normalV.Z);
        	}
        }

        for (let j = 0; j < slices; ++j) { // iterate Y (line)
        	for (let i = 0; i < slices; ++i) { // iterate X (column)
                let above = slices + 1;
                let next = 1;

                let line = j * above;
                let current = next * i + line;

                // ... v4  v3 ... --- line x + 1
                // 
                // ... v1  v2 ... --- line x
                let v1 = current;
                let v2 = current + 1;
                let v3 = current + 1 + above;
                let v4 = current + above;

                this.indices.push(v1, v2, v3);
                this.indices.push(v1, v3, v4);
                
                this.indices.push(v1, v3, v2);
                this.indices.push(v1, v4, v3);
        	}
        }

        this.primitiveType = this.scene.gl.TRIANGLES;
        this.initGLBuffers();
	};
};



class uvSurface extends CGFobject
{
	constructor(scene, uvfunction, boundary = [0, 1, 0, 1], slices = 32, coords = [0, 1, 0, 1])
	{
		super(scene);
		this.uvfunction = uvfunction;
		this.boundary = {
			minU: boundary[0],
			maxU: boundary[1],
			minV: boundary[2],
			maxV: boundary[3]
		};
		this.slices = slices;
		this.coords = {
			minS: coords[0],
			maxS: coords[1],
			minT: coords[2],
			maxT: coords[3]
		};
		this.initBuffers();
	};

	initBuffers()
	{
        
        const uvfunction = this.uvfunction, b = this.boundary,
        	slices = this.slices, coords = this.coords;

        const delta = Math.min(b.maxU - b.minU, b.maxV - b.minV) / (256 * slices);

        this.vertices = [];
        this.indices = [];
        this.normals = [];

        // j = 5  . . . . . .
        // j = 4  . . . . . .
        // j = 3  . . . . . .   V
        // j = 2  . . . . . .   ^
        // j = 1  . . . . . .   |
        // j = 0  . . . . . .   ---> U
        //    i = 0 1 2 3 4 5

        for (let j = 0; j <= slices; ++j) { // iterate V
        	for (let i = 0; i <= slices; ++i) { // iterate U
        		let U = ((slices - i) * b.minU + i * b.maxU) / slices;
        		let V = ((slices - j) * b.minV + j * b.maxV) / slices;
        		let Point = uvfunction(U, V);

        		let X = Point.X;
        		let Y = Point.Y;
        		let Z = Point.Z;
        		let normalV = uvComputeSurfaceNormal(uvfunction, U, V, delta);

        		this.vertices.push(X, Y, Z);
        		this.normals.push(normalV.X, normalV.Y, normalV.Z);
        	}
        }

        for (let j = 0; j < slices; ++j) { // iterate Y (line)
        	for (let i = 0; i < slices; ++i) { // iterate X (column)
                let above = slices + 1;
                let next = 1;

                let line = j * above;
                let current = next * i + line;

                // ... v4  v3 ... --- line x + 1
                // 
                // ... v1  v2 ... --- line x
                let v1 = current;
                let v2 = current + 1;
                let v3 = current + 1 + above;
                let v4 = current + above;

                this.indices.push(v1, v2, v3);
                this.indices.push(v1, v3, v4);
                
                this.indices.push(v1, v3, v2);
                this.indices.push(v1, v4, v3);
        	}
        }

        this.primitiveType = this.scene.gl.TRIANGLES;
        this.initGLBuffers();
	};
};