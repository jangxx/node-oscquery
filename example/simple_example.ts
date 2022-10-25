import {
	OSCQueryService,
	OSCType,
	OSCQAccess,
} from "../index";

// this example is almost an exact copy of the example on https://github.com/Vidvox/OSCQueryProposal#oscquery-examples

const service = new OSCQueryService({
	oscPort: 9001,
	httpPort: 9001,
});

service.addEndpoint("/foo", {
	description: "demonstrates a read-only OSC node- single float value ranged 0-100",
	access: OSCQAccess.READONLY,
	arguments: [
		{ 
			type: OSCType.FLOAT,
			range: { min: 0, max: 100},
		}
	]
});

service.addEndpoint("/bar", {
	description: "demonstrates a read/write OSC node- two ints with different ranges",
	access: OSCQAccess.READWRITE,
	arguments: [
		{
			type: OSCType.INT,
			range: { min: 0, max: 50 },
			value: 4, // <-- this field is entirely optional. An example value will be generated automatically if it's not given
		},
		{
			type: OSCType.INT,
			range: { min: 51, max: 100 },
		}
	]
});

service.addEndpoint("/baz", {
	description: "simple container node, with one method- qux",
});

service.addEndpoint("/baz/qux", {
	description: "read/write OSC node- accepts one of several string-type inputs",
	access: OSCQAccess.RW,
	arguments: [
		{
			type: OSCType.STRING,
			range: { vals: [ "empty", "half-full", "full" ] }
		}
	]
});

service.start();