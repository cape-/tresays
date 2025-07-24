// LogDrawer is responsible for visualizing key press records as lanes and chunks in the DOM.
class LogDrawer {
    static DEFAULT_CONTAINER_SELECTOR = ".container";
    static DEFAULT_MS_PER_PX = 5;
    static DEFAULT_REFRESH_RATE = 30;

    /**
     * @param {Object} [options] - Optional configuration for drawer.
     * @param {number} [options.msPerPxRate] - Milliseconds per pixel for chunk width.
     * @param {number} [options.refreshRate] - Refresh rate in ms for drawing.
     * @param {string} [options.containerSelector] - CSS selector for container.
     */
    constructor(options = {}) {
        this.MS_PER_PX = options.msPerPxRate || LogDrawer.DEFAULT_MS_PER_PX;
        this.REFRESH_RATE = options.refreshRate || LogDrawer.DEFAULT_REFRESH_RATE;
        this.CONTAINER_SELECTOR = options.containerSelector || LogDrawer.DEFAULT_CONTAINER_SELECTOR;
        this.aDrew = [];
        this.mLastEnds = new Map();
        // Defensive DOM query
        const container = document.querySelector(this.CONTAINER_SELECTOR);
        if (!container) {
            // Instead of throwing, log error and create a fallback container
            console.error(`Container element with selector '${this.CONTAINER_SELECTOR}' not found. Creating fallback container.`);
            this.fallbackContainer = document.createElement("div");
            this.fallbackContainer.classList.add("container");
            document.body.appendChild(this.fallbackContainer);
            this.drawEl = document.createElement("div");
            this.drawEl.classList.add("draw");
            this.fallbackContainer.appendChild(this.drawEl);
        } else {
            this.drawEl = document.createElement("div");
            this.drawEl.classList.add("draw");
            container.innerHTML = "";
            container.appendChild(this.drawEl);
        }
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
                    } else {
                        // Fallback for browsers without scrollLeftMax
                        this.drawEl.scrollLeft = this.drawEl.scrollWidth;
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
        // Hook for pause/resume functionality
        this.isPaused = false;
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
        this.isPaused = false;
    }
    /**
     * Logs a key event with timestamp and offset.
     * @param {KeyboardEvent} oEvent
     */
    logEvent(oEvent) {
        if (this.isPaused) return;
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
        if (this.isPaused) return;
        if (!sKey || typeof sKeyCode === 'undefined') return;
        // Prevent duplicate keydown events (e.g., rapid repeats)
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
        if (this.isPaused) return;
        if (!sKey || typeof sKeyCode === 'undefined') return;
        if (!this._keysDown[sKey]) {
            // Edge case: keyup without keydown
            console.warn(`Keyup received for '${sKey}' (${sKeyCode}) without corresponding keydown.`);
            return;
        }
        this.aRecord.push({
            key: sKey,
            keyCode: sKeyCode,
            start: this._keysDown[sKey].start,
            end: Date.now() - this._zero
        });
        delete this._keysDown[sKey];
    }
}
/**
 * Handles keydown event: logs and starts recording
 * Ignores repeated keydown events for the same key.
 */
const keyStart = (oLogger, oEvent) => {
    if (!oLogger || !oEvent) return;
    oLogger.logEvent(oEvent);
    oLogger.startRecord(oEvent.key, oEvent.keyCode);
};

/**
 * Handles keyup event: logs and ends recording
 */
const keyEnd = (oLogger, oEvent) => {
    if (!oLogger || !oEvent) return;
    oLogger.logEvent(oEvent);
    oLogger.endRecord(oEvent.key, oEvent.keyCode);
};

/**
 * Initializes logging and drawing system
 * Now supports configurable options and extensibility hooks.
 */
function startLogging(options = {}) {
    const oLogger = new Logger();
    const oDrawer = new LogDrawer(options);
    oLogger.reset();

    document.onkeydown = keyStart.bind(null, oLogger);
    document.onkeyup = keyEnd.bind(null, oLogger);

    setInterval(() => {
        if (!oLogger.isPaused) {
            oDrawer.draw(oLogger);
        }
    }, oDrawer.REFRESH_RATE);

    // Expose for debugging and extensibility
    document.treSays = { drawer: oDrawer, logger: oLogger };
}

// Wait for DOM ready before starting logging
document.onreadystatechange = () => startLogging();
