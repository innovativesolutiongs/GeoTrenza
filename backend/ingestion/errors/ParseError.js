class ParseError extends Error {
  constructor(message, rawHex) {
    super(message);
    this.name = 'ParseError';
    this.rawHex = rawHex;
  }
}

module.exports = ParseError;
