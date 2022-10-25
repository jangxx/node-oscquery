// https://hangar.org/wp-content/uploads/2012/01/The-Open-Sound-Control-1.0-Specification-opensoundcontrol.org_.pdf
export enum OSCType {
	// standard:
	INT = "i",
	FLOAT = "f",
	STRING = "s",
	BLOB = "b",

	// non-standard:
	BIGINT = "h",
	TIMETAG = "t",
	DOUBLE = "d",
	ALTSTRING = "S",
	CHAR = "c",
	COLOR = "r",
	MIDI = "m",
	TRUE = "T",
	FALSE = "F",
	NIL = "N",
	INFINITUM = "I",

	// arrays are handled as actual arrays of OSCTypes
};