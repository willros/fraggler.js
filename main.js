
const LIZ = [20, 40, 60, 80, 100, 114, 120, 140, 160, 180, 200, 214, 220, 240, 260, 280, 300, 314, 320, 340, 360, 380, 400, 414, 420, 440, 460, 480, 500, 514, 520, 540, 560, 580, 600];

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

function minMaxScaler(data) {
    let min = Math.min(...data) 
    let factor = Math.max(...data) - min;
    scaled = []
    for (let i = 0; i < data.length; i++) {
        scaled.push((data[i] - min) / factor)
    }
}

function matchRetentionTimes(reference, target) {
    const dp = [];
    function scoringFunction(refSize, targetTime) {
        const absoluteDiff = Math.abs(refSize - targetTime);
        const relativeDiff = Math.abs(refSize - targetTime) / refSize;

        // Define your scoring rules here
        // Example: Higher score for closer matches, considering both absolute and relative differences
        if (absoluteDiff <= 2 && relativeDiff <= 0.1) {
            return 10;
        } else if (absoluteDiff <= 5 && relativeDiff <= 0.2) {
            return 5;
        } else {
            return 0;
        }
    }

    // Initialize dp matrix
    for (let i = 0; i <= reference.length; i++) {
        dp[i] = [];
        for (let j = 0; j <= target.length; j++) {
            dp[i][j] = 0;
        }
    }

    // Fill dp matrix
    for (let i = 1; i <= reference.length; i++) {
        for (let j = 1; j <= target.length; j++) {
            const matchScore = scoringFunction(reference[i - 1], target[j - 1]);

            const diagonalScore = dp[i - 1][j - 1] + matchScore;
            const upperScore = dp[i - 1][j];
            const leftScore = dp[i][j - 1];

            dp[i][j] = Math.max(diagonalScore, upperScore, leftScore);
        }
    }

    // Traceback
    const matchedPeaks = [];
    let i = reference.length;
    let j = target.length;
    while (i > 0 && j > 0) {
        const matchScore = scoringFunction(reference[i - 1], target[j - 1]);

        if (dp[i][j] === dp[i - 1][j - 1] + matchScore) {
            matchedPeaks.push(target[j - 1]);
            i--;
            j--;
        } else if (dp[i][j] === dp[i - 1][j]) {
            // Gap in reference
            i--;
        } else {
            // Gap in target
            j--;
        }
    }
    matchedPeaks.reverse();
    return matchedPeaks;
}

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



const tagDict = {
    "DATA1": { "tagName": "DATA", "tagNum": 1, "typeToReturn": "getShort" },
    "DATA2": { "tagName": "DATA", "tagNum": 2, "typeToReturn": "getShort" },
    "DATA3": { "tagName": "DATA", "tagNum": 3, "typeToReturn": "getShort" },
    "DATA4": { "tagName": "DATA", "tagNum": 4, "typeToReturn": "getShort" },
    "DATA205": { "tagName": "DATA", "tagNum": 205, "typeToReturn": "getShort" },
};

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

//let coefs;
document.addEventListener("DOMContentLoaded", function () {
    let fileInput = document.querySelector('#fsa-file');
    fileInput.addEventListener('change', (event) => {
        const file = fileInput.files[0];
        parseAbifFile(file)
            .then((buffer) => {
                const dataView = new DataView(buffer);
                let converter = new abiConverter(dataView);
                let ladder = converter.getData(tagDict["DATA205"]);
                let peaks = findPeaks(ladder, threshold=500, windowSize=10);
                peaksIndices = peaks.map(x => x[0]);
                console.log(peaksIndices);
                const matchedPeaks = matchRetentionTimes(LIZ, peaksIndices);

                //coefs = polynomialFit(matchedPeaks, LIZ, 1);

                // ladder 205
                plotData(converter, "DATA205", "data1");
                plotData(converter, "DATA2", "data2");
                plotData(converter, "DATA3", "data3");
                plotData(converter, "DATA1", "data4");
                //plotAllData(converter, coefs);
            })
            .catch((error) => {
                console.error('An error occurred while parsing the file:', error);
            });
    });

});
