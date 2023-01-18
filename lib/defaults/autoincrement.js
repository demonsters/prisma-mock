"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reset = void 0;
let autoincrement_cache = {};
function autoincrement(prop, field, data = {}) {
    const key = `${prop}_${field.name}`;
    let m = autoincrement_cache?.[key];
    if (m === undefined) {
        m = 0;
        data[prop].forEach((item) => {
            m = Math.max(m, item[field.name]);
        });
    }
    m += 1;
    autoincrement_cache[key] = m;
    return m;
}
exports.default = autoincrement;
function reset() {
    autoincrement_cache = {};
}
exports.reset = reset;
