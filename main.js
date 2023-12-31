const LIZ = [20, 40, 60, 80, 100, 114, 120, 140, 160, 180, 200, 214, 220, 240, 260, 280, 300, 314, 320, 340, 360, 380, 400, 414, 420, 440, 460, 480, 500, 514, 520, 540, 560, 580, 600];
const tagDict = {
    "DATA1": { "tagName": "DATA", "tagNum": 1, "typeToReturn": "getShort" },
    "DATA2": { "tagName": "DATA", "tagNum": 2, "typeToReturn": "getShort" },
    "DATA3": { "tagName": "DATA", "tagNum": 3, "typeToReturn": "getShort" },
    "DATA4": { "tagName": "DATA", "tagNum": 4, "typeToReturn": "getShort" },
    "DATA205": { "tagName": "DATA", "tagNum": 205, "typeToReturn": "getShort" },
};

// https://github.com/eamitchell/ab1ToJSON
let DIR_SIZE = 28;
class abiConverter {
    constructor(buffer) {
        this.buffer = buffer;
        this.dirLocation = buffer.getInt32(26);
        this.numElements = buffer.getInt32(18);
        this.lastEntry = this.dirLocation + (this.numElements * DIR_SIZE);
    }

    getTagName(inOffset) {
        var name = "";
        for (var loopOffset = inOffset; loopOffset < inOffset + 4; loopOffset++) {
            name += String.fromCharCode(this.buffer.getInt8(loopOffset));
        }
        return name;
    }

    getNumber(inOffset, numEntries) {
        var retArray = [];
        for (var counter = 0; counter < numEntries; counter += 1) {
            retArray.push(this.buffer.getInt8(inOffset + counter));
        }
        return retArray;
    }

    getShort(inOffset, numEntries) {
        var retArray = [];
        for (var counter = 0; counter < numEntries; counter += 2) {
            retArray.push(this.buffer.getInt16(inOffset + counter));
        }
        return retArray;
    }

    getData(inTag) {
        let output;
        let curElem = this.dirLocation;

        while (curElem < this.lastEntry) {
            let currTagName = this.getTagName(curElem);
            let tagNum = this.buffer.getInt32(curElem + 4);

            if (currTagName == inTag.tagName && tagNum === inTag.tagNum) {
                let numEntries = this.buffer.getInt32(curElem + 16);
                let entryOffset = this.buffer.getInt32(curElem + 20);
                output = this[inTag.typeToReturn](entryOffset, numEntries);
                break;
            }
            curElem += DIR_SIZE;
        }
        return output;
    }
}

function parseAbifFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new window.FileReader();
        reader.onload = (event) => {
            const arrayBuffer = event.target.result;
            resolve(arrayBuffer);
        };

        reader.onerror = (event) => {
            reject(event.target.error);
        };
        reader.readAsArrayBuffer(file);
    });
}



findPeaks = (data, threshold, windowSize) => {
    // handle cases where current === after and before
    // handle where i < halfWindow
    let peaks = [];
    const halfWindow = Math.floor(windowSize / 2);
    // start from index 1 (no peaks at 0 anyways)
    for (let i = 1; i < data.length; i++) {
        let current = data[i];
        if (current >= threshold) {
            let before = data[i - 1];
            let after = data[i + 1];
            if (current > before && current > after) {
                let windowArray = data.slice(i - halfWindow, i + halfWindow);
                if (current === Math.max(...windowArray)) {
                    let pair = [i, current];
                    peaks.push(pair);
                }
            }
        }
    }
    return peaks;
}



// Ladder matching functions
function* range(start, end) {
    for (; start <= end; ++start) { yield start; }
}
function last(arr) { return arr[arr.length - 1]; }
function* numericCombinations(n, r, loc = []) {
    const idx = loc.length;
    if (idx === r) {
        yield loc;
        return;
    }
    for (let next of range(idx ? last(loc) + 1 : 0, n - r + idx)) { yield* numericCombinations(n, r, loc.concat(next)); }
}
function* combinations(arr, r) {
    for (let idxs of numericCombinations(arr.length, r)) { yield idxs.map(i => arr[i]); }
}

function diffs(array, max_diff) {
    for (let i = 0; i < array.length - 1; i++) {
        if (array[i + 1] - array[i] > max_diff) {
            return true;
        }
    }
    return false;
}

// implement pearsonr corr function
function pearson (x, y) {
    const promedio = l => l.reduce((s, a) => s + a, 0) / l.length
    const calc = (v, prom) => Math.sqrt(v.reduce((s, a) => (s + a * a), 0) - n * prom * prom)
    let n = x.length
    let nn = 0
    for (let i = 0; i < n; i++, nn++) {
        if ((!x[i] && x[i] !== 0) || (!y[i] && y[i] !== 0)) {
            nn--
            continue
        }
        x[nn] = x[i]
        y[nn] = y[i]
    }
    if (n !== nn) {
        x = x.splice(0, nn)
        y = y.splice(0, nn)
        n = nn
    }
    const prom_x = promedio(x), prom_y = promedio(y)
    return (x
        .map((e, i) => ({ x: e, y: y[i] }))
        .reduce((v, a) => v + a.x * a.y, 0) - n * prom_x * prom_y
    ) / (calc(x, prom_x) * calc(y, prom_y))
}

function findBestMatch(peaks, ladder) {
    let highScoreMatch;
    let pearsonScore = 0;
    for (comb of combinations(peaks, LIZ.length)) {
        if (diffs(comb, 200)) { 
            continue; 
        }
        let score = pearson(comb, LIZ);
        if (score > pearsonScore) {
            pearsonScore = score;
            highScoreMatch = comb;
        }
    }
    return highScoreMatch;
}


// Fit basepairs to best model
function polynomialFit(x, y, degree) {
    if (x.length !== y.length) {
        throw new Error("Input arrays x and y must have the same length.");
    }

    if (degree < 1) {
        throw new Error("Degree of the polynomial must be at least 1.");
    }

    const n = x.length;
    const matrix = [];

    // Build the matrix of equation coefficients
    for (let i = 0; i < degree + 1; i++) {
        matrix[i] = [];

        for (let j = 0; j < degree + 1; j++) {
            let sum = 0;

            for (let k = 0; k < n; k++) {
                sum += Math.pow(x[k], i + j);
            }

            matrix[i][j] = sum;
        }
    }

    const rhs = [];

    // Build the right-hand side of the equation
    for (let i = 0; i < degree + 1; i++) {
        let sum = 0;

        for (let j = 0; j < n; j++) {
            sum += y[j] * Math.pow(x[j], i);
        }

        rhs[i] = sum;
    }

    // Solve the system of equations using Gaussian elimination
    for (let i = 0; i < degree + 1; i++) {
        let maxRow = i;

        for (let j = i + 1; j < degree + 1; j++) {
            if (Math.abs(matrix[j][i]) > Math.abs(matrix[maxRow][i])) {
                maxRow = j;
            }
        }

        const temp = matrix[i];
        matrix[i] = matrix[maxRow];
        matrix[maxRow] = temp;

        const rhsTemp = rhs[i];
        rhs[i] = rhs[maxRow];
        rhs[maxRow] = rhsTemp;

        for (let j = i + 1; j < degree + 1; j++) {
            const factor = matrix[j][i] / matrix[i][i];

            for (let k = i; k < degree + 1; k++) {
                matrix[j][k] -= factor * matrix[i][k];
            }

            rhs[j] -= factor * rhs[i];
        }
    }

    const coefficients = [];

    // Back substitution
    for (let i = degree; i >= 0; i--) {
        let sum = 0;

        for (let j = i + 1; j < degree + 1; j++) {
            sum += matrix[i][j] * coefficients[j];
        }

        coefficients[i] = (rhs[i] - sum) / matrix[i][i];
    }

    return coefficients;
}

function predict(coefficients, x) {
    const degree = coefficients.length - 1;
    let result = 0;

    for (let i = 0; i <= degree; i++) {
        result += coefficients[i] * Math.pow(x, i);
    }

    return result;
}



function plotData(converter, tag, divName) {
    let data = converter.getData(tagDict[tag]);
    const s = new dfd.Series(data);
    s.plot(divName).line()
}

function plotAllData(converter, coefs) {
    let df = new dfd.DataFrame(
        {
            "data1": converter.getData(tagDict["DATA1"]),
            // "data2": converter.getData(tagDict["DATA2"]),
            // "data3": converter.getData(tagDict["DATA3"]),
            // "data4": converter.getData(tagDict["DATA4"]),
        }
    );
    df = df.addColumn("time",
        [...Array(df.shape[0]).keys()].map((num) => num + 1)
    );
    df = df.addColumn("bp",
        df.time.$data.map((x) => predict(coefs, x))
    )
    df.setIndex({column: "bp", inplace: true})
    df.drop({ columns: ["time", "bp"], inplace: true });
    df.plot("allData").line()
}

function calculateCombinations(n, k) {
    if (n < 0 || k < 0 || k > n) {
      return 0; // Invalid input
    }
    
    let numerator = 1;
    let denominator = 1;
    
    for (let i = 1; i <= k; i++) {
      numerator *= (n - i + 1);
      denominator *= i;
    }
    
    return Math.floor(numerator / denominator);
  }
  

function findAndMatchLadder(converter, threshold, windowSize=10) {
    let ladder = converter.getData(tagDict["DATA205"]);
    let peaks = findPeaks(ladder, threshold=threshold, windowSize=windowSize);
    let peaksIndices = peaks.map(x => x[0]);
    if (peaksIndices.length < LIZ.length) {
        alert(`Too few peaks found!, Number of peaks: ${peaksIndices.length}`);
        return;
    }
    let numCombinations = calculateCombinations(peaksIndices.length, LIZ.length);
    if (numCombinations >= 200000) {
        alert(`Too many combinations!, Number of combs: ${numCombinations}`);
        return;
    } 

    let bestMatch = findBestMatch(peaksIndices, LIZ);
    return bestMatch
        
}



let coefs;
document.addEventListener("DOMContentLoaded", function () {
    let fileInput = document.querySelector('#fsa-file');
    fileInput.addEventListener('change', (event) => {
        const file = fileInput.files[0];
        parseAbifFile(file)
            .then((buffer) => {
                const dataView = new DataView(buffer);
                let converter = new abiConverter(dataView);
                let threshold = document.querySelector("#peakThreshold").value
                const bestMatch = findAndMatchLadder(converter, threshold=threshold);
                coefs = polynomialFit(bestMatch, LIZ, 5);


                // ladder 205
                plotData(converter, "DATA205", "data1");
                plotData(converter, "DATA2", "data2");
                plotData(converter, "DATA3", "data3");
                plotData(converter, "DATA1", "data4");
                plotAllData(converter, coefs);
            })
            .catch((error) => {
                console.error('An error occurred while parsing the file:', error);
            });
    });

});
