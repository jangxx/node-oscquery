import { OSCQRange, OSCQClipmode, OSCType, OSCQAccess } from "./osc_types";

export interface OSCMethodDescription {
	full_path?: string, // only used in the for the discovery
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
	value?: unknown,
}