import {
	OSCQueryDiscovery,
	DiscoveredService,
} from "../index";

const discovery = new OSCQueryDiscovery();

discovery.on("up", (service: DiscoveredService) => {
	console.log(`discovered service running on ${service.address}:${service.port}`);
	console.log("host info:", service.hostInfo);
	console.log("methods:", service.flat());
});

discovery.start();