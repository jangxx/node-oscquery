import { OSCQRange, OSCQClipmode, OSCType, OSCQAccess } from "./osc_types";

export interface OSCMethodDescription {
	description?: string;
	access?: OSCQAccess,
	tags?: string[],
	critical?: boolean,
	arguments?: OSCMethodArgument[];
}

export interface OSCMethodArgument {
	type: OSCType,
	range?: OSCQRange,
	clipmode?: OSCQClipmode,
	value?: unknown, // example value
};