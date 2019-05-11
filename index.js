// Require Internal Dependencies
const { asciiSet, stringToChar, compareU8Arr } = require("./src/utils");
const jsdocKeywords = require("./src/keywords");
const BufferString = require("./src/bufferstring");

// AVAILABLE TOKENS
const TOKENS = Object.freeze({
    KEYWORD: Symbol("KEYWORD"),
    IDENTIFIER: Symbol("IDENTIFIER"),
    SYMBOL: Symbol("SYMBOL")
});

// CONSTANTS
const CHAR_SPACE = " ".charCodeAt(0);
const CHAR_EX = stringToChar("@example");
const CHAR_AROBASE = "@".charCodeAt(0);
const CHAR_STAR = "*".charCodeAt(0);
const CHAR_SLASH = "/".charCodeAt(0);
const CHAR_BRACKET_OPEN = "{".charCodeAt(0);
const CHAR_BRACKET_CLOSE = "}".charCodeAt(0);

const WIDE_CHARS = asciiSet(
    [48, 57], // 0-9
    [65, 90], // a-z
    [97, 122], // A-Z
    95, 36, 39, 34, CHAR_AROBASE, ".".charCodeAt(0));

const SYMBOLS = new Set(["{", "}", "(", ")", "[", "]", "!", "?", "=", ";"].map((char) => char.charCodeAt(0)));
const KEYWORDS = jsdocKeywords.map((key) => stringToChar(key));

/**
 * @func isKeyword
 * @param {!BufferString} t8 BufferString object
 * @returns {[Boolean, (null | Uint8Array)]}
 */
function isKeyword(t8) {
    for (let id = 0; id < KEYWORDS.length; id++) {
        if (compareU8Arr(t8.currValue, KEYWORDS[id])) {
            return [true, KEYWORDS[id]];
        }
    }

    return [false, null];
}

/**
 * @typedef {Object} TokenRow
 * @property {Symbol} token
 * @property {Uint8Array | number | null} value
 */

/**
 * @generator
 * @func scan
 * @param {!Buffer} buf buffer
 * @returns {IterableIterator<TokenRow>}
 */
function* scan(buf) {
    const t8 = new BufferString();
    let skipSymbol = CHAR_AROBASE;
    let skipShowSymbol = false;
    let skipScan = false;

    for (let id = 0; id < buf.length; id++) {
        const char = buf[id];
        if (skipScan) {
            if (char === skipSymbol || (char === CHAR_SLASH && buf[id - 1] === CHAR_STAR)) {
                skipScan = false;
                const currValue = t8.currValue;
                t8.reset();
                yield [TOKENS.IDENTIFIER, currValue];

                if (skipShowSymbol) {
                    yield [TOKENS.SYMBOL, skipSymbol];
                    skipShowSymbol = false;
                }

                continue;
            }

            t8.add(char);
            continue;
        }

        if (WIDE_CHARS.has(char)) {
            t8.add(char);
            continue;
        }

        if (t8.length > 0) {
            const [currIsKeyword, u8Keyword] = isKeyword(t8);
            if (currIsKeyword) {
                if (compareU8Arr(CHAR_EX, u8Keyword)) {
                    skipScan = true;
                    skipSymbol = CHAR_AROBASE;
                }

                t8.reset();
                yield [TOKENS.KEYWORD, u8Keyword];
            }

            if (char === CHAR_SPACE) {
                if (t8.length > 0) {
                    t8.add(char);
                }
                continue;
            }

            yield [TOKENS.IDENTIFIER, t8.currValue];
            t8.reset();
        }

        if (SYMBOLS.has(char)) {
            if (char === CHAR_BRACKET_OPEN) {
                skipScan = true;
                skipSymbol = CHAR_BRACKET_CLOSE;
                skipShowSymbol = true;
            }
            yield [TOKENS.SYMBOL, char];
        }
    }
}

module.exports = { scan, TOKENS };
