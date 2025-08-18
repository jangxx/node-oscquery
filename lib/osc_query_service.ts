import { OSCNode } from "./osc_node";
import { OSCQAccess } from "./osc_types";
import { OSCMethodDescription } from "./osc_method_description";

export interface QSCQueryServiceOptions {
	rootDescription?: string;
}

export class OSCQueryService {
	protected _root: OSCNode = new OSCNode("");

	constructor(opts?: QSCQueryServiceOptions) {
		this._root.setOpts({
			description: opts?.rootDescription || "root node",
			access: OSCQAccess.NO_VALUE,
		});
	}

	getNodeForPath(path: string): OSCNode | null {
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

	addMethod(path: string, params: OSCMethodDescription) {
		const path_split = path.split("/").filter(p => p !== "");

		let node = this._root;

		for (const path_component of path_split) {
			node = node.getOrCreateChild(path_component);
		}

		node.setOpts(params);
	}

	removeMethod(path: string) {
		let node = this.getNodeForPath(path);

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
		const node = this.getNodeForPath(path);

		if (node) {
			node.setValue(arg_index, value);
		}
	}

	unsetValue(path: string, arg_index: number) {
		const node = this.getNodeForPath(path);

		if (node) {
			node.unsetValue(arg_index);
		}
	}
}