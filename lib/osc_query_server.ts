import http from "node:http";
import { getResponder, type Responder, type CiaoService, Protocol } from "@homebridge/ciao";
import portfinder from "portfinder";

import { OSCNode } from "./osc_node"; 
import { SerializedHostInfo, SerializedNode } from "./serialized_node";
import { OSCQAccess } from "./osc_types";
import { OSCMethodDescription } from "./osc_method_description";

export interface OSCQueryServiceOptions {
	httpPort?: number;
	bindAddress?: string;
	rootDescription?: string,
	oscQueryHostName?: string,
	oscIp?: string,
	oscPort?: number,
	oscTransport?: "TCP" | "UDP",
	serviceName?: string,
	// wsIp?: string,
	// wsPort?: string,
}

const EXTENSIONS = {
	ACCESS: true,
	VALUE: true,
	RANGE: true,
	DESCRIPTION: true,
	TAGS: true,
	// EXTENDED_TYPE 
	// UNIT
	CRITICAL: true,
	CLIPMODE: true,
	// OVERLOADS
	// HTML
}

const VALID_ATTRIBUTES = [
	"FULL_PATH",
	"CONTENTS",
	"TYPE",
	"ACCESS",
	"RANGE",
	"DESCRIPTION",
	"TAGS",
	"CRITICAL",
	"CLIPMODE",
	"VALUE",
	"HOST_INFO",
]

function respondJson(json: Object, res: http.ServerResponse) {
	res.setHeader("Content-Type", "application/json");
	res.write(JSON.stringify(json));
	res.end();
}

export class OSCQueryServer {
	private _mdns: Responder;
	private _mdnsService: CiaoService | null = null;
	private _server: http.Server;
	private _opts: OSCQueryServiceOptions;
	private _root: OSCNode = new OSCNode("");

	constructor(opts?: OSCQueryServiceOptions) {
		this._opts = opts || {};

		this._server = http.createServer(this._httpHandler.bind(this));

		this._mdns = getResponder();

		this._root.setOpts({
			description: this._opts.rootDescription || "root node",
			access: OSCQAccess.NO_VALUE,
		});
	}

	_httpHandler(req: http.IncomingMessage, res: http.ServerResponse) {
		if (req.method != "GET") {
			res.statusCode = 400;
			res.end();
		}

		const url = new URL(req.url!, `http://${req.headers.host}`);
		return this._handleGet(url, res);
	}

	_handleGet(url: URL, res: http.ServerResponse) {
		const query = (url.search.length > 0) ? url.search.substring(1) : null;
		const path_split = url.pathname.split("/").filter(p => p !== "");

		if (query && !VALID_ATTRIBUTES.includes(query)) {
			res.statusCode = 400;
			return res.end();
		}

		if (query == "HOST_INFO") {
			const hostInfo: SerializedHostInfo = {
				NAME: this._opts.oscQueryHostName,
				EXTENSIONS,
				OSC_IP: this._opts.oscIp || this._opts.bindAddress || "0.0.0.0", // the proposal says that an undefined OSC_IP means that the http host should be used, but I think it's okay to be nice about it
				OSC_PORT: this._opts.oscPort || this._opts.httpPort, // the proposal says that an undefined OSC_PORT means that the http port should be used, but I think it's okay to be nice about it
				OSC_TRANSPORT: this._opts.oscTransport || "UDP", // per the proposal the default for an undefined values is "UDP", but there is nothing wrong with setting it either way
				// WS_IP: this._opts.wsIp,
				// WS_PORT: this._opts.wsPort,
			};

			return respondJson(hostInfo, res);
		}

		let node = this._root;

		for (const path_component of path_split) {
			if (node.hasChild(path_component)) {
				node = node.getChild(path_component);
			} else {
				res.statusCode = 404;
				return res.end();
			}
		}

		if (!query) {
			return respondJson(node.serialize(), res);
		} else {
			const serialized = node.serialize();

			const access = serialized.ACCESS;
			if (access !== undefined) {
				if ((access == 0 || access == 2) && query == "VALUE") {
					res.statusCode = 204;
					return res.end();
				}
			}

			return respondJson({
				[query]: serialized[query as keyof SerializedNode],
			}, res);
		}
	}

	_getNodeForPath(path: string): OSCNode | null {
		const path_split = path.split("/").filter(p => p !== "");

		let node = this._root;

		for (const path_component of path_split) {
			if (node.hasChild(path_component)) {
				node = node.getChild(path_component);
			} else {
				return null; // this endpoint doesn't exist
			}
		}

		return node;
	}

	async start(): Promise<void> {
		if (!this._opts.httpPort) {
			this._opts.httpPort = await portfinder.getPortPromise();
		}

		const httpListenPromise: Promise<void> = new Promise(resolve => {
			this._server.listen(this._opts.httpPort, this._opts.bindAddress || "0.0.0.0", resolve);
		});

		this._mdnsService = this._mdns.createService({
			name: this._opts.serviceName || "OSCQuery",
			type: "oscjson",
			port: this._opts.httpPort,
			protocol: Protocol.TCP,
		});

		await Promise.all([
			httpListenPromise,
			this._mdnsService.advertise(),
		]);
	}

	async stop(): Promise<void> {
		const httpEndPromise: Promise<void> = new Promise((resolve, reject) => {
			this._server.close(err => err ? reject(err) : resolve());
		});

		await Promise.all([
			httpEndPromise,
			this._mdnsService ? this._mdnsService.end() : Promise.resolve(),
		]);
	}

	addEndpoint(path: string, params: OSCMethodDescription) {
		const path_split = path.split("/").filter(p => p !== "");

		let node = this._root;

		for (const path_component of path_split) {
			node = node.getOrCreateChild(path_component);
		}

		node.setOpts(params);
	}

	removeEndpoint(path: string) {
		let node = this._getNodeForPath(path);

		if (!node) return;

		node.setOpts({}); // make the node into an empty container

		// go back through the nodes in reverse and delete nodes until we have either reached the root or
		// hit a non-empty one
		while (node.parent != null && node.isEmpty()) {
			node.parent.removeChild(node.name);
			node = node.parent;
		}
	}

	setValue(path: string, arg_index: number, value: unknown) {
		const node = this._getNodeForPath(path);

		if (node) {
			node.setValue(arg_index, value);
		}
	}

	unsetValue(path: string, arg_index: number, value: unknown) {
		const node = this._getNodeForPath(path);

		if (node) {
			node.unsetValue(arg_index, value);
		}
	}
}