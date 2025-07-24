// LogDrawer is responsible for visualizing key press records as lanes and chunks in the DOM.
class LogDrawer {
    /**
     * @param {Object} [options] - Optional configuration for drawer.
     * @param {number} [options.msPerPxRate] - Milliseconds per pixel for chunk width.
     * @param {number} [options.refreshRate] - Refresh rate in ms for drawing.
     */
    constructor(options = {}) {
        // Magic numbers replaced with named constants and comments
        this.MS_PER_PX = options.msPerPxRate || 5; // ms per pixel for chunk width
        this.REFRESH_RATE = options.refreshRate || 30; // ms between redraws
        this.aDrew = [];
        this.mLastEnds = new Map();
        // Defensive DOM query
        const container = document.querySelector(".container");
        if (!container) {
            throw new Error("Container element with class 'container' not found.");
        }
        this.drawEl = document.createElement("div");
        this.drawEl.classList.add("draw");
        container.innerHTML = "";
        container.appendChild(this.drawEl);
        return this;
    }

    // Standardize lane identification by keyCode
    _getLaneId(oLane) {
        return `Lane-${oLane.keyCode}`;
    }

    /**
     * Draws the key press records as lanes and chunks in the container.
     * @param {Logger} oLogger - Logger instance containing key records.
     */
    draw(oLogger) {
        if (!oLogger || !Array.isArray(oLogger.aRecord)) return;
        // Sort records by start time
        const aBuffer = oLogger.aRecord.slice().sort((a, b) => a.start - b.start);
        // Collect unique lanes by keyCode
        const aLanes = Object.values(aBuffer.reduce((acc, cur) => {
            if (!acc[cur.keyCode])
                acc[cur.keyCode] = { key: cur.key, keyCode: cur.keyCode };
            return acc;
        }, {}));
        aLanes.forEach(oLane => {
            let laneEl = document.querySelector(`#${this._getLaneId(oLane)}`);
            if (!laneEl) {
                laneEl = document.createElement("div");
                laneEl.classList.add("lane");
                const laneLabel = document.createElement("div");
                laneLabel.classList.add("laneLabel");
                laneLabel.textContent = oLane.key;
                laneEl.id = this._getLaneId(oLane);
                laneEl.appendChild(laneLabel);
                this.drawEl.appendChild(laneEl);
            }
            // Draw only new records for this lane
            aBuffer.filter(oRec => !this.aDrew.includes(oRec))
                .filter(oRec => oRec.keyCode === oLane.keyCode)
                .forEach(oRec => {
                    const gap = document.createElement("div");
                    gap.classList.add("gap");
                    const chunk = document.createElement("div");
                    chunk.classList.add("chunk");
                    // Calculate gap and chunk widths using constants
                    gap.style.width = ((oRec.start - (this.mLastEnds.get(oLane.keyCode) || 0)) / this.MS_PER_PX) + "px";
                    chunk.style.width = ((oRec.end - oRec.start) / this.MS_PER_PX) + "px";
                    this.mLastEnds.set(oLane.keyCode, oRec.end);
                    laneEl.appendChild(gap);
                    laneEl.appendChild(chunk);
                    this.aDrew.push(oRec);
                    // Defensive scroll update
                    if (typeof this.drawEl.scrollLeftMax !== 'undefined') {
                        this.drawEl.scrollLeft = this.drawEl.scrollLeftMax;
                    }
                });
        });
    }
}

// Logger is responsible for tracking key events and recording their timing.
class Logger {
    constructor() {
        this.aLogger = [];
        this.aRecord = [];
        this._zero = null;
        this._keysDown = {};
        return this;
    }
    /**
     * Resets the logger state and clears all records.
     */
    reset() {
        this._zero = null;
        this._keysDown = {};
        this.aLogger.length = 0;
        this.aRecord.length = 0;
    }
    /**
     * Logs a key event with timestamp and offset.
     * @param {KeyboardEvent} oEvent
     */
    logEvent(oEvent) {
        if (!oEvent || typeof oEvent.keyCode === 'undefined') return;
        const dNow = Date.now();
        if (!this._zero) this._zero = dNow;     // on first record, restart zero
        this.aLogger.push({ type: oEvent.type, keyCode: oEvent.keyCode, key: oEvent.key, offset: dNow - this._zero, ts: dNow });
    }
    /**
     * Starts recording a key press.
     * @param {string} sKey
     * @param {number} sKeyCode
     */
    startRecord(sKey, sKeyCode) {
        if (!sKey || typeof sKeyCode === 'undefined') return;
        if (this._keysDown[sKey]) return;
        const dNow = Date.now();
        if (!this._zero) this._zero = dNow;     // on first record, restart zero
        this._keysDown[sKey] = { start: dNow - this._zero };
    }
    /**
     * Ends recording a key press and saves the record.
     * @param {string} sKey
     * @param {number} sKeyCode
     */
    endRecord(sKey, sKeyCode) {
        if (!sKey || typeof sKeyCode === 'undefined') return;
        if (!this._keysDown[sKey]) return;
        this.aRecord.push({
            key: sKey,
            keyCode: sKeyCode,
            start: this._keysDown[sKey].start,
            end: Date.now() - this._zero
        });
        delete this._keysDown[sKey];
    }
}
// Handles keydown event: logs and starts recording
const keyStart = (oLogger, oEvent) => {
    oLogger.logEvent(oEvent);
    oLogger.startRecord(oEvent.key, oEvent.keyCode);
};

// Handles keyup event: logs and ends recording
const keyEnd = (oLogger, oEvent) => {
    oLogger.logEvent(oEvent);
    oLogger.endRecord(oEvent.key, oEvent.keyCode);
};

// Initializes logging and drawing system
function startLogging() {
    const oLogger = new Logger();
    const oDrawer = new LogDrawer();
    oLogger.reset();

    document.onkeydown = keyStart.bind(null, oLogger);
    document.onkeyup = keyEnd.bind(null, oLogger);

    setInterval(() => oDrawer.draw(oLogger), oDrawer.REFRESH_RATE);

    document.treSays = { drawer: oDrawer, logger: oLogger };
}

// Wait for DOM ready before starting logging
document.onreadystatechange = startLogging;
