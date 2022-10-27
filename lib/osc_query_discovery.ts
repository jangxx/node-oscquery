import { EventEmitter } from "node:events";
import Bonjour, { type Browser, type Service } from "bonjour-service";
import axios from "axios";
import { SerializedHostInfo, SerializedNode } from "./serialized_node";
import { OSCMethodDescription, OSCMethodArgument } from "./osc_method_description";
import { OSCQAccess, OSCQAccessMap, OSCType, OSCTypeSimpleMap } from "./osc_types";

export interface OSCQueryDiscoveryOptions {
	
}

interface HostInfo {
	name?: string;
	extensions?: Record<string, boolean>;
	oscIp?: string;
	oscPort?: number;
	oscTransport?: "TCP" | "UDP";
	wsIp?: string;
	wsPort?: number;
}

function deserializeHostInfo(host_info: SerializedHostInfo): HostInfo {
	return {
		name: host_info.NAME,
		extensions: host_info.EXTENSIONS,
		oscIp: host_info.OSC_IP,
		oscPort: host_info.OSC_PORT,
		oscTransport: host_info.OSC_TRANSPORT,
		wsIp: host_info.WS_IP,
		wsPort: host_info.WS_PORT,
	};
}

interface OSCMethodNode extends OSCMethodDescription {
	readonly fullPath: string;
	readonly contents?: Record<string, OSCMethodNode>;
}

function parseTypeString(type_string: string): OSCType {
	const tokens: (string | string[])[] = [];
	let current_token = "";
	let brackets_open = 0;
	for (const c of type_string) {
		// console.log(c, current_token, brackets_open);
		if (c == "[" && brackets_open == 0) {
			current_token = "";
			brackets_open = 1;
		} else if (c == "[" && brackets_open > 0) {
			brackets_open += 1;
			current_token += c;
		} else if (c == "]" && brackets_open > 0) {
			brackets_open -= 1;
			if (brackets_open == 0) {
				tokens.push([ current_token ]);
			} else {
				current_token += c;
			}
		} else if (c in OSCTypeSimpleMap) {
			if (brackets_open == 0) {
				tokens.push(c);
			} else {
				current_token += c;
			}
		} // otherwise we ignore the invalid token
	}

	return tokens.map(token => {
		if (Array.isArray(token)) {
			return parseTypeString(token[0]);
		} else {
			return OSCTypeSimpleMap[token];
		}
	});
}

function deserializeMethodNode(node: SerializedNode): OSCMethodNode {
	let contents: Record<string, OSCMethodNode> | undefined = undefined;
	if (node.CONTENTS) {
		contents = {};
		for (const key in node.CONTENTS) {
			contents[key] = deserializeMethodNode(node.CONTENTS[key]);
		}
	}

	let method_arguments: OSCMethodArgument[] | undefined = undefined;
	if (node.TYPE) {
		method_arguments = [];
		const arg_types = parseTypeString(node.TYPE);

		// TODO: the rest of this function
	}

	return {
		fullPath: node.FULL_PATH,
		contents,
		description: node.DESCRIPTION,
		access: node.ACCESS ? OSCQAccessMap[node.ACCESS] : undefined,
		tags: node.TAGS,
		critical: node.CRITICAL,
		arguments: method_arguments,
	}
}

class DiscoveredService {
	constructor(
		readonly address: string,
		readonly port: number,
		readonly hostInfo: HostInfo,
		readonly nodes: OSCMethodNode,
	) {}

	flat() {
		// TODO: turn the nested map into a flat map of only accessible methods
	}
}

export class OSCQueryDiscovery extends EventEmitter {
	private _mdns: Bonjour | null = null;
	private _mdnsBrowser: Browser | null = null;
	private _services: DiscoveredService[] = [];

	constructor(opts: OSCQueryDiscoveryOptions) {
		super();
	}

	_handleUp(service: Service) {
		if (service.protocol != "tcp") {
			return; // OSCQuery always uses TCP
		}

		service.addresses?.map(address => {
			this.queryNewService(address, service.port).catch(err => this.emit(err));
		});
	}

	_handleDown(service: Service) {
		service.addresses?.forEach(address => {
			const existingIndex = this._services.findIndex(s => s.address == address && s.port == service.port);

			if (existingIndex > -1) {
				const removedService = this._services[existingIndex];
				this.emit("down", removedService);
				this._services.splice(existingIndex, 1);
			}
		});
	}

	async queryNewService(address: string, port: number) {
		const baseResp = await axios.get<SerializedNode>("http://" + address + ":" + port);
		const hostInfoResp = await axios.get<SerializedHostInfo>("http://" + address + ":" + port + "?HOST_INFO");

		const service = new DiscoveredService(
			address,
			port,
			deserializeHostInfo(hostInfoResp.data),
			deserializeMethodNode(baseResp.data),
		);

		this._services.push(service);
		this.emit("up", service);
	}

	start() {
		if (this._mdns || this._mdnsBrowser) {
			return;
		}

		this._mdns = new Bonjour(undefined, (err: any) => {
			this.emit("error", err);
		});

		this._mdnsBrowser = this._mdns.find({
			type: "oscjson",
			protocol: "tcp"
		});

		this._mdnsBrowser.on("up", this._handleUp.bind(this));
		this._mdnsBrowser.on("down", this._handleDown.bind(this));
	}

	stop() {
		if (!this._mdns || !this._mdnsBrowser) {
			return;
		}

		this._mdnsBrowser.stop();
		this._mdns.destroy();

		this._mdnsBrowser = null;
		this._mdns = null;
	}

	getServices() {
		return this._services;
	}
}