import { OSCTypeSimple, OSCType, OSCQClipmode, OSCQRange, OSCQAccess } from "./osc_types";
import { SerializedNode, SerializedRange } from "./serialized_node";
import { OSCMethodArgument, OSCMethodDescription } from "./osc_method_description";

function getTypeString(type: OSCType): string {
	if (Array.isArray(type)) {
		return "[" + type.map(getTypeString).join("") + "]";
	} else {
		return type;
	}
}

function serializeRange(range: OSCQRange): SerializedRange {
	if (Array.isArray(range)) {
		return range.map(r => serializeRange(r));
	} else {
		if (range !== null) {
			return {
				MAX: range.max,
				MIN: range.min,
				VALS: range.vals,
			};
		} else {
			return null;
		}
	}
}

function assembleFullPath(node: OSCNode): string {
	if (node.parent == null) {
		return "";
	} else {
		return assembleFullPath(node.parent) + "/" + node.name;
	}
}

function allNull(arr: unknown[]): boolean {
	for (const elem of arr) {
		if (elem !== null) return false;
	}
	return true;
}

export class OSCNode {
	private _parent?: OSCNode;
	private _name: string;
	private _description?: string;
	private _access?: OSCQAccess;
	private _tags?: string[];
	private _critical?: boolean;
	private _args?: OSCMethodArgument[];
	private _children: Record<string, OSCNode> = {};

	constructor(name: string, parent?: OSCNode) {
		this._name = name;
		this._parent = parent;
	}

	// null -> is root
	get parent(): OSCNode | null {
		if (this._parent) {
			return this._parent;
		} else {
			return null;
		}
	}

	get name(): string {
		return this._name;
	}

	_getMethodDescription(full_path: string): OSCMethodDescription {
		const desc: OSCMethodDescription = {
			full_path,
		};
		if (this._description) desc.description = this._description;
		if (this._access) desc.access = this._access;
		if (this._tags) desc.tags = this._tags;
		if (this._critical) desc.critical = this._critical;
		if (this._args) desc.arguments = this._args;

		return desc;
	}

	*_methodGenerator(starting_path: string = "/"): Generator<OSCMethodDescription> {
		if (!this.isContainer()) {
			yield this._getMethodDescription(starting_path);
		}

		// if we are not at the root level, add a / to separate the path from the child names
		if (starting_path !== "/") {
			starting_path += "/";
		}

		if (this._children) {
			for (const child of Object.values(this._children)) {
				for (const md of child._methodGenerator(starting_path + child.name)) {
					yield md;
				}
			}
		}
	}

	setOpts(desc: OSCMethodDescription) {
		this._description = desc.description;
		this._access = desc.access;
		this._tags = desc.tags;
		this._critical = desc.critical;
		this._args = desc.arguments;
	}

	setValue(arg_index: number, value: unknown) {
		if (!this._args || arg_index >= this._args.length) {
			throw new Error("Argument index out of range")
		}

		this._args[arg_index].value = value;
	}

	unsetValue(arg_index: number, value: unknown) {
		if (!this._args || arg_index >= this._args.length) {
			throw new Error("Argument index out of range")
		}

		delete this._args[arg_index].value;
	}

	isEmpty() { // if there are no arguments and no children, the node is empty
		return !this._args && Object.keys(this._children).length == 0;
	}

	isContainer() {
		return !this._args && Object.keys(this._children).length > 0;
	}

	addChild(path: string, node: OSCNode) {
		if (path in this._children) {
			throw new Error(`The child ${path} already exist`);
		}

		this._children[path] = node;
	}

	hasChild(path: string) {
		return path in this._children;
	} 

	getChild(path: string) {
		return this._children[path];
	}

	getChildren() {
		return Object.values(this._children);
	}

	removeChild(path: string) {
		if (this.hasChild(path)) {
			delete this._children[path];
		}
	}

	getOrCreateChild(path: string) {
		if (!this.hasChild(path)) {
			this._children[path] = new OSCNode(path, this);	
		}

		return this._children[path];
	}

	serialize(full_path: string | null = null): SerializedNode {
		full_path = assembleFullPath(this);

		const result: SerializedNode = {
			FULL_PATH: full_path || "/",
		};

		if (this._description) result.DESCRIPTION = this._description;
		if (this._access) {
			result.ACCESS = this._access;
		} else if (this.isContainer()) {
			result.ACCESS = OSCQAccess.NO_VALUE;
		}
		if (this._tags) result.TAGS = this._tags;
		if (this._critical) result.CRITICAL = this._critical;

		if (Object.keys(this._children).length > 0) {
			result.CONTENTS = Object.fromEntries(Object.entries(this._children).map(([name, node]) => {
				return [ name, node.serialize(full_path + "/" + name) ]
			}));
		}

		if (this._args) {
			let arg_types: string = "";
			// these are set to null in case one of the args doesn't specify them
			let arg_ranges: (OSCQRange | null)[] = [];
			let arg_clipmodes: (OSCQClipmode | null)[] | null = [];
			const arg_values: unknown[] = [];

			for (const arg of this._args) {
				arg_types += getTypeString(arg.type);
				arg_values.push(arg.value || null);
				arg_ranges.push(arg.range || null);
				arg_clipmodes.push(arg.clipmode || null);
			}

			result.TYPE = arg_types;

			if (!allNull(arg_ranges)) {
				result.RANGE = arg_ranges.map(range => {
					if (range) {
						return serializeRange(range);
					} else {
						return null;
					}
				});
			}

			if (!allNull(arg_clipmodes)) {
				result.CLIPMODE = arg_clipmodes;
			}

			if (this._access && !allNull(arg_values) && (this._access == 1 || this._access == 3)) {
				result.VALUE = arg_values;
			}
		}

		return result;
	}
}