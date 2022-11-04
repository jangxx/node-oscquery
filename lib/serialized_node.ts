import { OSCQClipmode } from "./osc_types"

type SerializedRangeSingle = {
	MIN?: number,
	MAX?: number,
	VALS?: unknown[],
};
export type SerializedRange = SerializedRangeSingle | null | SerializedRange[];

export type SerializedNode = {
	FULL_PATH: string,
	CONTENTS?: Record<string, SerializedNode>,
	TYPE?: string,
	ACCESS?: number,
	RANGE?: (SerializedRange | null)[],
	DESCRIPTION?: string,
	TAGS?: string[],
	CRITICAL?: boolean,
	CLIPMODE?: (OSCQClipmode | null)[],
	VALUE?: (unknown | null)[],
}

export type SerializedHostInfo = {
	NAME?: string;
	EXTENSIONS ?: Record<string, boolean>;
	OSC_IP?: string;
	OSC_PORT?: number;
	OSC_TRANSPORT?: "TCP" | "UDP";
	WS_IP?: string;
	WS_PORT?: number;
};