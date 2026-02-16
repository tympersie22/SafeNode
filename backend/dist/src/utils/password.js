"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPasswordConfig = exports.verifyPassword = exports.hashPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const ROUNDS = 12;
const hashPassword = (pw, pepper = process.env.PASSWORD_PEPPER || '') => bcryptjs_1.default.hash(pw + pepper, ROUNDS);
exports.hashPassword = hashPassword;
const verifyPassword = (pw, hash, pepper = process.env.PASSWORD_PEPPER || '') => bcryptjs_1.default.compare(pw + pepper, hash);
exports.verifyPassword = verifyPassword;
// Helper for diagnostics (optional)
const getPasswordConfig = () => {
    const pepper = process.env.PASSWORD_PEPPER || '';
    return {
        pepperConfigured: !!pepper,
        pepperLength: pepper.length,
        hashingParamsVersion: '1.0',
        rounds: ROUNDS
    };
};
exports.getPasswordConfig = getPasswordConfig;
