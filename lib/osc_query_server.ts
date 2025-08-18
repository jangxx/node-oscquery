import http from "node:http";
import { getResponder, type Responder, type CiaoService, Protocol } from "@homebridge/ciao";
import portfinder from "portfinder";

import { OSCNode } from "./osc_node"; 
import { SerializedHostInfo, SerializedNode } from "./serialized_node";
import { HostInfo, OSCQAccess } from "./osc_types";
import { OSCMethodDescription } from "./osc_method_description";
import { OSCQueryService } from "./osc_query_service";

export interface OSCQueryServerOptions {
	httpPort?: number;
	bindAddress?: string;
	rootDescription?: string,
	oscQueryHostName?: string,
	oscIp?: string,
	oscPort?: number,
	oscTransport?: "TCP" | "UDP",
	serviceName?: string,
	httpFilter?: HttpFilterFunction,
	// wsIp?: string,
	// wsPort?: string,
}

export type HttpFilterFunction = (req: http.IncomingMessage) => Promise<boolean> | boolean | Promise<OSCQueryService> | OSCQueryService;

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

export class OSCQueryServer extends OSCQueryService {
	private _mdns: Responder;
	private _mdnsService: CiaoService | null = null;
	private _server: http.Server;
	private _opts: OSCQueryServerOptions;
	private _httpFilter: HttpFilterFunction;

	constructor(opts?: OSCQueryServerOptions) {
		super({
			rootDescription: opts?.rootDescription,
		});

		this._opts = opts || {};

		this._server = http.createServer(this._httpHandler.bind(this));

		this._mdns = getResponder();

		this._httpFilter = opts?.httpFilter || (() => true);
	}

	private _httpHandler(req: http.IncomingMessage, res: http.ServerResponse) {
		if (req.method != "GET") {
			res.statusCode = 400;
			res.end();
		}

		return this._handleGet(req, res);
	}

	private async _handleGet(req: http.IncomingMessage, res: http.ServerResponse) {
		const url = new URL(req.url!, `http://${req.headers.host}`);

		const query = (url.search.length > 0) ? url.search.substring(1) : null;

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

		const httpFilterResult = await this._httpFilter(req);
		let node: OSCNode | null = null;

		if (typeof httpFilterResult === "boolean") {
			if (!httpFilterResult) {
				res.statusCode = 404;
				return res.end();
			} else {
				node = this.getNodeForPath(url.pathname);
			}
		} else if (httpFilterResult instanceof OSCQueryService) {
			node = httpFilterResult.getNodeForPath(url.pathname);
		}

		if (node === null) {
			res.statusCode = 404;
			return res.end();
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

	async start(): Promise<HostInfo> {
		if (!this._opts.httpPort) {
			this._opts.httpPort = await portfinder.getPortPromise();
		}

		const httpListenPromise: Promise<void> = new Promise(resolve => {
			this._server.listen(this._opts.httpPort, this._opts.bindAddress || "0.0.0.0", resolve);
		});

		const serviceName = (this._opts.serviceName ?? "OSCQuery").trim();

		this._mdnsService = this._mdns.createService({
			name: serviceName,
			type: "oscjson",
			port: this._opts.httpPort,
			protocol: Protocol.TCP,
			hostname: `${serviceName.replace(/ /g, "-")}._oscjson._tcp`,
		});

		await Promise.all([
			httpListenPromise,
			this._mdnsService.advertise(),
		]);

		return {
			name: this._opts.oscQueryHostName,
			extensions: EXTENSIONS,
			oscIp: this._opts.oscIp || this._opts.bindAddress || "0.0.0.0",
			oscPort: this._opts.oscPort || this._opts.httpPort,
			oscTransport: this._opts.oscTransport || "UDP",
		};
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
}