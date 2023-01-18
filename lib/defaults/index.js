"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cuid2_1 = require("@paralleldrive/cuid2");
const autoincrement_1 = __importDefault(require("./autoincrement"));
// const registry = new Map<string, (string, Prisma.DMMF.Field, PrismaMockData) => any>();
const registry = new Map();
registry.set("autoincrement", autoincrement_1.default);
registry.set("cuid", () => (0, cuid2_1.createId)());
function HandleDefault(prop, field, data) {
    registry.get(field.default.name)?.(prop, field, data) ??
        null;
}
exports.default = HandleDefault;
