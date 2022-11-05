// https://hangar.org/wp-content/uploads/2012/01/The-Open-Sound-Control-1.0-Specification-opensoundcontrol.org_.pdf
export enum OSCTypeSimple {
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

export const OSCTypeSimpleMap: Record<string, OSCTypeSimple> = {
	"i": OSCTypeSimple.INT,
	"f": OSCTypeSimple.FLOAT,
	"s": OSCTypeSimple.STRING,
	"b": OSCTypeSimple.BLOB,
	"h": OSCTypeSimple.BIGINT,
	"t": OSCTypeSimple.TIMETAG,
	"d": OSCTypeSimple.DOUBLE,
	"S": OSCTypeSimple.ALTSTRING,
	"c": OSCTypeSimple.CHAR,
	"r": OSCTypeSimple.COLOR,
	"m": OSCTypeSimple.MIDI,
	"T": OSCTypeSimple.TRUE,
	"F": OSCTypeSimple.FALSE,
	"N": OSCTypeSimple.NIL,
	"I": OSCTypeSimple.INFINITUM,
};

export type OSCType = OSCTypeSimple | OSCType[];

export interface OSCQRangeSingle {
	min?: number;
	max?: number;
	vals?: unknown[];
}

export type OSCQRange = OSCQRangeSingle | null | OSCQRange[];

export type OSCQClipmodeSingle = "none" | "low" | "high" | "both";

export type OSCQClipmode = OSCQClipmodeSingle | null | OSCQClipmode[];

export enum OSCQAccess {
	NO_VALUE = 0,
	READONLY = 1,
	WRITEONLY = 2,
	READWRITE = 3,
	NA = 0,
	R = 1,
	W = 2,
	RW = 3,
}

export const OSCQAccessMap: Record<number, OSCQAccess> = {
	0: OSCQAccess.NO_VALUE,
	1: OSCQAccess.READONLY,
	2: OSCQAccess.WRITEONLY,
	3: OSCQAccess.READWRITE,
};

export interface HostInfo {
	name?: string;
	extensions?: Record<string, boolean>;
	oscIp?: string;
	oscPort?: number;
	oscTransport?: "TCP" | "UDP";
	wsIp?: string;
	wsPort?: number;
}