class LogDrawer {
    constructor() {
        this.msPerPxRate = 5;
        this.refreshRate = 30;
        this.aDrew = [];
        this.mLastEnds = new Map();
        const container = document.querySelector(".container");
        this.drawEl = document.createElement("div");
        this.drawEl.classList.add("draw");
        container.innerHTML = "";
        container.appendChild(this.drawEl);
        return this;
    }

    _getLaneId(oLane) {
        return "Lane-" + oLane.keyCode;
    }

    draw(oLogger) {
        const aBuffer = oLogger.aRecord.sort((a, b) => a.start - b.start);
        const aLanes = Object.values(aBuffer.reduce((acc, cur) => {
            // collect unique keys
            if (!acc[cur.keyCode])
                acc[cur.keyCode] = { key: cur.key, keyCode: cur.keyCode };
            return acc;
        }, {}));
        // console.log("[DRAW]!");
        aLanes.forEach(oLane => {
            // console.log("[Lane " + oLane.key + "]");
            // var lane = document.querySelector('.lane[data-key="' + oLane.key + '"]');
            var laneEl = document.querySelector("#" + this._getLaneId(oLane));
            if (!laneEl) {
                laneEl = document.createElement("div");
                laneEl.classList.add("lane");
                const laneLabel = document.createElement("div");
                laneLabel.classList.add("laneLabel");
                laneLabel.textContent = oLane.key;
                laneEl.id = this._getLaneId(oLane);
                // lane.dataset.key = oLane.key;
                laneEl.appendChild(laneLabel);
                this.drawEl.appendChild(laneEl);
            }
            aBuffer.filter(oRec => !this.aDrew.includes(oRec))  // remove already draw
                .filter(oRec => oRec.keyCode === oLane.keyCode)
                .forEach(oRec => {
                    const gap = document.createElement("div");
                    gap.classList.add("gap");
                    const chunk = document.createElement("div");
                    chunk.classList.add("chunk");
                    // console.log("gap+chunk factory", oRec);
                    // console.log("oLane.key", oLane.key, "(this.mLastEnds.get(oLane.key) || 0)", (this.mLastEnds.get(oLane.key) || 0), "oRec.end", oRec.end, "oRec.start", oRec.start)
                    // console.log("GAP width: ((oRec.start - (this.mLastEnds.get(oLane.key) || 0)) / this.msPerPxRate) + 'px'", ((oRec.start - (this.mLastEnds.get(oLane.key) || 0)) / this.msPerPxRate) + "px");
                    // console.log("CHUNK width: ((oRec.end - oRec.start) / this.msPerPxRate) + 'px'", ((oRec.end - oRec.start) / this.msPerPxRate) + "px");
                    gap.style.width = ((oRec.start - (this.mLastEnds.get(oLane.keyCode) || 0)) / this.msPerPxRate) + "px";
                    chunk.style.width = ((oRec.end - oRec.start) / this.msPerPxRate) + "px";
                    this.mLastEnds.set(oLane.keyCode, oRec.end);
                    laneEl.appendChild(gap);
                    laneEl.appendChild(chunk);
                    this.aDrew.push(oRec)
                    this.drawEl.scrollLeft = this.drawEl.scrollLeftMax 
                });
        });
    }
}

class Logger {
    constructor() {
        this.aLogger = [];
        this.aRecord = [];
        this._zero = null;
        this._keysDown = {};
        return this;
    }
    reset() {
        this._zero = null;
        this._keysDown = {};
        this.aLogger.length = 0;
        this.aRecord.length = 0;
    }
    logEvent(oEvent) {
        const dNow = Date.now();
        if (!this._zero) this._zero = dNow;     // on first record, restart zero
        this.aLogger.push({ type: oEvent.type, keyCode: oEvent.keyCode, key: oEvent.key, offset: dNow - this._zero, ts: dNow });
    }
    startRecord(sKey, sKeyCode) {
        if (this._keysDown[sKey]) return;
        const dNow = Date.now();
        if (!this._zero) this._zero = dNow;     // on first record, restart zero
        this._keysDown[sKey] = { start: dNow - this._zero }
        // console.log("[START RECORD] ", sKey, this._keysDown[sKey]);
    }
    endRecord(sKey, sKeyCode) {
        if (!this._keysDown[sKey]) return;
        this.aRecord.push({
            key: sKey,
            keyCode: sKeyCode,
            start: this._keysDown[sKey].start,
            end: Date.now() - this._zero
        });
        delete this._keysDown[sKey];
        // console.log("[END RECORD] ", sKey, this._keysDown[sKey]);
    }
}
function keyStart(oLogger, oEvent) {
    // console.log("keyStart", oEvent);
    oLogger.logEvent(oEvent);
    oLogger.startRecord(oEvent.key, oEvent.keyCode);
}

function keyEnd(oLogger, oEvent) {
    // console.log("keyEnd", oEvent);
    oLogger.logEvent(oEvent);
    oLogger.endRecord(oEvent.key, oEvent.keyCode);
}

function startLogging(oEvent) {
    const oLogger = new Logger();
    const oDrawer = new LogDrawer();
    oLogger.reset();

    document.onkeydown = keyStart.bind(this, oLogger);
    document.onkeyup = keyEnd.bind(this, oLogger);

    setInterval(() => oDrawer.draw(oLogger), oDrawer.refreshRate);

    document.treSays = { drawer: oDrawer, logger: oLogger };
}

document.onreadystatechange = startLogging;
