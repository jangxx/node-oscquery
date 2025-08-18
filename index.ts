import {
	OSCQueryServer,
	OSCQueryServerOptions,
} from "./lib/osc_query_server";

import {
	OSCType,
	OSCTypeSimple,
	OSCQRange,
	OSCQClipmode,
	OSCQAccess,
	HostInfo,
} from "./lib/osc_types";

import {
	OSCQueryDiscovery,
	DiscoveredService,
} from "./lib/osc_query_discovery";

import {
	OSCMethodDescription,
	OSCMethodArgument,
} from "./lib/osc_method_description";

export {
	OSCQueryServer,
	OSCQueryServerOptions as OSCQueryServiceOptions,
	OSCMethodDescription,
	OSCMethodArgument,
	OSCQRange,
	OSCQClipmode,
	OSCType,
	OSCTypeSimple,
	OSCQAccess,
	HostInfo,
	OSCQueryDiscovery,
	DiscoveredService,
};