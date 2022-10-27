import { OSCQClipmode } from "./osc_types"

export type SerializedNode = {
	FULL_PATH: string,
	CONTENTS?: Record<string, SerializedNode>,
	TYPE?: string,
	ACCESS?: number,
	RANGE?: {
		MIN?: number,
		MAX?: number,
		VALS?: unknown[],
	}[],
	DESCRIPTION?: string,
	TAGS?: string[],
	CRITICAL?: boolean,
	CLIPMODE?: OSCQClipmode[],
	VALUE?: unknown[],
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