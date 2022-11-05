import {
	OSCQueryServer,
	OSCQueryServiceOptions,
} from "./lib/osc_query_server";

import {
	OSCTypeSimple,
	OSCQRange,
	OSCQClipmode,
	OSCQAccess
} from "./lib/osc_types";

import {
	OSCQueryDiscovery,
	// OSCQueryDiscoveryOptions,
	DiscoveredService,
} from "./lib/osc_query_discovery";

import {
	OSCMethodDescription,
	OSCMethodArgument,
} from "./lib/osc_method_description";

export {
	OSCQueryServer,
	OSCQueryServiceOptions,
	OSCMethodDescription,
	OSCMethodArgument,
	OSCQRange,
	OSCQClipmode,
	OSCTypeSimple as OSCType,
	OSCQAccess,
	OSCQueryDiscovery,
	DiscoveredService,
};