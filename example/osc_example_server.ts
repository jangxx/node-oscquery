import {
	OSCQueryServer,
	OSCType,
	OSCQAccess,
} from "../index";

import { Server } from "node-osc";

let oscPort = 9000;

if (process.argv.length > 2) {
	oscPort = Number(process.argv[2]);
}

const service = new OSCQueryServer({
	oscPort,
	httpPort: oscPort,
	serviceName: "Fake VRChat Chatbox"
});

service.addMethod("/chatbox/input", {
	description: "Test VRChat chatbox input",
	access: OSCQAccess.WRITEONLY,
	arguments: [
		{ type: OSCType.STRING },
		{ type: OSCType.INT },
	]
});

service.addMethod("/chatbox/typing", {
	description: "Test VRChat typing indicator",
	access: OSCQAccess.WRITEONLY,
	arguments: [
		{ type: OSCType.INT }
	]
});

service.start().then(() => {
	console.log(`OSCQuery server is listening on port ${oscPort}`);
});

const oscServer = new Server(oscPort, "0.0.0.0", () => {
	console.log(`OSC server is listening on port ${oscPort}`);
});

oscServer.on("message", msg => {
	const address = msg[0];
	const data = msg.slice(1);
	console.log(`Address: ${address}, Data: ${data.join(", ")}`);
});