"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const autoincrement_cache = {};
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
