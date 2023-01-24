# OSCQuery for Node
An implementation of the [OSCQuery proposal](https://github.com/Vidvox/OSCQueryProposal) for Node.js, written in TypeScript.

## Installation

	npm install oscquery

## Simple example

```ts
import {
	OSCQueryServer,
	OSCTypeSimple,
	OSCQAccess,
} from "oscquery";

const service = new OSCQueryServer();

service.addMethod("/foo", {
	description: "demonstrates a read-only OSC node- single float value ranged 0-100",
	access: OSCQAccess.READONLY,
	arguments: [
		{ 
			type: OSCTypeSimple.FLOAT,
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
			type: OSCTypeSimple.INT,
			range: { min: 0, max: 50 },
		},
		{
			type: OSCTypeSimple.INT,
			range: { min: 51, max: 100 },
		}
	]
});
service.setValue("/bar", 0, 4);
service.setValue("/bar", 1, 51);

service.start();
```

More examples can be found in the _examples/_ directory.

## Supported extensions

The proposal outlines several extensions, of which this library implements a few but not all.
Every extension that is implemented should have full compliance with the spec however, including all their optional features.

| Extension | Supported |
| --- | --- |
| ACCESS | ✅ |
| VALUE | ✅ |
| RANGE | ✅ |
| DESCRIPTION | ✅ |
| TAGS | ✅ |
| EXTENDED_TYPE | ❌ |
| UNIT | ❌ |
| CRITICAL | ✅ |
| CLIPMODE | ✅ |
| OVERLOADS | ❌ |
| HTML | ❌ |
| Bi-Directional Communication | ❌ |

# Classes & Methods

## `OSCQueryServer`

**constructor**(opts?)  
Creates a new instance of the server. The options object has the following fields (all optional):
- `httpPort`: Port that the HTTP server should bind itself to. If it is not specified, a random free port will be chosen.
- `bindAddress`: Address to bind the server to. If it is not specified, the server will bind itself to all interfaces.
- `rootDescription`: DESCRIPTION attribute of the root node.
- `oscQueryHostName`: NAME field of the HOST_INFO attribute
- `oscIp`: OSC_IP field of the HOST_INFO attribute. If not specified, the `bindAddress` is used instead.
- `oscPort`: OSC_PORT field of the HOST_INFO attribute. If not specified, the `httpPort` is used instead.
- `oscTransport`: OSC_TRANSPORT of the HOST_INFO attribute. (Default: "UDP")
- `serviceName`: Name of the mDNS service. (Default: "OSCQuery")

**start**(): `Promise<HostInfo>`  
Starts the HTTP server and mDNS service to advertise its existence on the network.
Resolves to the host info it will use for the HOST_INFO attribute.
This can be used to find the port it landed on, in case the `httpPort` option was not set in the constructor.

**stop**(): `Promise<void>`  
Stops the HTTP server and mDNS service.

**addMethod**(path: `string`, params: `OSCMethodDescription`)  
Adds a new OSC method accessible under the given path.
The method description object is documented below.

**removeMethod**(path: `string`)  
Removes an OSC method accessible under the given path.
This will remove all empty nodes in the respective branch as well.
Example: If a service as two methods `/foo/` and `/bar/baz` and you remove `/bar/baz`, the `/bar` node will also be removed since it would otherwise be an empty container.

**setValue**(path: `string`, arg_index: `number`, value: `unknown`)  
Sets the VALUE attribute for the method of the given path and the argument with the given index.

**unsetValue**(path: `string`, arg_index: `number`)  
Removes the VALUE attribute for the method of the given path and the argument with the given index.
This is different from setting it to `null`, since some methods actually take a null type as their argument.
Unsetting it will completely remove the VALUE attribute in case all arguments are unset.

## `OSCQueryDiscovery`

**start**()  
Start the mDNS browser to find OSCQuery services on the network.
If the browser finds one, an `up` event will be emitted, and if a service announces it is shutting down, a `down` event will be emitted (both documented below).

**stop**()  
Stops the mDNS browser, preventing new services from being discovered.

**getServices**(): `DiscoveredService[]`  
Returns a list of all currently discovered services.

**queryNewService**(address: `string`, port: `number`): `Promise<DiscoveredService>`  
This method is normally called internally by the mDNS browser every time a new service is discovered.
If you already know the address and port of a service however, this method can be used to query it manually.

### Events

**up**  
Emitted every time a new service is discovered and queried.
The handler is called with a single `DiscoveredService` argument.

**down**  
Emitted every time a service announces its departure.
The handler is called with a single `DiscoveredService` argument.

## `OSCMethodDescription`

The fields in this object correspond almost 1:1 to the attributes in the OSCQuery nodes.
The main difference are the arguments, which are essentially a wrapper around attributes such as TYPE, VALUE, etc.
Instead of defining them all as arrays, each argument is its own object with all the relevant metadata directly attached to it.

```ts
interface OSCMethodDescription {
	full_path?: string, // only used in the for the discovery
	description?: string;
	access?: OSCQAccess,
	tags?: string[],
	critical?: boolean,
	arguments?: OSCMethodArgument[];
}
```

### `OSCMethodArgument`

```ts
interface OSCMethodArgument {
	type: OSCType,
	range?: OSCQRange,
	clipmode?: OSCQClipmode,
	value?: unknown,
}
```

## `DiscoveredService`

_readonly_ **address**: `string`  
The network address of this service.

_readonly_ **port**: `number`  
The port this service announced.

_get_ **hostInfo**: `HostInfo`  
A parsed version of the HOST_INFO attribute.

_get_ **nodes**: `OSCNode`  
The root node of a tree representation of the OSCQuery nodes.
Calling `.serialize()` on the nodes will return a JSON object representing the node itself and all children.

**flat**(): `OSCMethodDescription[]`  
Create a flat list of all methods this service has to offer.
Using this method is recommended instead of traversing the node tree manually.

**update**(): `Promise<void>`  
Refreshes the HOST_INFO and nodes by calling the respective HTTP endpoints again.

**resolvePath**(path: `string`): `OSCNode | null`  
Resolves a path from the node tree or returns `null` if the path does not exist.

## `OSCNode`

Most of the methods on this class are not designed to be called from the outside, so this documentation is only going to document the most common properties and methods.

_readonly_ **name**: `string`  
The name (i.e. path component) of the node.

**getValue**(arg_index: `number`): `unknown`  
Retrieves the VALUE with the specified index, or `null` if it is not set.

**serialize**(): `SerializedNode`  
Serializes the node (and all children) into a simple object which matches the http response to a query without a specific attribute in the query part of the URL.