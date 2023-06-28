// https://github.com/eamitchell/ab1ToJSON
class abiConverter {
    constructor(buffer) {
        this.buffer = buffer;
        this.dirLocation = buffer.getInt32(26);
        this.numElements = buffer.getInt32(18);
        this.lastEntry = this.dirLocation + (this.numElements * 28);
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
            curElem += 28;
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


const tagDict = {
    "DATA1": { "tagName": "DATA", "tagNum": 1, "typeToReturn": "getShort" },
    "DATA2": { "tagName": "DATA", "tagNum": 2, "typeToReturn": "getShort" },
    "DATA3": { "tagName": "DATA", "tagNum": 3, "typeToReturn": "getShort" },
    "DATA4": { "tagName": "DATA", "tagNum": 4, "typeToReturn": "getShort" },
};

function plotData(converter, tag, divName) {
    let data = converter.getData(tagDict[tag]);
    const s = new dfd.Series(data);
    s.plot(divName).line()
}

function plotAllData(converter) {
    const df = new dfd.DataFrame(
        {
            "data1": converter.getData(tagDict["DATA1"]),
            "data2": converter.getData(tagDict["DATA2"]),
            "data3": converter.getData(tagDict["DATA3"]),
            "data4": converter.getData(tagDict["DATA4"]),
        }
    );
    df.plot("allData").line()
}

document.addEventListener("DOMContentLoaded", function () {
    let fileInput = document.querySelector('#fsa-file');
    fileInput.addEventListener('change', (event) => {
        const file = fileInput.files[0];
        parseAbifFile(file)
            .then((buffer) => {
                const dataView = new DataView(buffer);
                let converter = new abiConverter(dataView);
                plotData(converter, "DATA1", "data1");
                plotData(converter, "DATA2", "data2");
                plotData(converter, "DATA3", "data3");
                plotData(converter, "DATA4", "data4");
                plotAllData(converter);
            })
            .catch((error) => {
                console.error('An error occurred while parsing the file:', error);
            });
    });

});
