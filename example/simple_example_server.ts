import {
	OSCQueryServer,
	OSCType,
	OSCQAccess,
} from "../index";

// this example is almost an exact copy of the example on https://github.com/Vidvox/OSCQueryProposal#oscquery-examples

const service = new OSCQueryServer();

service.addMethod("/foo", {
	description: "demonstrates a read-only OSC node- single float value ranged 0-100",
	access: OSCQAccess.READONLY,
	arguments: [
		{ 
			type: OSCType.FLOAT,
			range: { min: 0, max: 100},
		}
	]
});
service.setValue("/foo", 0, 0.5);

service.addMethod("/bar", {
	description: "demonstrates a read/write OSC node- two ints with different ranges",
	access: OSCQAccess.READWRITE,
	arguments: [
		{
			type: OSCType.INT,
			range: { min: 0, max: 50 },
		},
		{
			type: OSCType.INT,
			range: { min: 51, max: 100 },
		}
	]
});
service.setValue("/bar", 0, 4);
service.setValue("/bar", 1, 51);

service.addMethod("/baz", {
	description: "simple container node, with one method- qux",
});

service.addMethod("/baz/qux", {
	description: "read/write OSC node- accepts one of several string-type inputs",
	access: OSCQAccess.RW,
	arguments: [
		{
			type: OSCType.STRING,
			range: { vals: [ "empty", "half-full", "full" ] }
		}
	]
});
service.setValue("/baz/qux", 0, "half-full");

// complex example with array types:

// service.addEndpoint("/test", {
// 	description: "array test",
// 	access: OSCQAccess.READONLY,
// 	arguments: [
// 		{ type: OSCType.STRING },
// 		{
// 			type: [ OSCType.INT, OSCType.FALSE ],
// 			range: [ { min: -100}, null ],
// 		}
// 	]
// });
// service.setValue("/test", 0, "asd");
// service.setValue("/test", 1, [ 1, false ]);

service.start();