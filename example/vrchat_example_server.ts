/**
 * This server will receive and display all avatar related OSC from VRChat.
 */

import {
	OSCQueryServer,
	OSCTypeSimple,
	OSCQAccess,
} from "../index";

import { Server } from "node-osc";

let oscPort = 11337;

if (process.argv.length > 2) {
	oscPort = Number(process.argv[2]);
}

const oscqServer = new OSCQueryServer({
	oscPort,
	httpPort: oscPort,
	serviceName: "VRC-Example-Receiver",
	httpFilter: (req) => {
		console.log(req.socket.remoteAddress, req.socket.remotePort, req.method, req.url, req.headers);

		return true;
	}
});

oscqServer.addMethod("/avatar/change", {
	access: OSCQAccess.WRITEONLY,
	arguments: [
		{ type: OSCTypeSimple.STRING },
	]
});

oscqServer.start().then(() => {
	console.log(`OSCQuery server is listening on port ${oscPort}`);
});

const oscServer = new Server(oscPort, "0.0.0.0", () => {
	console.log(`OSC server is listening on port ${oscPort}`);
});

oscServer.on("message", (msg, ...args) => {
	const address = msg[0];
	// const data = msg.slice(1);
	// console.log(`Address: ${address}, Data: ${data.join(", ")}`);
	console.log(address, (args as any)[0]);
});