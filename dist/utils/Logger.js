export class Logger {
    getTimestamp() {
        return new Date().toISOString();
    }
    info(message, data) {
        console.error(`[${this.getTimestamp()}] INFO: ${message}`, data ? JSON.stringify(data) : '');
    }
    error(message, error) {
        console.error(`[${this.getTimestamp()}] ERROR: ${message}`, error?.message || error);
    }
    warn(message, data) {
        console.error(`[${this.getTimestamp()}] WARN: ${message}`, data ? JSON.stringify(data) : '');
    }
    debug(message, data) {
        if (process.env.DEBUG) {
            console.error(`[${this.getTimestamp()}] DEBUG: ${message}`, data ? JSON.stringify(data) : '');
        }
    }
}
