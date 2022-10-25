import http from "node:http";
import bonjour from "bonjour";

import { OSCNode, OSCEndpointDescription, SerializedNode } from "./osc_node"; 
import { OSCQAccess } from "./osc_access";

export interface OSCQueryServiceOptions {
	httpPort: number;
	bindAddress?: string;
	mdnsOptions?: bonjour.BonjourOptions;
	rootDescription?: string,
	oscQueryHostName?: string,
	oscIp?: string,
	oscPort?: number,
	oscTransport?: "TCP" | "UDP",
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

export class OSCQueryService {
	private _bonjour: bonjour.Bonjour | null;
	private _server: http.Server;
	private _opts: OSCQueryServiceOptions;
	private _root: OSCNode = new OSCNode("");

	constructor(opts: OSCQueryServiceOptions) {
		this._opts = opts;

		this._server = http.createServer(this._httpHandler.bind(this));
		this._bonjour = null;

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
			return respondJson({
				NAME: this._opts.oscQueryHostName,
				EXTENSIONS,
				OSC_IP: this._opts.oscIp,
				OSC_PORT: this._opts.oscPort,
				OSC_TRANSPORT: this._opts.oscTransport,
				// WS_IP: this._opts.wsIp,
				// WS_PORT: this._opts.wsPort,
			}, res);
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
			return respondJson({
				[query]: serialized[query as keyof SerializedNode],
			}, res);
		}
	}

	start(): Promise<null> {
		this._bonjour = bonjour(this._opts.mdnsOptions);

		this._bonjour.publish({
			type: "_oscjson._tcp.",
			name: "OSCQuery",
			port: this._opts.httpPort,
		});

		return new Promise(resolve => {
			this._server.listen(this._opts.httpPort, this._opts.bindAddress || "0.0.0.0", () => resolve(null));
		});
	}

	stop(): Promise<null> {
		if (this._bonjour) {
			this._bonjour.destroy();
			this._bonjour = null;
		}

		return new Promise((resolve, reject) => {
			this._server.close(err => err ? reject(err) : resolve(null));
		});
	}

	addEndpoint(path: string, params: OSCEndpointDescription) {
		const path_split = path.split("/").filter(p => p !== "");

		let node = this._root;

		for (const path_component of path_split) {
			node = node.getOrCreateChild(path_component);
		}

		node.setOpts(params);
	}

	removeEndpoint(path: string) {
		const path_split = path.split("/").filter(p => p !== "");

		let node = this._root;

		for (const path_component of path_split) {
			if (node.hasChild(path_component)) {
				node = node.getChild(path_component);
			} else {
				return; // this endpoint doesn't exist
			}
		}

		node.setOpts({}); // make the node into an empty container

		// go back through the nodes in reverse and delete nodes until we have either reached the root or
		// hit a non-empty one
		while (node.parent != null && node.isEmpty()) {
			node.parent.removeChild(node.name);
			node = node.parent;
		}
	}
}